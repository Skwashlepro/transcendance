import React from 'react';
import { Link } from 'react-router-dom';
import './GameCard.css';

function GameCard({ game }) {
  const avgRating = game.reviewScoreDesc || (game.reviews ? (game.reviews.reduce((acc, r) => acc + r.rating, 0) / game.reviews.length).toFixed(1) : 'N/A');

  return (
    <Link to={`/game/${game.id}`} className="game-card">
      <div
        className="game-card-image"
        style={game.coverImage ? { backgroundImage: `linear-gradient(180deg, rgba(6, 10, 18, 0.08) 0%, rgba(6, 10, 18, 0.78) 100%), url(${game.coverImage})` } : undefined}
      >
        <div className="game-card-image-fallback" />
        <div className="game-card-image-copy">
          <span>{game.genre}</span>
          <strong>{game.title}</strong>
        </div>
      </div>
      <div className="game-card-content">
        <h3>{game.title}</h3>
        <p className="genre">{game.genre}</p>
        <div className="game-card-footer">
          <div className="rating">
            ⭐ {avgRating}
          </div>
          <span className="review-count">{game.totalReviews || game.reviews?.length || 0} reviews</span>
        </div>
      </div>
    </Link>
  );
}

export default GameCard;
