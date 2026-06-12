import React from 'react';
import { Link } from 'react-router-dom';
import './GameCard.css';

function GameCard({ game }) {
  const avgRating = game.reviews ? (game.reviews.reduce((acc, r) => acc + r.rating, 0) / game.reviews.length).toFixed(1) : 0;

  return (
    <Link to={`/game/${game.id}`} className="game-card">
      <div className="game-card-image">
        <img src={game.coverImage} alt={game.title} />
      </div>
      <div className="game-card-content">
        <h3>{game.title}</h3>
        <p className="genre">{game.genre}</p>
        <div className="game-card-footer">
          <div className="rating">
            ⭐ {avgRating}
          </div>
          <span className="review-count">{game.reviews?.length || 0} reviews</span>
        </div>
      </div>
    </Link>
  );
}

export default GameCard;
