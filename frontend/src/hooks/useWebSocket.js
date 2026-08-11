import { useEffect, useRef, useCallback, useState } from 'react';
import { getWsUrl } from '../utils/api';

export function useWebSocket(onMessage) {
  const wsRef = useRef(null);
  const retryTimerRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    const url = getWsUrl();
    if (!url.includes('token=') || url.endsWith('token=')) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) return;

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
      setConnected(false);
      ws.close();
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current?.(data);
      } catch (e) {
        // ignore parse errors
      }
    };
  }, []);

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
      return true;
    }
    return false;
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
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connected, send, disconnect, reconnect: connect };
}
