import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import './Friends.css';

function Friends() {
  const { isAuthenticated } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadFriends = useCallback(async () => {
    try {
      const data = await api.getFriends();
      setFriends(data.friends || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const data = await api.getPendingRequests();
      setPending(data.requests || []);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadFriends();
      loadPending();
    }
  }, [isAuthenticated, loadFriends, loadPending]);

  const handlePresence = useCallback((msg) => {
    if (msg.type === 'presence') {
      setFriends((prev) =>
        prev.map((f) =>
          f.id === msg.user_id ? { ...f, online: msg.data?.online } : f
        )
      );
    }
  }, []);

  useWebSocket(isAuthenticated ? handlePresence : null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.length < 2) return;
    try {
      const data = await api.searchUsers(searchQuery);
      setSearchResults(data.users || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddFriend = async (username) => {
    try {
      await api.addFriend(username);
      setSuccess(`Friend request sent to ${username}`);
      setSearchResults([]);
      setSearchQuery('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await api.acceptFriend(requestId);
      loadFriends();
      loadPending();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRemove = async (username) => {
    try {
      await api.removeFriend(username);
      loadFriends();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="friends-page">
        <p>Please <Link to="/signin">sign in</Link> to manage friends.</p>
      </div>
    );
  }

  return (
    <div className="friends-page">
      <h1>Friends</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <section className="friends-section">
        <h2>Add Friend</h2>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary">Search</button>
        </form>
        {searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map((u) => (
              <li key={u.id}>
                <Link to={`/profile/${u.username}`}>{u.username}</Link>
                <button className="btn-secondary btn-sm" onClick={() => handleAddFriend(u.username)}>
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pending.length > 0 && (
        <section className="friends-section">
          <h2>Pending Requests</h2>
          <ul className="friends-list">
            {pending.map((r) => (
              <li key={r.request_id}>
                <Link to={`/profile/${r.username}`}>{r.username}</Link>
                <button className="btn-primary btn-sm" onClick={() => handleAccept(r.request_id)}>
                  Accept
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="friends-section">
        <h2>Your Friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="empty-state">No friends yet. Search for users above!</p>
        ) : (
          <ul className="friends-list">
            {friends.map((f) => (
              <li key={f.id}>
                <span className={`status-dot ${f.online ? 'online' : 'offline'}`} />
                <Link to={`/profile/${f.username}`}>{f.username}</Link>
                <Link to={`/chat/${f.username}`} className="btn-secondary btn-sm">Chat</Link>
                <button className="btn-danger btn-sm" onClick={() => handleRemove(f.username)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Friends;
