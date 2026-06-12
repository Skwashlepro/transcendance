import React from 'react';
import { useParams, Link } from 'react-router-dom';
import './Profile.css';

function Profile() {
  const { username } = useParams();

  // Mock user data - replace with API call
  const user = {
    username: username,
    avatar: 'https://via.placeholder.com/150',
    bio: 'Hardcore gamer and game enthusiast',
    joinDate: '2023-01-15',
    reviews: [
      {
        id: 1,
        gameTitle: 'Elden Ring',
        gameId: 1,
        rating: 5,
        title: 'Masterpiece!',
        date: '2024-06-10',
      },
      {
        id: 2,
        gameTitle: 'Baldur\'s Gate 3',
        gameId: 2,
        rating: 4,
        title: 'Great game',
        date: '2024-06-08',
      },
    ],
  };

  return (
    <div className="profile">
      <div className="profile-header">
        <img src={user.avatar} alt={username} className="profile-avatar" />
        <div className="profile-info">
          <h1>{user.username}</h1>
          <p>{user.bio}</p>
          <p className="join-date">Joined {new Date(user.joinDate).toLocaleDateString()}</p>
          <button className="btn btn-primary">Add Friend</button>
        </div>
      </div>

      <div className="profile-reviews">
        <h2>Reviews</h2>
        <div className="reviews-list">
          {user.reviews.map((review) => (
            <div key={review.id} className="review-preview">
              <Link to={`/game/${review.gameId}`} className="game-link">
                {review.gameTitle}
              </Link>
              <p className="review-title">{review.title}</p>
              <p className="review-rating">{'⭐'.repeat(review.rating)}</p>
              <p className="review-date">{new Date(review.date).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Profile;
