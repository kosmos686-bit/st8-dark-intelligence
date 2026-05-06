"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface WSMessage {
  type: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

interface UseWebSocketOptions {
  onMessage?: (msg: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
}

export function useWebSocket(
  channel: string,         // 'operator/{storeId}' | 'courier/{id}' | etc
  token: string | null,
  options: UseWebSocketOptions = {}
) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { onMessage, onConnect, onDisconnect, reconnectInterval = 3000 } = options;

  const connect = useCallback(() => {
    if (!token || !channel) return;

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws/${channel}?token=${token}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      onConnect?.();
    };

    socket.onmessage = (event) => {
      try {
        if (event.data === "ping") {
          socket.send("pong");
          return;
        }
        const msg: WSMessage = JSON.parse(event.data);
        onMessage?.(msg);
      } catch {
        // ignore parse errors
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      onDisconnect?.();
      // Переподключение
      reconnectTimer.current = setTimeout(connect, reconnectInterval);
    };

    socket.onerror = () => {
      socket.close();
    };

    ws.current = socket;
  }, [channel, token, onMessage, onConnect, onDisconnect, reconnectInterval]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { isConnected, send };
}
