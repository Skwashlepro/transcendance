import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import './Chat.css';

function Chat() {
  const { friendId } = useParams();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'friend',
      content: 'Hey! Have you tried Elden Ring?',
      timestamp: '2024-06-10T10:30:00',
    },
    {
      id: 2,
      sender: 'user',
      content: 'Yeah! It\'s amazing, I gave it a 5 star review',
      timestamp: '2024-06-10T10:31:00',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      setMessages([
        ...messages,
        {
          id: messages.length + 1,
          sender: 'user',
          content: inputMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
      setInputMessage('');
    }
  };

  return (
    <div className="chat">
      <div className="chat-header">
        <h1>Conversation with gamer123</h1>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            <div className="message-content">{msg.content}</div>
            <span className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat;
