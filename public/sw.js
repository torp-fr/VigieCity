// VigieCity Service Worker — v2
// Gère : offline cache + Web Push notifications

const CACHE_NAME = 'vigiecity-v2';

// Assets statiques à précacher
const PRECACHE_URLS = [
  '/',
  '/urgences',
  '/manifest.webmanifest',
];

// ── Installation ────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Ignore les erreurs de précache (routes SSR peuvent échouer offline)
      })
    )
  );
  self.skipWaiting();
});

// ── Activation — nettoyage des anciens caches ────────────────────────────────
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

// ── Fetch — stratégie Network-first avec fallback cache ──────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter :
  // - Requêtes non-GET
  // - API Supabase / externe
  // - Flux audio (radio)
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_server') ||
    request.headers.get('Accept')?.includes('audio/')
  ) {
    return;
  }

  // Assets statiques (.js, .css, .svg, .png, .woff2) → Cache-first
  const isStaticAsset = /\.(js|css|svg|png|jpg|webp|woff2|ico|webmanifest)(\?.*)?$/.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Pages HTML → Network-first, fallback vers cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});

// ── Web Push ─────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'VigieCity', body: event.data.text() };
  }

  const { title = 'VigieCity', body = '', url = '/', icon, badge } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || '/icons/icon.svg',
      badge: badge || '/icons/icon.svg',
      data: { url },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
