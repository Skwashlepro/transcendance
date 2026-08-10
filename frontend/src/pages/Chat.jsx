import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import './Chat.css';

function Chat() {
  const { username } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data.conversations || []);
    } catch (e) {
      // ignore
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!username) return;
    try {
      const data = await api.getChatHistory(username);
      setMessages(data.messages || []);
    } catch (e) {
      setError(e.message);
    }
  }, [username]);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated, loadConversations]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'chat') {
      const isRelevant =
        (msg.username === username) ||
        (msg.user_id === user?.id && msg.data?.is_mine);
      if (isRelevant || !username) {
        setMessages((prev) => [
          ...prev,
          {
            id: msg.data?.id || Date.now(),
            username: msg.username,
            content: msg.content,
            is_mine: msg.user_id === user?.id,
            created_at: msg.data?.created_at,
          },
        ]);
        loadConversations();
      }
    }
  }, [username, user, loadConversations]);

  const { send } = useWebSocket(isAuthenticated ? handleWsMessage : null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !username) return;

    const content = newMessage.trim();
    setNewMessage('');

    send({ type: 'chat', target_user: username, content });
  };

  if (!isAuthenticated) {
    return (
      <div className="chat-page">
        <p>Please <Link to="/signin">sign in</Link> to use chat.</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <h2>Messages</h2>
        {conversations.length === 0 ? (
          <p className="empty-state">No conversations yet</p>
        ) : (
          <ul className="conversation-list">
            {conversations.map((c) => (
              <li key={c.user_id} className={c.username === username ? 'active' : ''}>
                <Link to={`/chat/${c.username}`}>
                  <strong>{c.username}</strong>
                  <span className="last-msg">{c.last_message}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main className="chat-main">
        {username ? (
          <>
            <div className="chat-header">
              <Link to={`/profile/${username}`}>{username}</Link>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`message ${m.is_mine ? 'mine' : 'theirs'}`}>
                  <span className="msg-author">{m.is_mine ? 'You' : m.username}</span>
                  <span className="msg-content">{m.content}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input" onSubmit={handleSend}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                maxLength={2000}
              />
              <button type="submit" className="btn-primary">Send</button>
            </form>
          </>
        ) : (
          <div className="chat-placeholder">
            <p>Select a conversation or start chatting with a friend</p>
            <Link to="/friends" className="btn-primary">Go to Friends</Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default Chat;
