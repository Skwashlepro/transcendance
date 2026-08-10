import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import './GameDetail.css';

function GameDetail() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadGame() {
      setLoading(true);
      setError('');

      try {
        const data = await api.getGame(id);
        if (isMounted) {
          setGame(data.game);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load game details');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadGame();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return <div className="game-detail"><p>Loading game details...</p></div>;
  }

  if (error || !game) {
    return <div className="game-detail"><p>{error || 'Game not found.'}</p></div>;
  }

  const avgRating = game.reviews.length > 0
    ? (game.reviews.reduce((acc, r) => acc + r.rating, 0) / game.reviews.length).toFixed(1)
    : 0;

  return (
    <div className="game-detail">
      <div className="game-header">
        <img src={game.coverImage} alt={game.title} className="game-cover" />
        <div className="game-info">
          <h1>{game.title}</h1>
          <p className="game-meta">
            <strong>Developer:</strong> {game.developer}
          </p>
          <p className="game-meta">
            <strong>Release Date:</strong> {new Date(game.releaseDate).toLocaleDateString()}
          </p>
          <p className="game-meta">
            <strong>Platforms:</strong> {game.platforms.join(', ')}
          </p>
          <div className="game-actions">
            <button className="btn btn-primary">⭐ {avgRating}</button>
            <Link to={`/game/${game.id}/review`} className="btn btn-primary">
              Write Review
            </Link>
          </div>
        </div>
      </div>

      <div className="game-description">
        <h2>About</h2>
        <p>{game.description}</p>
      </div>

      <div className="game-reviews">
        <h2>Reviews ({game.reviews.length})</h2>
        <div className="reviews-list">
          {game.reviews.map((review) => (
            <div key={review.id} className="review-item">
              <div className="review-header">
                <Link to={`/profile/${review.author}`} className="review-author">
                  {review.author}
                </Link>
                <span className="review-rating">{'⭐'.repeat(review.rating)}</span>
                <span className="review-date">{new Date(review.date).toLocaleDateString()}</span>
              </div>
              <h4>{review.title}</h4>
              <p>{review.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GameDetail;
