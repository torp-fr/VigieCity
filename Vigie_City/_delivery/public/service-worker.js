/**
 * Service Worker — VigieCity Progressive Web App
 * Caches app shell + critical routes for offline mode
 * J10.1 — Performance & PWA
 */

const CACHE_NAME = 'vigiecity-v1';
const OFFLINE_PAGE = '/offline.html';

const URLS_TO_CACHE = [
  '/',
  '/accueil',
  '/urgences',
  '/signaler',
  '/carte',
  '/services',
  '/evenements',
  '/consultations',
  '/actualites',
  '/messagerie',
  OFFLINE_PAGE,
];

// ── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch((err) => {
        console.warn('Cache addAll failed:', err);
        // Don't fail install if some URLs fail
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip API requests (let them go to network)
  if (url.pathname.startsWith('/api/') || url.pathname.includes('supabase')) {
    return;
  }

  // Cache-first for images
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        }).catch(() => {
          // Return placeholder on image fail
          return caches.match('/icon.svg');
        });
      })
    );
    return;
  }

  // Network-first for HTML (with offline fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match(OFFLINE_PAGE);
          });
        })
    );
    return;
  }

  // Cache-first for other static assets
  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        }).catch(() => caches.match('/offline.html'))
      );
    })
  );
});

// ── Message handler (update check) ──────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
