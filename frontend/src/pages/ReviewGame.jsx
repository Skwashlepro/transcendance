import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import './ReviewGame.css';

const CATALOG_CACHE_KEY = 'game_catalog_cache_v1';

function findCachedGameById(id) {
  try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || 'null');
    if (!cached || !Array.isArray(cached.games)) {
      return null;
    }
    return cached.games.find((item) => String(item.id) === String(id)) || null;
  } catch {
    return null;
  }
}

function ReviewGame() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const game = useMemo(() => location.state?.game || findCachedGameById(id), [id, location.state]);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/signin', {
        replace: true,
        state: { from: `/game/${id}/review`, game },
      });
    }
  }, [authLoading, isAuthenticated, navigate, id, game]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.createGameReview(id, {
        rating,
        title,
        content,
        gameTitle: game?.title,
        gameGenre: game?.genre,
        gameCoverImage: game?.coverImage,
        gameDeveloper: game?.developer,
        gameReleaseDate: game?.releaseDate,
        gamePlatforms: game?.platforms || [],
        gameDescription: game?.description,
      });

      navigate(`/game/${id}`, { state: { game } });
    } catch (err) {
      setError(err.message || 'Could not submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="review-game">
        <p>Checking your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="review-game">
      <h1>{t('review.title')}</h1>
      {game?.title && <p>{t('review.reviewing')} <strong>{game.title}</strong></p>}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="review-form">
        <div className="form-group">
          <label>{t('review.rating')}</label>
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
          <p className="rating-display">{rating} {t('review.outOfFive')}</p>
        </div>

        <div className="form-group">
          <label htmlFor="title">{t('review.reviewTitle')}</label>
          <input
            id="title"
            type="text"
            placeholder={t('review.reviewTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">{t('review.yourReview')}</label>
          <textarea
            id="content"
            placeholder={t('review.reviewPlaceholder')}
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>

        <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? t('review.posting') : t('review.post')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => navigate(`/game/${id}`)}
                disabled={submitting}
          >
            {t('review.cancel')}
          </button>
        </div>
      </form>

          <p className="auth-link">
            {t('review.switchAccount')} <Link to="/signin" state={{ from: `/game/${id}/review`, game }}>{t('auth.signIn')}</Link>
          </p>
    </div>
  );
}

export default ReviewGame;
