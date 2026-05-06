"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Регистрирует Service Worker и подписку Web Push для текущего пользователя.
 * VAPID-ключ забирается с бэкенда (/push/vapid-public-key).
 */
export function useNotifications(userId: string | null) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!userId || subscribed.current) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const setup = async () => {
      try {
        const { key } = await api.get<{ key: string }>("/push/vapid-public-key");
        if (!key) return;

        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });

        const sub = subscription.toJSON();
        if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;

        await api.post("/push/subscribe", {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        });

        subscribed.current = true;
      } catch (err) {
        console.error("Push setup error:", err);
      }
    };

    setup();
  }, [userId]);
}
