// Lern-Erinnerung: wird in den Service Worker eingebunden (vite.config.ts → workbox.importScripts).
// Der Server schickt nur ein leeres Signal; der Text steht hier.
self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('Zeit für Japanisch', {
      body: 'Ein paar Karten warten auf dich. Fünf Minuten reichen.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'kotoba-erinnerung',
      lang: 'de',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).pathname.startsWith('/app'))
      return open ? open.focus() : self.clients.openWindow('/app')
    }),
  )
})
