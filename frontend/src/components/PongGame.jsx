import React, { useRef, useEffect, useCallback } from 'react';
import './PongGame.css';

const FIELD_W = 800;
const FIELD_H = 600;

function PongGame({ gameState, side, onInput }) {
  const canvasRef = useRef(null);
  const keysRef = useRef({ up: false, down: false });

  const handleKeyDown = useCallback((e) => {
    if (['w', 'W', 'ArrowUp'].includes(e.key)) keysRef.current.up = true;
    if (['s', 'S', 'ArrowDown'].includes(e.key)) keysRef.current.down = true;
    if (['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
    }
  }, []);

  const handleKeyUp = useCallback((e) => {
    if (['w', 'W', 'ArrowUp'].includes(e.key)) keysRef.current.up = false;
    if (['s', 'S', 'ArrowDown'].includes(e.key)) keysRef.current.down = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    const interval = setInterval(() => {
      let direction = 0;
      if (keysRef.current.up && !keysRef.current.down) direction = -1;
      if (keysRef.current.down && !keysRef.current.up) direction = 1;
      if (keysRef.current.up && keysRef.current.down) direction = 0;
      onInput(direction);
    }, 16);
    return () => clearInterval(interval);
  }, [onInput]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext('2d');
    const scaleX = canvas.width / FIELD_W;
    const scaleY = canvas.height / FIELD_H;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    const paddleW = 12 * scaleX;
    const paddleH = 100 * scaleY;

    ctx.fillStyle = side === 1 ? '#4ade80' : '#60a5fa';
    ctx.fillRect(0, gameState.paddle1.y * scaleY, paddleW, paddleH);

    ctx.fillStyle = side === 2 ? '#4ade80' : '#60a5fa';
    ctx.fillRect(canvas.width - paddleW, gameState.paddle2.y * scaleY, paddleW, paddleH);

    // Ball
    const ballSize = 12 * scaleX;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(
      gameState.ball.x * scaleX + ballSize / 2,
      gameState.ball.y * scaleY + ballSize / 2,
      ballSize / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Scores
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${48 * scaleY}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(gameState.score1, canvas.width * 0.25, 60 * scaleY);
    ctx.fillText(gameState.score2, canvas.width * 0.75, 60 * scaleY);

    // Status overlay
    if (gameState.status === 'countdown' && gameState.countdown > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${72 * scaleY}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(gameState.countdown, canvas.width / 2, canvas.height / 2);
    }

    if (gameState.status === 'finished') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${36 * scaleY}px monospace`;
      ctx.textAlign = 'center';
      const won = gameState.winner === side;
      ctx.fillText(won ? 'You Win!' : 'You Lose!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = `${24 * scaleY}px monospace`;
      ctx.fillText(`${gameState.score1} - ${gameState.score2}`, canvas.width / 2, canvas.height / 2 + 30);
    }
  }, [gameState, side]);

  return (
    <div className="pong-container">
      <canvas
        ref={canvasRef}
        width={FIELD_W}
        height={FIELD_H}
        className="pong-canvas"
        tabIndex={0}
        role="img"
        aria-label="Pong game area"
      />
      <p className="pong-controls">Use W/S or Arrow keys to move your paddle</p>
    </div>
  );
}

export default PongGame;
