import { useEffect } from 'react';
import { useWebSocketContext } from '../context/WebSocketContext';

// Thin wrapper kept for call-site compatibility: subscribes a page-local
// handler to the single shared connection instead of opening its own socket.
export function useWebSocket(onMessage) {
  const { connected, send, subscribe } = useWebSocketContext();

  useEffect(() => {
    if (!onMessage) return undefined;
    return subscribe(onMessage);
  }, [onMessage, subscribe]);

  return { connected, send };
}
