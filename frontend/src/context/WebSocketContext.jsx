import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { getWsUrl } from '../utils/api';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

// A single shared WebSocket connection for the whole app, so navigating between
// pages doesn't tear down and reopen the socket (the backend only keeps one
// active connection per user, which previously caused visible reconnect churn).
export function WebSocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const wsRef = useRef(null);
  const retryTimerRef = useRef(null);
  const listenersRef = useRef(new Set());
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const url = getWsUrl();
    if (!url.includes('token=') || url.endsWith('token=')) return;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
    ws.onclose = () => {
      setConnected(false);
      if (!retryTimerRef.current) {
        retryTimerRef.current = setTimeout(connect, 3000);
      }
    };
    ws.onerror = () => {
      ws.close();
    };
    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      listenersRef.current.forEach((listener) => {
        try {
          listener(data);
        } catch (e) {
          // Isolate listener failures from each other.
        }
      });
    };
  }, []);

  const disconnect = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [isAuthenticated, connect, disconnect]);

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((listener) => {
    if (!listener) return () => {};
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  return (
    <WebSocketContext.Provider value={{ connected, send, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocketContext must be used within WebSocketProvider');
  return ctx;
}
