import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import PongGame from '../components/PongGame';
import './Play.css';

function Play() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [gameInfo, setGameInfo] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, queue, playing, finished
  const [error, setError] = useState('');

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'queue_waiting':
        setStatus('queue');
        break;
      case 'game_start':
        setGameInfo(msg.data);
        setStatus('playing');
        setError('');
        break;
      case 'game_state':
        setGameState(msg.data);
        break;
      case 'game_over':
        setStatus('finished');
        setGameState((prev) => prev ? { ...prev, status: 'finished', winner: msg.data.winner, score1: msg.data.score1, score2: msg.data.score2 } : null);
        break;
      case 'opponent_disconnected':
        setError('Opponent disconnected');
        setStatus('idle');
        setGameState(null);
        setGameInfo(null);
        break;
      default:
        break;
    }
  }, []);

  const { connected, send } = useWebSocket(isAuthenticated ? handleMessage : null);

  const findMatch = () => send({ type: 'find_match' });
  const findAIMatch = () => send({ type: 'find_ai_match' });
  const cancelQueue = () => {
    send({ type: 'cancel_queue' });
    setStatus('idle');
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
              <button className="btn-secondary" onClick={() => { setStatus('idle'); setGameState(null); setGameInfo(null); }}>
                Back to Menu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Play;
