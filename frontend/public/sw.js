// ST8 Dark Intelligence — Service Worker
// Версия: 1.0.0

const CACHE_NAME = 'st8dark-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ─── INSTALL ──────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATE ─────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── FETCH (Cache First для статики, Network First для API) ───────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API запросы — всегда сеть
  if (url.pathname.startsWith('/api/') || url.hostname.includes('api.')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Нет соединения' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        );
      })
    );
    return;
  }

  // Статика — cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// ─── PUSH УВЕДОМЛЕНИЯ ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, type, payload } = data;

  // Иконки по типу уведомления
  const icons = {
    new_order: '/icons/order.png',
    order_update: '/icons/delivery.png',
    substitution_request: '/icons/swap.png',
    inventory_alert: '/icons/alert.png',
    kitchen_task: '/icons/kitchen.png',
    default: '/icons/icon-192.png',
  };

  const options = {
    body,
    icon: icons[type] || icons.default,
    badge: '/icons/badge.png',
    tag: type + (payload?.id || ''),
    renotify: true,
    requireInteraction: type === 'substitution_request',  // замена требует ответа
    data: { type, payload, url: getNotificationUrl(type, payload) },
    actions: getNotificationActions(type, payload),
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ─── КЛИК НА УВЕДОМЛЕНИЕ ──────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const { type, payload, url } = notification.data;

  notification.close();

  if (type === 'substitution_request') {
    if (action === 'approve') {
      // Отправить одобрение
      event.waitUntil(
        fetch(`/api/substitutions/${payload.substitution_id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      return;
    }
    if (action === 'decline') {
      event.waitUntil(
        fetch(`/api/substitutions/${payload.substitution_id}/decline`, {
          method: 'POST',
        })
      );
      return;
    }
  }

  // Открыть нужную страницу
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url === url && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// ─── HELPERS ──────────────────────────────────────────────────────

function getNotificationUrl(type, payload) {
  const routes = {
    new_order: `/operator/orders/${payload?.order_id}`,
    order_update: `/customer/tracking/${payload?.order_id}`,
    substitution_request: `/customer/tracking/${payload?.order_id}`,
    inventory_alert: `/operator/inventory`,
    kitchen_task: `/operator/kitchen`,
  };
  return routes[type] || '/';
}

function getNotificationActions(type, payload) {
  if (type === 'substitution_request') {
    return [
      { action: 'approve', title: '✅ Принять замену' },
      { action: 'decline', title: '❌ Отменить' },
    ];
  }
  return [];
}
