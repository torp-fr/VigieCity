// Service Worker — VigieCity
// Gère les Web Push notifications et le cache de base.

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { body: event.data.text() }; }

  const { title = "VigieCity", body = "", url = "/" } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:               "/pwa-192x192.png",
      badge:              "/pwa-64x64.png",
      data:               { url },
      vibrate:            [100, 50, 100],
      requireInteraction: false,
      tag:                "vigie-notif",
      renotify:           true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});
