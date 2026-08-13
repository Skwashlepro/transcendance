import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../utils/api';
import { useTranslation } from '../i18n';
import './NotificationCenter.css';

function NotificationCenter() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [friends, setFriends] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const idRef = useRef(0);

  const friendNameById = useMemo(() => {
    const map = new Map();
    friends.forEach((f) => map.set(f.id, f.username));
    return map;
  }, [friends]);

  const loadFriends = useCallback(async () => {
    try {
      const data = await api.getFriends();
      setFriends(data.friends || []);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadFriends();
  }, [isAuthenticated, loadFriends]);

  const pushNotification = useCallback((text) => {
    idRef.current += 1;
    const id = idRef.current;
    setNotifications((prev) => [{ id, text, read: false, expired: false }, ...prev].slice(0, 20));
    setTimeout(() => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, expired: true } : n)));
    }, 6000);
  }, []);

  const handleMessage = useCallback((msg) => {
    if (msg.type === 'presence' && msg.data?.online) {
      const name = friendNameById.get(msg.user_id);
      if (name) {
        pushNotification(t('notifications.friendOnline').replace('{user}', name));
      }
      return;
    }
    if (msg.type === 'friend_request') {
      pushNotification(t('notifications.friendRequest').replace('{user}', msg.data?.username || ''));
      return;
    }
    if (msg.type === 'friend_accepted') {
      pushNotification(t('notifications.friendAccepted').replace('{user}', msg.data?.username || ''));
      loadFriends();
      return;
    }
    if (msg.type === 'game_invite') {
      pushNotification(t('notifications.gameInvite').replace('{user}', msg.username || ''));
    }
  }, [friendNameById, pushNotification, t, loadFriends]);

  useWebSocket(isAuthenticated ? handleMessage : null);

  if (!isAuthenticated) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleToasts = notifications.filter((n) => !n.expired).slice(0, 4);

  const toggleOpen = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
      return !wasOpen;
    });
  };

  return (
    <>
      <div className="notification-toasts" role="status" aria-live="polite">
        {visibleToasts.map((n) => (
          <div key={n.id} className="notification-toast">{n.text}</div>
        ))}
      </div>
      <div className="notification-center">
        <button
          type="button"
          className="notification-bell"
          onClick={toggleOpen}
          aria-label={t('notifications.title')}
          aria-expanded={open}
        >
          <span aria-hidden="true">&#128276;</span>
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </button>
        {open && (
          <div className="notification-dropdown" role="menu">
            <h3>{t('notifications.title')}</h3>
            {notifications.length === 0 ? (
              <p className="notification-empty">{t('notifications.empty')}</p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>{n.text}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default NotificationCenter;
