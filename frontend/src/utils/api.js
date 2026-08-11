const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getStoredUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function setStoredUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  signup: (username, email, password) =>
    request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  signin: (username, password) =>
    request('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request('/api/auth/me'),

  getProfile: (username) => request(`/api/users/${username}`),
  getLeaderboard: () => request('/api/users/leaderboard'),

  updateProfile: (bio) =>
    request('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify({ bio }),
    }),

  uploadAvatar: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${API_URL}/api/users/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },

  searchUsers: (q) => request(`/api/users/search?q=${encodeURIComponent(q)}`),

  getFriends: () => request('/api/friends'),
  getPendingRequests: () => request('/api/friends/pending'),
  addFriend: (username) =>
    request('/api/friends', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),
  acceptFriend: (id) => request(`/api/friends/accept/${id}`, { method: 'POST' }),
  removeFriend: (username) =>
    request(`/api/friends/${username}`, { method: 'DELETE' }),

  getConversations: () => request('/api/chat/conversations'),
  getChatHistory: (username) => request(`/api/chat/${username}`),
  sendMessage: (username, content) =>
    request(`/api/chat/${username}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getMatchHistory: (username) => request(`/api/users/${username}/matches`),
  getGames: (params = {}) => {
    const searchParams = new URLSearchParams(params).toString();
    return request(`/api/games${searchParams ? `?${searchParams}` : ''}`);
  },
  getGame: (id) => request(`/api/games/${id}`),
  createGameReview: (id, payload) =>
    request(`/api/games/${id}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getStats: () => request('/api/stats'),
  health: () => request('/api/health'),
};

export function getWsUrl() {
  const token = getToken();
  return `${WS_URL}/ws?token=${token}`;
}

export { API_URL };
