/* Afya Nyumbani ERP service worker: shows push notifications and opens the
   right page when one is tapped. No offline caching on purpose: the ERP must
   always show live data. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Afya Nyumbani", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Afya Nyumbani";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      vibrate: [120, 60, 120],
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/dashboard",
    self.location.origin
  );
  // Only ever open pages of this app.
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (new URL(win.url).origin === target.origin && "focus" in win) {
          return win.focus().then(() => ("navigate" in win ? win.navigate(target.href) : win));
        }
      }
      return self.clients.openWindow(target.href);
    })
  );
});
