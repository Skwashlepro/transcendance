import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Friends.css';

function Friends() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock friends data
  const friends = [
    {
      id: 1,
      username: 'gamer123',
      avatar: 'https://via.placeholder.com/80',
      status: 'online',
      lastGame: 'Elden Ring',
    },
    {
      id: 2,
      username: 'reviewer456',
      avatar: 'https://via.placeholder.com/80',
      status: 'offline',
      lastGame: 'Baldur\'s Gate 3',
    },
  ];

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="friends">
      <h1>Friends</h1>

      <div className="friends-search">
        <input
          type="text"
          placeholder="Search friends..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="friends-list">
        {filteredFriends.length > 0 ? (
          filteredFriends.map((friend) => (
            <div key={friend.id} className="friend-card">
              <div className="friend-avatar">
                <img src={friend.avatar} alt={friend.username} />
                <div className={`status-indicator ${friend.status}`} />
              </div>
              <div className="friend-info">
                <Link to={`/profile/${friend.username}`} className="friend-name">
                  {friend.username}
                </Link>
                <p className="last-game">{friend.lastGame}</p>
                <p className={`status ${friend.status}`}>{friend.status}</p>
              </div>
              <div className="friend-actions">
                <Link to={`/chat/${friend.id}`} className="btn">
                  Message
                </Link>
              </div>
            </div>
          ))
        ) : (
          <p className="no-results">No friends found.</p>
        )}
      </div>
    </div>
  );
}

export default Friends;
