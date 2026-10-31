// public/sw.js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "System Alert", body: "New update received." };

  const options = {
    body: data.body,
    icon: "/logo.jpeg", 
    badge: "/logo.jpeg",
    tag: "admin-alert-" + Date.now(), // Ensures each notification is treated as unique
    renotify: true,
    requireInteraction: true // Keeps notification visible until clicked/dismissed
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes("/dashboard") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/dashboard/main");
      }
    })
  );
});