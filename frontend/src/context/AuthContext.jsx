import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getStoredUser, setStoredUser, clearToken, setToken, getToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.me()
        .then((data) => {
          const u = { id: data.id, username: data.username, email: data.email };
          setUser(u);
          setStoredUser(u);
        })
        .catch(() => {
          clearToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.signin(username, password);
    setToken(data.token);
    const u = { id: data.user_id, username: data.username };
    setUser(u);
    setStoredUser(u);
    return data;
  }, []);

  const signup = useCallback(async (username, email, password) => {
    const data = await api.signup(username, email, password);
    setToken(data.token);
    const u = { id: data.user_id, username: data.username };
    setUser(u);
    setStoredUser(u);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
