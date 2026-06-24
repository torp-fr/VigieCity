/**
 * PWA Setup — Service Worker registration + update handling
 * J10 — Performance & PWA
 */

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/service-worker.js',
      { scope: '/' }
    );
    console.log('Service Worker registered:', registration);

    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    // Notify user when update available
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('App update available');
          // You can show a toast/banner here
          notifyAppUpdate();
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
}

function notifyAppUpdate() {
  // Show a subtle notification that update is ready
  if (typeof window !== 'undefined' && 'addEventListener' in window) {
    const event = new CustomEvent('app-update-available');
    window.dispatchEvent(event);
  }
}

export function skipWaiting() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}
