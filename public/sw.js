// Buddha Connect service worker: shows notifications for new messages and calls
// when the app is closed, and opens the right chat when one is tapped.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const isApple = /iPhone|iPad|Macintosh/.test(self.navigator.userAgent) && !/Chrome|Android/.test(self.navigator.userAgent);

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // If the app is open on screen it shows its own banner / ringing screen.
      // (Apple requires a notification for every push, so always show one there.)
      if (!isApple && windows.some((w) => w.visibilityState === 'visible' && w.focused)) return;
      await self.registration.showNotification(data.title || 'Buddha Connect', {
        body: data.body || '',
        icon: 'img/icon-192.png',
        badge: 'img/favicon-64.png',
        tag: data.tag || undefined,
        renotify: !!data.tag,
        requireInteraction: !!data.call,
        vibrate: data.call ? [500, 250, 500, 250, 500] : [120],
        data: { url: data.url || './' },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || './', self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((w) => w.url.startsWith(self.registration.scope));
      if (open) {
        await open.focus();
        open.postMessage({ type: 'open', url });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
