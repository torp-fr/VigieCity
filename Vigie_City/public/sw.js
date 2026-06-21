// VigieCity Service Worker — v3
// Gère : offline cache shell + Web Push notifications
// rebuild: 2026-06-21

const CACHE_NAME    = 'vigiecity-v3';
const PRECACHE_URLS = [
  '/',
  '/accueil',
  '/urgences',
  '/manifest.webmanifest',
];

// ── Installation ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Ignore les erreurs de précache (routes SPA peuvent échouer offline)
      })
    )
  );
  self.skipWaiting();
});

// ── Activation — nettoyage des anciens caches ─────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — Network-first avec fallback cache ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, Supabase API, PostHog, Chrome extensions
  if (
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('posthog.com') ||
    url.hostname.includes('open-meteo.com') ||
    (url.hostname !== self.location.hostname &&
     url.hostname !== 'localhost' &&
     url.hostname !== '127.0.0.1')
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache navigation + static assets on success
        if (
          response.ok &&
          (request.mode === 'navigate' ||
           /\.(js|css|png|svg|ico|webmanifest|woff2?)$/.test(url.pathname))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        // Offline fallback: try cache, then root shell
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/') ??
              new Response('<h1>Hors ligne</h1><p>Reconnectez-vous à Internet.</p>', {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              });
          }
          return new Response('Hors ligne', { status: 503 });
        })
      )
  );
});

// ── Push — réception notification ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: 'VigieCity', message: event.data?.text() ?? '' };
  }

  const title   = payload.title   ?? 'VigieCity';
  const body    = payload.message ?? payload.body ?? '';
  const url     = payload.url     ?? '/accueil';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:     '/icons/icon-192.png',
      badge:    '/icons/icon-192.png',
      tag:      'vigiecity-push',
      renotify: true,
      data:     { url },
      vibrate:  [200, 100, 200],
      actions: [
        { action: 'open',    title: 'Voir' },
        { action: 'dismiss', title: 'Ignorer' },
      ],
    })
  );
});

// ── Notification click — ouvrir l'URL cible ───────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url ?? '/accueil';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus/navigate an existing window if possible
        for (const client of windowClients) {
          if ('focus' in client) {
            client.navigate?.(targetUrl);
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
