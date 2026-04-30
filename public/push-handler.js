// Push notification handler — imported by VitePWA-generated service worker via workbox.importScripts
// Lives in /public so its URL is stable: /push-handler.js
/* eslint-disable no-undef */

self.addEventListener("push", (event) => {
  let data = {
    title: "TransplantCare",
    body: "Yangi bildirishnoma",
    url: "/",
    tag: "transplantcare-notification",
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = {
        title: parsed.title || data.title,
        body: parsed.body || data.body,
        url: parsed.url || data.url,
        tag: parsed.tag || data.tag,
      };
    }
  } catch (e) {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch (_) {
      // fallback to defaults
    }
  }

  const options = {
    body: data.body,
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    vibrate: [200, 100, 200],
    tag: data.tag,
    renotify: true,
    requireInteraction: false,
    data: { url: data.url },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        } catch (_) {
          // ignore
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return null;
    })
  );
});

// Handle subscription expiry / rotation — re-subscribe silently if possible.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const oldSub = event.oldSubscription;
        const applicationServerKey = oldSub && oldSub.options && oldSub.options.applicationServerKey;
        const newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey || undefined,
        });
        // Notify any open client to persist new subscription.
        const all = await self.clients.matchAll({ includeUncontrolled: true });
        all.forEach((c) =>
          c.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED", subscription: newSub.toJSON() })
        );
      } catch (e) {
        // swallow — client will detect on next subscribe call
      }
    })()
  );
});
