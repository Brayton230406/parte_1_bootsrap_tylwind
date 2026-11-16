self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('michoks-pwa-')) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
