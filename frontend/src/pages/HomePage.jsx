import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../utils/api';
import { useTranslation } from '../i18n';
import './HomePage.css';

function HomePage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [apiLatency, setApiLatency] = useState(null);
  const [catalogCount, setCatalogCount] = useState(0);
  const [friends, setFriends] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  const handlePresence = useCallback((msg) => {
    if (msg.type !== 'presence') return;
    setFriends((prev) => prev.map((f) => (f.id === msg.user_id ? { ...f, online: !!msg.data?.online } : f)));
  }, []);

  const { connected } = useWebSocket(isAuthenticated ? handlePresence : null);

  const onlineCount = useMemo(() => friends.filter((friend) => friend.online).length, [friends]);

  useEffect(() => {
    const start = performance.now();
    api.health()
      .then((data) => {
        setApiLatency(Math.round(performance.now() - start));
        setMessage(data.message || '');
      })
      .catch(() => {
        setMessage('API unavailable');
        setApiLatency(null);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        const data = await api.getGames({ search: '', genre: 'All' });
        if (!cancelled) {
          setCatalogCount((data.games || []).length);
        }
      } catch {
        if (!cancelled) {
          setCatalogCount(0);
        }
      }
    };

    loadCatalog();
    const timer = setInterval(loadCatalog, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setFriends([]);
      setPendingCount(0);
      return;
    }

    let cancelled = false;

    const loadSocial = async () => {
      try {
        const [friendsData, pendingData] = await Promise.all([
          api.getFriends(),
          api.getPendingRequests(),
        ]);
        if (cancelled) return;
        setFriends(friendsData.friends || []);
        setPendingCount((pendingData.requests || []).length);
      } catch {
        if (cancelled) return;
        setFriends([]);
        setPendingCount(0);
      }
    };

    loadSocial();
    const timer = setInterval(loadSocial, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isAuthenticated]);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{t('home.publicLibrary')}</p>
          <h1>{t('app.title')}</h1>
          <p>{t('app.tagline')}</p>
          <div className="hero-actions">
            <Link to="/games" className="btn btn-primary">
              {t('home.browseGames')}
            </Link>
            <Link to="/play" className="btn btn-secondary">
              {t('home.playPong')}
            </Link>
          </div>
          {message && <p className="api-status">{message}</p>}
        </div>
        <div className="hero-panel">
          <div>
            <span>{t('home.systemStatus')}</span>
            <strong>{connected ? t('home.realtimeConnected') : t('home.realtimeOffline')}</strong>
            <small>{apiLatency !== null ? `${t('home.apiLatency')} ${apiLatency} ms` : t('home.apiUnavailable')}</small>
          </div>
          <div>
            <span>{t('home.liveLibrary')}</span>
            <strong>{catalogCount} {t('home.gamesLoaded')}</strong>
            <small>{t('home.autoRefresh')}</small>
          </div>
          <div>
            <span>{t('home.social')}</span>
            {isAuthenticated ? (
              <>
                <strong>{onlineCount}/{friends.length} {t('home.onlineOf')}, {pendingCount} {t('home.pending')}</strong>
                <small>{t('home.presenceUpdates')}</small>
              </>
            ) : (
              <>
                <strong>{t('home.signInUnlock')}</strong>
                <small>{t('home.socialInfo')}</small>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="features">
        <div className="feature-grid">
          <div className="feature">
            <h3>{t('home.feature1Title')}</h3>
            <p>{t('home.feature1Text')}</p>
          </div>
          <div className="feature">
            <h3>{t('home.feature2Title')}</h3>
            <p>{t('home.feature2Text')}</p>
          </div>
          <div className="feature">
            <h3>{t('home.feature3Title')}</h3>
            <p>{t('home.feature3Text')}</p>
          </div>
          <div className="feature">
            <h3>{t('home.feature4Title')}</h3>
            <p>{t('home.feature4Text')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
