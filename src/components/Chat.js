// import React, { useState, useEffect, useRef } from 'react';

// const Chat = () => {
//   const [socket, setSocket] = useState(null);
//   const [username, setUsername] = useState('');
//   const [messages, setMessages] = useState([]);
//   const messageInputRef = useRef(null);
//   const messagesEndRef = useRef(null);

//   // 첫 번째 useEffect 실행을 제어하기 위한 플래그
//   const hasPromptedForUsername = useRef(false);

//   useEffect(() => {
//     // 최초 실행에서만 닉네임을 물어봄
//     if (!hasPromptedForUsername.current) {
//       hasPromptedForUsername.current = true;  // 플래그를 설정하여 중복 실행 방지
//       const name = prompt("채팅에 참여할 닉네임을 알려주세요:");
//       if (name) {
//         setUsername(name);
//       } else {
//         alert("닉네임을 반드시 설정해야 합니다!");
//       }
//     }
//   }, []);

//   useEffect(() => {
//     if (username) {
//       const newSocket = new WebSocket("ws://localhost:8080/chat");
//       setSocket(newSocket);

//       newSocket.onmessage = (event) => {
//         const messageData = event.data.split(':');
//         const sender = messageData[0];
//         const message = messageData.slice(1).join(':');
//         setMessages(prevMessages => [
//           ...prevMessages,
//           { sender, message, timestamp: new Date().toLocaleTimeString() }
//         ]);
//       };

//       newSocket.onclose = () => {
//         console.log("Connection closed");
//       };

//       newSocket.onopen = () => {
//         newSocket.send(username);
//       };

//       return () => newSocket.close();
//     }
//   }, [username]);

//   const sendMessage = () => {
//     if (messageInputRef.current && socket) {
//       const message = `${username}: ${messageInputRef.current.value}`;
//       const timestamp = new Date().toLocaleTimeString();
//       const messageWithTime = `${message} <span class="timestamp">${timestamp}</span>`;
//       socket.send(messageWithTime);
//       messageInputRef.current.value = '';
//     }
//   };

//   const handleKeyPress = (event) => {
//     if (event.key === 'Enter') {
//       event.preventDefault();
//       sendMessage();
//     }
//   };

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   return (
//     <div id="chat-container">
//       <div id="username-display">{username}님</div>
//       <div id="messages">
//         {messages.map((msg, index) => (
//           <div
//             key={index}
//             className={`message ${msg.sender === username ? 'sent' : 'received'}`}
//             dangerouslySetInnerHTML={{ __html: `<div class="message-sender"><b>${msg.sender}</b></div><div class="message-body">${msg.message}</div>` }}
//           />
//         ))}
//         <div ref={messagesEndRef} />
//       </div>
//       <div id="input-container">
//         <input
//           id="message"
//           type="text"
//           ref={messageInputRef}
//           onKeyPress={handleKeyPress}
//         />
//         <button onClick={sendMessage}>전송</button>
//       </div>
//     </div>
//   );
// };

// export default Chat;



//=============================================================


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
      const socket = new SockJS('http://localhost:8080/chat');
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