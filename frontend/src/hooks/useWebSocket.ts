"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getToken } from "@/lib/auth";

export interface WSMessage {
  type: string;
  payload?: Record<string, unknown> & { order_id?: string };
  timestamp?: string;
}

type Listener = (msg: WSMessage) => void;

/**
 * Подключение к WS-каналу backend'а: 'operator/{storeId}' | 'courier/{id}' | 'customer/{id}' | 'manager/{client_id}'
 * channel === null отключает подписку.
 * Токен берётся из localStorage через getToken().
 */
export function useWebSocket(channel: string | null, onMessage?: Listener) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlerRef = useRef<Listener | undefined>(onMessage);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!channel) return;
    const token = getToken();
    if (!token) return;

    const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const socket = new WebSocket(`${baseWsUrl}/ws/${channel}?token=${token}`);

    socket.onopen = () => setIsConnected(true);

    socket.onmessage = (event) => {
      if (event.data === "ping") {
        socket.send("pong");
        return;
      }
      try {
        const msg: WSMessage = JSON.parse(event.data);
        handlerRef.current?.(msg);
      } catch {
        // ignore non-json
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    socket.onerror = () => socket.close();
    ws.current = socket;
  }, [channel]);

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
