import React from 'react';
import { useParams, Link } from 'react-router-dom';
import './GameDetail.css';

function GameDetail() {
  const { id } = useParams();

  // Mock data - replace with API call
  const game = {
    id: id,
    title: 'Elden Ring',
    genre: 'Action RPG',
    developer: 'FromSoftware',
    releaseDate: '2022-02-25',
    platforms: ['PC', 'PlayStation 5', 'Xbox Series X'],
    description:
      'Elden Ring is an action role-playing game developed by FromSoftware and published by Bandai Namco Entertainment. The game was directed by Hidetaka Miyazaki and produced by Yoji Shinkawa.',
    coverImage: 'https://via.placeholder.com/800x450?text=Elden+Ring',
    reviews: [
      {
        id: 1,
        author: 'gamer123',
        rating: 5,
        title: 'Masterpiece!',
        content: 'An absolute masterpiece. The world design is incredible.',
        date: '2024-06-10',
      },
      {
        id: 2,
        author: 'reviewer456',
        rating: 4,
        title: 'Great game',
        content: 'Amazing game but some difficulty spikes can be frustrating.',
        date: '2024-06-08',
      },
    ],
  };

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
