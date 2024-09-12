import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

const Chat = () => {
  // STOMP 클라이언트 상태
  const [stompClient, setStompClient] = useState(null);
  // 사용자 이름 상태
  const [username, setUsername] = useState('');
  // 채팅 메시지 상태
  const [messages, setMessages] = useState([]);
  // 현재 사용자 수 상태 (추가된 상태)
  const [userCount, setUserCount] = useState(0);
  
  // 메시지 입력 요소에 대한 참조
  const messageInputRef = useRef(null);
  // 메시지 끝 부분 스크롤을 위한 참조
  const messagesEndRef = useRef(null);

  // 사용자 이름 입력 프롬프트가 표시되었는지 확인하는 참조
  const hasPromptedForUsername = useRef(false);

  // 컴포넌트 마운트 시 사용자 이름 프롬프트 표시
  useEffect(() => {
    if (!hasPromptedForUsername.current) {
      hasPromptedForUsername.current = true;
      const name = prompt("채팅에 참여할 닉네임을 알려주세요:");
      if (name) {
        setUsername(name);
      } else {
        alert("닉네임을 반드시 설정해야 합니다!");
      }
    }
  }, []);

  // 사용자 이름이 설정되면 웹소켓 연결 및 STOMP 설정
  useEffect(() => {
    if (username) {
      // SockJS와 STOMP 클라이언트 초기화
      const socket = new SockJS('/api/chat');
      const stompClient = Stomp.over(socket);

      // STOMP 서버와 연결
      stompClient.connect({}, (frame) => {
        console.log('Connected: ' + frame);

        // 채팅 메시지 수신을 위한 구독
        stompClient.subscribe('/sub/chat', (messageOutput) => {
          const messageData = JSON.parse(messageOutput.body);
          setMessages(prevMessages => [
            ...prevMessages,
            { sender: messageData.sender, content: messageData.content, timestamp: new Date().toLocaleTimeString() }
          ]);
        });

        // 사용자 수 변경을 위한 구독
        stompClient.subscribe('/sub/userCount', (userCountOutput) => {
          setUserCount(parseInt(userCountOutput.body, 10));
        });

        // 사용자 입장 메시지 전송
        const joinMessage = { sender: username, content: '' };
        stompClient.send('/pub/join', {}, JSON.stringify(joinMessage));

        // 브라우저 탭 닫기나 새로고침 시 사용자 퇴장 메시지 전송
        const handleBeforeUnload = () => {
          stompClient.send('/pub/leave', {}, JSON.stringify({ sender: username, content: '님이 채팅방에서 나가셨습니다.' }));
        };

        // 이벤트 리스너 등록
        window.addEventListener('beforeunload', handleBeforeUnload);

        // 컴포넌트 언마운트 시 정리 작업
        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          stompClient.send('/pub/leave', {}, JSON.stringify({ sender: username, content: '님이 채팅방에서 나가셨습니다.' }));
          stompClient.disconnect();
        };
      });

      // STOMP 클라이언트 상태 설정
      setStompClient(stompClient);
    }
  }, [username]);

  // 메시지 전송 함수
  const sendMessage = () => {
    if (messageInputRef.current && stompClient) {
      const message = { sender: username, content: messageInputRef.current.value };
      stompClient.send('/pub/chat', {}, JSON.stringify(message));
      messageInputRef.current.value = '';
    }
  };

  // Enter 키 입력 시 메시지 전송
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendMessage();
    }
  };

  // 메시지 목록이 업데이트될 때 스크롤을 맨 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div id="chat-container">
      <div id="username-display">
        {username ? `${username}님` : '닉네임을 입력하세요'}
      </div>
      <div id="user-count">
        현재 사용자 수: {userCount} {/* 사용자 수 표시 */}
      </div>
      <div id="messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender === username ? 'sent' : 'received'}`}
          >
            <div className="message-sender"><b>{msg.sender}</b></div>
            <div className="message-body">{msg.content}</div>
            <div className="timestamp">{msg.timestamp}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div id="input-container">
        <input
          id="message"
          type="text"
          ref={messageInputRef}
          maxLength={200}
          onKeyPress={handleKeyPress}
          placeholder='최대 200자까지'
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
};

export default Chat;