import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../utils/api';
import './HomePage.css';

function HomePage() {
  const { isAuthenticated } = useAuth();
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
          <p className="eyebrow">Public game library</p>
          <h1>GameVault</h1>
          <p>Discover, review, and discuss standout games in a live catalog.</p>
          <div className="hero-actions">
            <Link to="/games" className="btn btn-primary">
              Browse Games
            </Link>
            <Link to="/play" className="btn btn-secondary">
              Play Pong
            </Link>
          </div>
          {message && <p className="api-status">{message}</p>}
        </div>
        <div className="hero-panel">
          <div>
            <span>System status</span>
            <strong>{connected ? 'Realtime connected' : 'Realtime offline'}</strong>
            <small>{apiLatency !== null ? `API latency ${apiLatency} ms` : 'API latency unavailable'}</small>
          </div>
          <div>
            <span>Live library</span>
            <strong>{catalogCount} games loaded</strong>
            <small>Auto-refreshes every 30 seconds</small>
          </div>
          <div>
            <span>Friends & chat</span>
            {isAuthenticated ? (
              <>
                <strong>{onlineCount}/{friends.length} online, {pendingCount} pending</strong>
                <small>Presence updates in realtime</small>
              </>
            ) : (
              <>
                <strong>Sign in to unlock social live stats</strong>
                <small>Friends, chat, and online indicators</small>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="features">
        <div className="feature-grid">
          <div className="feature">
            <h3>🎮 Extensive Catalog</h3>
            <p>Browse thousands of video games across all platforms and genres.</p>
          </div>
          <div className="feature">
            <h3>⭐ Write Reviews</h3>
            <p>Share your opinions and rate games with detailed reviews.</p>
          </div>
          <div className="feature">
            <h3>👥 Friends & Chat</h3>
            <p>Connect with gamers and discuss your favorite titles in real-time.</p>
          </div>
          <div className="feature">
            <h3>📊 Rankings</h3>
            <p>See what the community thinks about different games.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
