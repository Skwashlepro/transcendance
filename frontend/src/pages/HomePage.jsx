import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>GameVault</h1>
        <p>Discover, Review, and Discuss Video Games with the Community</p>
        <Link to="/games" className="btn btn-primary">
          Browse Games
        </Link>
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
