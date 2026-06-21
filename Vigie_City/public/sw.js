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
  // - Requêt