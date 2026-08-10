import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import PongGame from '../components/PongGame';
import './Play.css';

function Play() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [gameInfo, setGameInfo] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, queue, playing, finished
  const [error, setError] = useState('');
  const [queueStartedAt, setQueueStartedAt] = useState(null);
  const [queueSeconds, setQueueSeconds] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0 });
  const [history, setHistory] = useState([]);

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
      case 'opponent_disconnected':
        setError('Opponent disconnected');
        setStatus('idle');
        setQueueStartedAt(null);
        setGameState(null);
        setGameInfo(null);
        loadDashboard();
        break;
      default:
        break;
    }
  }, [loadDashboard]);

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
          <h1>Play Pong</h1>
          <p>Sign in to play multiplayer Pong</p>
          <button className="btn-primary" onClick={() => navigate('/signin')}>Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="play-page">
      <div className="play-header">
        <h1>Pong Arena</h1>
        <span className={`connection-badge ${connected ? 'online' : 'offline'}`}>
          {connected ? 'Connected' : 'Reconnecting...'}
        </span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {status === 'idle' && (
        <div className="play-menu">
          <button className="btn-primary btn-large" onClick={findMatch} disabled={!connected}>
            Find Online Match
          </button>
          <button className="btn-secondary btn-large" onClick={findAIMatch} disabled={!connected}>
            Play vs AI
          </button>
        </div>
      )}

      {status === 'queue' && (
        <div className="queue-status">
          <div className="spinner" />
          <p>Searching for opponent...</p>
          <p className="queue-timer">Queue time: {queueSeconds}s</p>
          <button className="btn-secondary" onClick={cancelQueue}>Cancel</button>
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
              <button className="btn-primary" onClick={rematch}>Rematch</button>
              <button className="btn-secondary" onClick={() => { setStatus('idle'); setGameState(null); setGameInfo(null); loadDashboard(); }}>
                Back to Menu
              </button>
            </div>
          )}
        </div>
      )}

      <section className="play-dashboard">
        <div className="stats-card">
          <h2>Your Pong Record</h2>
          <div className="stats-grid">
            <div>
              <span>Wins</span>
              <strong>{stats.wins}</strong>
            </div>
            <div>
              <span>Losses</span>
              <strong>{stats.losses}</strong>
            </div>
            <div>
              <span>Win rate</span>
              <strong>{winRate}%</strong>
            </div>
          </div>
        </div>

        <div className="history-card">
          <h2>Recent Matches</h2>
          {history.length === 0 ? (
            <p className="history-empty">No matches played yet.</p>
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
                      <strong>{didWin ? 'Win' : 'Loss'}</strong>
                      <span>vs {opponent || 'AI'}{match.is_ai ? ' (AI)' : ''}</span>
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
