import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTranslation } from '../i18n';
import './Chat.css';

function Chat() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [inviteNotice, setInviteNotice] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  const isBlocked = blocked.includes(username);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data.conversations || []);
    } catch (e) {
      // ignore
    }
  }, []);

  const loadBlocked = useCallback(async () => {
    try {
      const data = await api.getBlocked();
      setBlocked(data.blocked || []);
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
      loadBlocked();
    }
  }, [isAuthenticated, loadConversations, loadBlocked]);

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
      return;
    }

    if (msg.type === 'typing') {
      if (msg.username === username) {
        setTypingUser(msg.username);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
      }
      return;
    }

    if (msg.type === 'read_receipt') {
      setMessages((prev) => prev.map((m) => (m.is_mine ? { ...m, read: true } : m)));
      return;
    }

    if (msg.type === 'game_invite') {
      setIncomingInvite({ inviteId: msg.data?.invite_id, fromUser: msg.username });
      return;
    }

    if (msg.type === 'game_invite_declined') {
      setInviteNotice(t('chat.inviteDeclined'));
      setTimeout(() => setInviteNotice(''), 4000);
      return;
    }

    if (msg.type === 'game_start') {
      navigate('/play');
    }
  }, [username, user, loadConversations, navigate, t]);

  const { send, connected } = useWebSocket(isAuthenticated ? handleWsMessage : null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !username || isBlocked) return;

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

  const handleTypingInput = (value) => {
    setNewMessage(value);
    if (!username || !connected) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      send({ type: 'typing', target_user: username });
    }
  };

  const handleToggleBlock = async () => {
    try {
      if (isBlocked) {
        await api.unblockUser(username);
        setBlocked((prev) => prev.filter((u) => u !== username));
      } else {
        await api.blockUser(username);
        setBlocked((prev) => [...prev, username]);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleInvite = () => {
    if (!username || !connected) return;
    send({ type: 'game_invite', target_user: username });
    setInviteNotice(t('chat.inviteSent'));
    setTimeout(() => setInviteNotice(''), 4000);
  };

  const respondToInvite = (accept) => {
    if (!incomingInvite) return;
    send({
      type: accept ? 'accept_game_invite' : 'decline_game_invite',
      invite_id: incomingInvite.inviteId,
    });
    setIncomingInvite(null);
    if (accept) {
      navigate('/play');
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
              <div className="chat-header-actions">
                <span className={`socket-status ${connected ? 'online' : 'offline'}`}>
                  {connected ? t('chat.live') : t('chat.offlineMode')}
                </span>
                <button type="button" className="btn-secondary btn-sm" onClick={handleInvite} disabled={!connected || isBlocked}>
                  {t('chat.invitePlay')}
                </button>
                <button type="button" className="btn-secondary btn-sm" onClick={handleToggleBlock}>
                  {isBlocked ? t('chat.unblock') : t('chat.block')}
                </button>
              </div>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            {inviteNotice && <div className="alert alert-success">{inviteNotice}</div>}
            {incomingInvite && (
              <div className="alert alert-success chat-invite-banner">
                <span>{t('chat.invitedYou').replace('{user}', incomingInvite.fromUser)}</span>
                <div className="chat-invite-actions">
                  <button type="button" className="btn-primary btn-sm" onClick={() => respondToInvite(true)}>{t('chat.acceptInvite')}</button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => respondToInvite(false)}>{t('chat.declineInvite')}</button>
                </div>
              </div>
            )}
            {isBlocked && <div className="alert alert-error">{t('chat.blockedNotice')}</div>}
            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`message ${m.is_mine ? 'mine' : 'theirs'}`}>
                  <span className="msg-author">{m.is_mine ? t('chat.you') : m.username}</span>
                  <span className="msg-content">{m.content}</span>
                  {m.is_mine && <span className="msg-status">{m.read ? t('chat.read') : t('chat.sent')}</span>}
                </div>
              ))}
              {typingUser === username && <div className="typing-indicator">{t('chat.typingIndicator')}</div>}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input" onSubmit={handleSend}>
              <input
                type="text"
                placeholder={isBlocked ? t('chat.blockedNotice') : t('chat.typeMessage')}
                value={newMessage}
                onChange={(e) => handleTypingInput(e.target.value)}
                maxLength={2000}
                disabled={isBlocked}
              />
              <button type="submit" className="btn-primary" disabled={isBlocked}>{t('chat.send')}</button>
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
