import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ReviewGame.css';

function ReviewGame() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Send review to API
    console.log({ rating, title, content });
    navigate(`/game/${id}`);
  };

  return (
    <div className="review-game">
      <h1>Write a Review</h1>

      <form onSubmit={handleSubmit} className="review-form">
        <div className="form-group">
          <label>Rating</label>
          <div className="rating-selector">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`star ${star <= rating ? 'active' : ''}`}
                onClick={() => setRating(star)}
              >
                ⭐
              </button>
            ))}
          </div>
          <p className="rating-display">{rating} out of 5</p>
        </div>

        <div className="form-group">
          <label htmlFor="title">Review Title</label>
          <input
            id="title"
            type="text"
            placeholder="Give your review a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Your Review</label>
          <textarea
            id="content"
            placeholder="Share your thoughts about the game..."
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Post Review
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => navigate(`/game/${id}`)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReviewGame;
