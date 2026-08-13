import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTranslation } from '../i18n';
import PongGame from '../components/PongGame';
import './Play.css';

function Play() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [gameInfo, setGameInfo] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, queue, playing, finished
  const [error, setError] = useState('');
  const [queueStartedAt, setQueueStartedAt] = useState(null);
  const [queueSeconds, setQueueSeconds] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0 });
  const [history, setHistory] = useState([]);
  const [reconnectNotice, setReconnectNotice] = useState('');

  const winRate = useMemo(() => {
    const total = stats.wins + stats.losses;
    if (total === 0) return 0;
    return Math.round((stats.wins / total) * 100);
  }, [stats]);

  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated || !user?.username) return;
    try {
      const [statsData, historyData] = await Promise.all([
        api.getStats(),
        api.getMatchHistory(user.username),
      ]);
      setStats({
        wins: statsData.wins || 0,
        losses: statsData.losses || 0,
      });
      setHistory(historyData.matches || []);
    } catch {
      // Keep existing dashboard data if loading fails.
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!queueStartedAt) {
      setQueueSeconds(0);
      return undefined;
    }

    const timer = setInterval(() => {
      setQueueSeconds(Math.floor((Date.now() - queueStartedAt) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [queueStartedAt]);

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'queue_waiting':
        setStatus('queue');
        setQueueStartedAt(Date.now());
        break;
      case 'game_start':
        setGameInfo(msg.data);
        setStatus('playing');
        setQueueStartedAt(null);
        setError('');
        setReconnectNotice('');
        break;
      case 'game_state':
        setGameState(msg.data);
        break;
      case 'game_over':
        setStatus('finished');
        setGameState((prev) => prev ? { ...prev, status: 'finished', winner: msg.data.winner, score1: msg.data.score1, score2: msg.data.score2 } : null);
        setQueueStartedAt(null);
        loadDashboard();
        break;
      case 'opponent_reconnecting':
        setReconnectNotice(t('play.opponentReconnecting').replace('{seconds}', msg.data?.grace_seconds || 20));
        break;
      case 'opponent_reconnected':
        setReconnectNotice('');
        break;
      case 'opponent_disconnected':
        setError(t('play.opponentDisconnected'));
        setReconnectNotice('');
        setStatus('idle');
        setQueueStartedAt(null);
        setGameState(null);
        setGameInfo(null);
        loadDashboard();
        break;
      default:
        break;
    }
  }, [loadDashboard, t]);

  const { connected, send } = useWebSocket(isAuthenticated ? handleMessage : null);

  const findMatch = () => send({ type: 'find_match' });
  const findAIMatch = () => send({ type: 'find_ai_match' });
  const cancelQueue = () => {
    send({ type: 'cancel_queue' });
    setStatus('idle');
    setQueueStartedAt(null);
  };
  const rematch = () => {
    if (gameInfo?.game_id) {
      send({ type: 'rematch', game_id: gameInfo.game_id });
      setStatus('playing');
    }
  };
  const handleInput = useCallback((direction) => {
    send({ type: 'game_input', direction });
  }, [send]);

  if (!isAuthenticated) {
    return (
      <div className="play-page">
        <div className="play-card">
          <h1>{t('play.title')}</h1>
          <p>{t('play.signInPrompt')}</p>
          <button className="btn-primary" onClick={() => navigate('/signin')}>{t('auth.signIn')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="play-page">
      <div className="play-header">
        <h1>{t('play.title')}</h1>
        <span className={`connection-badge ${connected ? 'online' : 'offline'}`}>
          {connected ? t('play.connected') : t('play.reconnecting')}
        </span>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {reconnectNotice && <div className="error-banner reconnect-banner">{reconnectNotice}</div>}

      {status === 'idle' && (
        <div className="play-menu">
          <button className="btn-primary btn-large" onClick={findMatch} disabled={!connected}>
            {t('play.findOnline')}
          </button>
          <button className="btn-secondary btn-large" onClick={findAIMatch} disabled={!connected}>
            {t('play.playAi')}
          </button>
        </div>
      )}

      {status === 'queue' && (
        <div className="queue-status">
          <div className="spinner" />
          <p>{t('play.searching')}</p>
          <p className="queue-timer">{t('play.queueTime')}: {queueSeconds}s</p>
          <button className="btn-secondary" onClick={cancelQueue}>{t('play.cancel')}</button>
        </div>
      )}

      {(status === 'playing' || status === 'finished') && gameState && (
        <div className="game-area">
          {gameInfo && (
            <p className="opponent-info">
              vs {gameInfo.opponent} {gameInfo.is_ai && '(AI)'}
            </p>
          )}
          <PongGame gameState={gameState} side={gameInfo?.side || 1} onInput={handleInput} />
          {status === 'finished' && (
            <div className="game-actions">
              <button className="btn-primary" onClick={rematch}>{t('play.rematch')}</button>
              <button className="btn-secondary" onClick={() => { send({ type: 'leave_game', game_id: gameInfo?.game_id }); setStatus('idle'); setGameState(null); setGameInfo(null); loadDashboard(); }}>
                {t('play.backToMenu')}
              </button>
            </div>
          )}
        </div>
      )}

      <section className="play-dashboard">
        <div className="stats-card">
          <h2>{t('play.yourPongRecord')}</h2>
          <div className="stats-grid">
            <div>
              <span>{t('play.wins')}</span>
              <strong>{stats.wins}</strong>
            </div>
            <div>
              <span>{t('play.losses')}</span>
              <strong>{stats.losses}</strong>
            </div>
            <div>
              <span>{t('play.winRate')}</span>
              <strong>{winRate}%</strong>
            </div>
          </div>
        </div>

        <div className="history-card">
          <h2>{t('play.recentMatches')}</h2>
          {history.length === 0 ? (
            <p className="history-empty">{t('play.noMatches')}</p>
          ) : (
            <ul className="history-list">
              {history.slice(0, 8).map((match) => {
                const isPlayer1 = match.player1 === user?.username;
                const myScore = isPlayer1 ? match.player1_score : match.player2_score;
                const oppScore = isPlayer1 ? match.player2_score : match.player1_score;
                const opponent = isPlayer1 ? match.player2 : match.player1;
                const didWin = match.winner === user?.username;

                return (
                  <li key={match.id}>
                    <div>
                      <strong>{didWin ? t('profile.win') : t('profile.loss')}</strong>
                      <span>{t('play.vs')} {opponent || 'AI'}{match.is_ai ? ' (AI)' : ''}</span>
                    </div>
                    <div className="history-score">{myScore} - {oppScore}</div>
                    <time>{new Date(match.created_at).toLocaleString()}</time>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export default Play;
