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

  const screenshots = game.screenshots || [];
  const reviewLabel = game.reviewScoreDesc || (game.reviewScore ? `${game.reviewScore}/10` : 'No Steam summary');

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
          <p className="game-meta">
            <strong>Steam rating:</strong> {reviewLabel} {game.totalReviews ? `(${game.totalReviews.toLocaleString()} reviews)` : ''}
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

      {(game.trailerUrl || screenshots.length > 0) && (
        <div className="game-media">
          <h2>Media</h2>
          {game.trailerUrl && (
            <div className="media-trailer">
              <video controls poster={game.coverImage}>
                <source src={game.trailerUrl} />
              </video>
            </div>
          )}
          {screenshots.length > 0 && (
            <div className="media-gallery">
              {screenshots.slice(0, 6).map((image) => (
                <img key={image} src={image} alt={`${game.title} screenshot`} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="game-reviews">
        <h2>Steam rating summary</h2>
        <div className="review-item">
          <div className="review-header">
            <span className="review-author">Steam community</span>
            <span className="review-rating">{game.reviewScore ? `${game.reviewScore}/10` : 'N/A'}</span>
            <span className="review-date">{game.reviewScoreDesc || 'No rating summary available'}</span>
          </div>
          <h4>{game.title}</h4>
          <p>
            {game.totalReviews ? `${game.totalReviews.toLocaleString()} Steam reviews are included in this summary.` : 'Steam rating data is unavailable for this title.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default GameDetail;
