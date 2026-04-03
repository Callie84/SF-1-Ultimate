/// <reference lib="webworker" />
export {};

// Push-Nachricht empfangen und als Browser-Notification anzeigen
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: { url?: string; type?: string; notificationId?: string };
  };

  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'SeedFinderPro', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-192x192.png',
      tag: payload.tag || 'sf1-notification',
      data: payload.data || {},
      // renotify: true aktiviert Ton bei gleichem tag
      renotify: true,
    } as NotificationOptions)
  );
});

// Klick auf Notification → Browser öffnen / Tab fokussieren
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const url: string =
    event.notification.data?.url || 'https://seedfinderpro.de/notifications';

  event.waitUntil(
    (self.clients as any)
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients: WindowClient[]) => {
        // Bereits offenen Tab fokussieren falls vorhanden
        for (const client of clients) {
          if (client.url.startsWith('https://seedfinderpro.de') && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Sonst neuen Tab öffnen
        if ((self.clients as any).openWindow) {
          return (self.clients as any).openWindow(url);
        }
      })
  );
});
