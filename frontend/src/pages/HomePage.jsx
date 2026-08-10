import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import './HomePage.css';

function HomePage() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.health()
      .then((data) => {
        setMessage(data.message || '');
      })
      .catch(() => {
        setMessage('API unavailable');
      });

  }, []);

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
            <span>Live library</span>
            <strong>4 curated games</strong>
          </div>
          <div>
            <span>Community score</span>
            <strong>4.8 / 5 avg</strong>
          </div>
          <div>
            <span>Mode</span>
            <strong>Browse, review, play</strong>
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
