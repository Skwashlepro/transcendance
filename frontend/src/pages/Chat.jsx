import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTranslation } from '../i18n';
import './Chat.css';

function Chat() {
  const { username } = useParams();
  const { t } = useTranslation();
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

  const { send, connected } = useWebSocket(isAuthenticated ? handleWsMessage : null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !username) return;

    const content = newMessage.trim();
    setNewMessage('');
    setError('');

    if (connected) {
      send({ type: 'chat', target_user: username, content });
      return;
    }

    try {
      const created = await api.sendMessage(username, content);
      setMessages((prev) => [
        ...prev,
        {
          id: created.id || Date.now(),
          username: user?.username,
          content,
          is_mine: true,
          created_at: created.created_at,
        },
      ]);
      loadConversations();
    } catch (e2) {
      setError(e2.message || 'Could not send message');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="chat-page">
        <p>{t('misc.signInPrompt')} <Link to="/signin">{t('auth.signIn')}</Link> {t('misc.toUseChat')}</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <h2>{t('chat.messages')}</h2>
        {conversations.length === 0 ? (
          <p className="empty-state">{t('chat.noConversations')}</p>
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
              <span className={`socket-status ${connected ? 'online' : 'offline'}`}>
                {connected ? t('chat.live') : t('chat.offlineMode')}
              </span>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`message ${m.is_mine ? 'mine' : 'theirs'}`}>
                  <span className="msg-author">{m.is_mine ? t('chat.you') : m.username}</span>
                  <span className="msg-content">{m.content}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input" onSubmit={handleSend}>
              <input
                type="text"
                placeholder={t('chat.typeMessage')}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                maxLength={2000}
              />
              <button type="submit" className="btn-primary">{t('chat.send')}</button>
            </form>
          </>
        ) : (
          <div className="chat-placeholder">
            <p>{t('chat.placeholder')}</p>
            <Link to="/friends" className="btn-primary">{t('chat.goToFriends')}</Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default Chat;
