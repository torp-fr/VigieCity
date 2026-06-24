// VigieCity Service Worker — v5
// Gère : multi-stratégie cache + offline shell + Web Push notifications
// rebuild: 2026-06-24
// CHANGEMENTS v5:
//   - Bypass total /admin/* et /platform/* (network-only, jamais mis en cache)
//   - Bump version v4 -> v5 pour invalider les anciens caches
//   - Suppression du stale-while-revalidate sur les routes authentifiées

// ── Cache names ────────────────────────────────────────────────────────────────
const V             = 'v5';
const CACHE_STATIC  = `vigiecity-${V}-static`;   // JS/CSS/fonts — cache-first
const CACHE_PAGES   = `vigiecity-${V}-pages`;    // HTML navigation — stale-while-revalidate
const CACHE_IMAGES  = `vigiecity-${V}-images`;   // Images/icons   — cache-first
const ALL_CACHES    = [CACHE_STATIC, CACHE_PAGES, CACHE_IMAGES];

// ── Routes admin/platform — jamais mises en cache ─────────────────────────────
// Ces routes sont protégées par auth (Supabase session). Le cache des
// navigations ou du JS associé causerait des états stale après déploiement.
function isAuthRoute(pathname) {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/platform')
  );
}

// ── Precache : shell critique garantie offline ─────────────────────────────────
const PRECACHE_PAGES = [
  '/',
  '/accueil',
  '/urgences',
  '/signaler',
  '/services',
  '/actualites',
  '/offline.html',
  '/manifest.webmanifest',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Ouvre un cache et met l'item dedans (sans throw) */
async function putInCache(cacheName, request, response) {
  if (!response || !response.ok) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch { /* quota exceeded — ignore */ }
}

// ── Installation ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_PAGES).then(async (cache) => {
      // Précache individuel pour ne pas bloquer si une URL échoue offline
      await Promise.allSettled(
        PRECACHE_PAGES.map((url) =>
          cache.add(url).catch(() => { /* SPA shell peut 404 en dev */ })
        )
      );
    })
  );
  self.skipWaiting();
});

// ── Activation — nettoyage des anciens caches ─────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !ALL_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
      .then(() => {
        // BUG-005: notifier les tabs /admin/* et /platform/* qu'une mise à jour SW est active
        // Le React app peut écouter ce message pour afficher un toast "Mise à jour disponible"
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            try {
              const url = new URL(client.url);
              if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/platform')) {
                client.postMessage({ type: 'SW_ACTIVATED', version: V });
              }
            } catch { /* ignore invalid URLs */ }
          });
        });
      })
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── Bypass : non-GET, cross-origin externes, APIs tierces ─────────────────
  if (
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.hostname.includes('supabase.co')  ||
    url.hostname.includes('posthog.com')  ||
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('nominatim.openstreetmap.org') ||
    url.hostname.includes('overpass-api.de') ||
    (
      url.hostname !== self.location.hostname &&
      url.hostname !== 'localhost' &&
      url.hostname !== '127.0.0.1'
    )
  ) {
    return; // Laisse le browser gérer
  }

  const path = url.pathname;

  // ── BYPASS ADMIN / PLATFORM — toujours depuis le réseau ───────────────────
  // Ces routes nécessitent du code à jour et une session auth valide.
  // On ne met jamais en cache ni le HTML ni les assets associés à ces paths.
  if (isAuthRoute(path)) {
    return; // Browser gère directement — pas de SW cache
  }

  // ── 1. Static assets — Cache-first (JS/CSS/fonts/manifest) ───────────────
  if (/\.(js|css|woff2?|ttf|otf|webmanifest)$/.test(path)) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // ── 2. Images / icônes — Cache-first ──────────────────────────────────────
  if (/\.(png|svg|ico|jpg|jpeg|webp|gif|avif)$/.test(path)) {
    event.respondWith(cacheFirst(request, CACHE_IMAGES));
    return;
  }

  // ── 3. Navigation HTML — Stale-while-revalidate (routes publiques) ─────────
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ── 4. Tout le reste (fetch XHR locaux) — Network-first ──────────────────
  event.respondWith(networkFirst(request));
});

// ── Stratégie : Cache-first ───────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    putInCache(cacheName, request, response.clone());
    return response;
  } catch {
    return new Response('Ressource non disponible hors ligne.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// ── Stratégie : Stale-while-revalidate (navigation publique) ──────────────────
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  // Lance la mise à jour en arrière-plan
  const networkPromise = fetch(request)
    .then((response) => {
      putInCache(CACHE_PAGES, request, response.clone());
      return response;
    })
    .catch(() => null);

  // Retourne immédiatement le cache si dispo
  if (cached) return cached;

  // Sinon attend le réseau
  const response = await networkPromise;
  if (response) return response;

  // Fallback offline.html
  const offline = await caches.match('/offline.html');
  if (offline) return offline;

  return new Response(
    '<!DOCTYPE html><html lang="fr"><body><h1>Hors ligne</h1><p>Reconnectez-vous à Internet.</p></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// ── Stratégie : Network-first ─────────────────────────────────────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Hors ligne', { status: 503 });
  }
}

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
        { action: 'open',    title: 'Voir'    },
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
        for (const client of windowClients) {
          if ('focus' in client) {
            client.navigate?.(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
