/* Push + badge handling, imported into the Workbox-generated service worker
   (see vite.config.ts -> workbox.importScripts). Plain JS: this runs in the SW,
   not through the bundler. */
/* global self, clients */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* non-JSON payload — fall back to defaults */
  }

  const title = data.title || '📬 Neue Postkarte';
  const options = {
    body: data.body || 'Du hast eine neue Postkarte erhalten.',
    icon: 'pwa-192.png',
    badge: 'pwa-192.png',
    tag: 'wanderpost-postcard',
    renotify: true,
    data: { url: data.url || '/mailbox' },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // Mirror the unread count onto the app icon, like native apps.
      if (typeof data.badgeCount === 'number' && 'setAppBadge' in self.navigator) {
        try {
          if (data.badgeCount > 0) await self.navigator.setAppBadge(data.badgeCount);
          else await self.navigator.clearAppBadge();
        } catch {
          /* badging unsupported — ignore */
        }
      }
    })(),
  );
});

// Tapping a notification focuses an open tab (or opens one) on the mailbox.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/mailbox';
  event.waitUntil(
    (async () => {
      const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of wins) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try {
              await client.navigate(url);
            } catch {
              /* cross-origin navigate can throw — just focus */
            }
          }
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })(),
  );
});
