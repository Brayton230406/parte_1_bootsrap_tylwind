// Generado por js/tests/build-pwa.mjs. No edites la lista a mano.
const CACHE = 'michoks-pwa-f0ca8ada3b57d20d';
const FILES = ["assets/fonts/fonts.css","assets/fonts/michoks-1.woff2","assets/fonts/michoks-2.woff2","assets/fonts/michoks-3.woff2","assets/fonts/michoks-4.woff2","assets/fonts/michoks-5.woff2","assets/fonts/michoks-6.woff2","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/maskable-512.png","assets/michoks-bar.jpg","assets/michoks-logo.svg","assets/products/absolut.webp","assets/products/bacardi.webp","assets/products/baileys.png","assets/products/black-label.png","assets/products/bombay-sapphire.webp","assets/products/casillero-cabernet.jpg","assets/products/chivas-12.jpg","assets/products/club-verde.png","assets/products/don-julio.webp","assets/products/gato-negro.png","assets/products/havana-blanco.png","assets/products/havana-club.png","assets/products/jack-daniels.webp","assets/products/jagermeister.webp","assets/products/jose-cuervo.png","assets/products/martini-rosso.webp","assets/products/old-parr-12.jpg","assets/products/pilsener.png","assets/products/red-label.png","assets/products/smirnoff.jpg","assets/products/switch-bongo.png","assets/products/tanqueray.webp","assets/products/trapiche-malbec.png","assets/products/zhumir-seco.png","assets/styles.css","data/productos.json","index.html","js/age.js","js/app.js","js/cart.js","js/components.js","js/navigation.js","js/pwa.js","js/repo.js","js/storage.js","js/validation.js","js/view.js","manifest.webmanifest"];
const BASE = new URL('./', self.location.href);
const HOME = new URL('index.html', BASE).href;
self.addEventListener('install', event => {
  // El worker anterior sigue activo hasta cerrar sus pestañas; evita mezclar versiones.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new URL(file, BASE).href))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('michoks-pwa-') && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  // Una versión coherente del sitio y el catálogo; los cambios llegan mediante un nuevo worker.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const known = await cache.match(url.href);
    if (known) return known;
    if (event.request.mode === 'navigate' && ['','index.html','michoks.html'].includes(url.pathname.slice(BASE.pathname.length))) return cache.match(HOME);
    return fetch(event.request);
  })());
});
