import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

const Chat = () => {
  const [stompClient, setStompClient] = useState(null);
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const messageInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 최초 실행에서만 닉네임을 물어봄
  const hasPromptedForUsername = useRef(false);

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

  useEffect(() => {
    if (username) {
      const socket = new SockJS('https://3.36.109.146:8080/chat');
      const stompClient = Stomp.over(socket);

      stompClient.connect({}, (frame) => {
        console.log('Connected: ' + frame);

        // STOMP 구독
        stompClient.subscribe('/sub/chat', (messageOutput) => {
          const messageData = JSON.parse(messageOutput.body);
          setMessages(prevMessages => [
            ...prevMessages,
            { sender: messageData.sender, content: messageData.content, timestamp: new Date().toLocaleTimeString() }
          ]);
        });

        // 사용자 입장 메시지 전송
        const joinMessage = { sender: username, content: '' };
        stompClient.send('/pub/join', {}, JSON.stringify(joinMessage));

        // Cleanup function to handle disconnection
        const handleBeforeUnload = () => {
          stompClient.send('/pub/leave', {}, JSON.stringify({ sender: username, content: '님이 채팅방에서 나가셨습니다.' }));
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup function
        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          stompClient.send('/pub/leave', {}, JSON.stringify({ sender: username, content: '님이 채팅방에서 나가셨습니다.' }));
          stompClient.disconnect();
        };
      });

      setStompClient(stompClient);
    }
  }, [username]);

  const sendMessage = () => {
    if (messageInputRef.current && stompClient) {
      const message = { sender: username, content: messageInputRef.current.value };
      stompClient.send('/pub/chat', {}, JSON.stringify(message));
      messageInputRef.current.value = '';
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div id="chat-container">
      <div id="username-display">{username ? `${username}님` : '닉네임을 입력하세요'}</div>
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
          onKeyPress={handleKeyPress}
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
};

export default Chat;