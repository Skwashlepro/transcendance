import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, API_URL } from '../utils/api';
import './Profile.css';

function Profile() {
  const { username } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [bio, setBio] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const isOwnProfile = isAuthenticated && user?.username === username;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getProfile(username);
        setProfile(data);
        setBio(data.bio || '');
      } catch (e) {
        setError(e.message);
      }
    };
    load();
  }, [username]);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const data = await api.getMatchHistory(username);
        setMatches(data.matches || []);
      } catch (e) {
        // ignore
      }
    };
    loadMatches();
  }, [username]);

  const handleSaveBio = async () => {
    try {
      await api.updateProfile(bio);
      setProfile((p) => ({ ...p, bio }));
      setEditing(false);
      setSuccess('Profile updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await api.uploadAvatar(file);
      setProfile((p) => ({ ...p, avatar_url: data.avatar_url }));
      setSuccess('Avatar updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !profile) {
    return <div className="profile-page"><p className="error">{error}</p></div>;
  }

  if (!profile) {
    return <div className="profile-page"><div className="spinner" /></div>;
  }

  const avatarSrc = profile.avatar_url?.startsWith('http')
    ? profile.avatar_url
    : `${API_URL}${profile.avatar_url}`;

  const fallbackAvatar = 'http://localhost:3000/avatars/default-placeholder.svg';

  return (
    <div className="profile-page">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="profile-header">
        <div className="avatar-section">
          <img
            src={avatarSrc}
            alt={`${username}'s avatar`}
            className="avatar"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallbackAvatar;
            }}
          />
          {isOwnProfile && (
            <>
              <button className="btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                Change Avatar
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                hidden
              />
            </>
          )}
        </div>
        <div className="profile-info">
          <h1>{profile.username}</h1>
          <div className="stats">
            <span className="stat"><strong>{profile.wins}</strong> Wins</span>
            <span className="stat"><strong>{profile.losses}</strong> Losses</span>
          </div>
          {isOwnProfile ? (
            editing ? (
              <div className="bio-edit">
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} />
                <div className="bio-actions">
                  <button className="btn-primary btn-sm" onClick={handleSaveBio}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="bio-display">
                <p>{profile.bio || 'No bio yet'}</p>
                <button className="btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit Bio</button>
              </div>
            )
          ) : (
            <>
              <p className="bio">{profile.bio || 'No bio yet'}</p>
              {isAuthenticated && (
                <div className="profile-actions">
                  <Link to={`/chat/${username}`} className="btn-primary btn-sm">Message</Link>
                  <button className="btn-secondary btn-sm" onClick={() => navigate('/play')}>Challenge</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <section className="match-history">
        <h2>Match History</h2>
        {matches.length === 0 ? (
          <p className="empty-state">No matches played yet</p>
        ) : (
          <table className="matches-table">
            <thead>
              <tr>
                <th>Opponent</th>
                <th>Score</th>
                <th>Result</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const isPlayer1 = m.player1 === username;
                const myScore = isPlayer1 ? m.player1_score : m.player2_score;
                const oppScore = isPlayer1 ? m.player2_score : m.player1_score;
                const opponent = isPlayer1 ? m.player2 : m.player1;
                const won = m.winner === username;
                return (
                  <tr key={m.id}>
                    <td>{opponent}{m.is_ai && ' (AI)'}</td>
                    <td>{myScore} - {oppScore}</td>
                    <td className={won ? 'win' : 'loss'}>{won ? 'Win' : 'Loss'}</td>
                    <td>{new Date(m.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default Profile;
