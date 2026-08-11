import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { api, API_URL } from '../utils/api';
import './Profile.css';

function Profile() {
  const { username } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
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

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const data = await api.getLeaderboard();
        setLeaderboard(data.leaderboard || []);
      } catch (e) {
        // ignore
      }
    };
    loadLeaderboard();
  }, []);

  const handleSaveBio = async () => {
    try {
      await api.updateProfile(bio);
      setProfile((p) => ({ ...p, bio }));
      setEditing(false);
      setSuccess(t('profile.profileUpdated'));
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
      setSuccess(t('profile.avatarUpdated'));
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

  const fallbackAvatar = '/uploads/avatars/default-placeholder.svg';

  const visibleLeaderboard = (leaderboard || []).filter((entry) => {
    const placeholderNames = new Set(['dsa', 'asd', 'root', 'guest', 'player', 'placeholder', 'test', 'admin']);
    return entry && entry.username && !placeholderNames.has(String(entry.username).trim().toLowerCase());
  });

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
                {t('profile.changeAvatar')}
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
            <span className="stat"><strong>{profile.wins}</strong> {t('profile.wins')}</span>
            <span className="stat"><strong>{profile.losses}</strong> {t('profile.losses')}</span>
            <span className="stat"><strong>Lv {profile.level || 1}</strong> {t('profile.level')}</span>
          </div>
          <div className="progress-block">
            <div className="progress-row">
              <span>{t('profile.xp')}</span>
              <strong>{profile.xp || 0}</strong>
            </div>
            <div className="progress-bar">
              <span style={{ width: `${Math.min(100, (((profile.xp || 0) % 250) / 250) * 100)}%` }} />
            </div>
          </div>
          {isOwnProfile ? (
            editing ? (
              <div className="bio-edit">
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} />
                <div className="bio-actions">
                  <button className="btn-primary btn-sm" onClick={handleSaveBio}>{t('profile.save')}</button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditing(false)}>{t('profile.cancel')}</button>
                </div>
              </div>
            ) : (
              <div className="bio-display">
                <p>{profile.bio || t('profile.noBio')}</p>
                <button className="btn-secondary btn-sm" onClick={() => setEditing(true)}>{t('profile.editBio')}</button>
              </div>
            )
          ) : (
            <>
              <p className="bio">{profile.bio || t('profile.noBio')}</p>
              {isAuthenticated && (
                <div className="profile-actions">
                  <Link to={`/chat/${username}`} className="btn-primary btn-sm">{t('profile.message')}</Link>
                  <button className="btn-secondary btn-sm" onClick={() => navigate('/play')}>{t('profile.challenge')}</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="profile-panels">
        <section className="profile-panel achievements-panel">
          <h2>{t('profile.achievements')}</h2>
          {Array.isArray(profile.achievements) && profile.achievements.length > 0 ? (
            <div className="achievement-grid">
              {profile.achievements.map((achievement) => (
                <div key={achievement.key} className="achievement-item">
                  <div className="achievement-badge">★</div>
                  <div>
                    <strong>{achievement.title}</strong>
                    <p>{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">{t('profile.noAchievements')}</p>
          )}
        </section>

        <section className="profile-panel leaderboard-panel">
          <h2>{t('profile.leaderboard')}</h2>
          {visibleLeaderboard.length === 0 ? (
            <p className="empty-state">{t('profile.noLeaderboard')}</p>
          ) : (
            <ol className="leaderboard-list">
              {visibleLeaderboard.map((entry, index) => (
                <li key={`${entry.username}-${index}`} className={entry.username === username ? 'rank-self' : ''}>
                  <span>#{index + 1} {entry.username}</span>
                  <strong>{entry.wins}W · Lv {entry.level}</strong>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="match-history">
        <h2>{t('profile.matchHistory')}</h2>
        {matches.length === 0 ? (
          <p className="empty-state">{t('profile.noMatches')}</p>
        ) : (
          <table className="matches-table">
            <thead>
              <tr>
                <th>{t('profile.opponent')}</th>
                <th>{t('profile.score')}</th>
                <th>{t('profile.result')}</th>
                <th>{t('profile.date')}</th>
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
                    <td className={won ? 'win' : 'loss'}>{won ? t('profile.win') : t('profile.loss')}</td>
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
