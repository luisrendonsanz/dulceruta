// La PWA guarda la interfaz, NO almacena tiles de OpenStreetMap ni promete mapas offline.
const VERSION = 'dulceruta-github-v1';
const ROOT = self.registration.scope;
const SHELL = ['index.html', 'registro.html', 'editor.html', 'puntos.json', 'manifest.webmanifest', 'icon-192.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION)
    .then(cache => cache.addAll(SHELL.map(path => new URL(path, ROOT).href)))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('dulceruta-github-') && key !== VERSION)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(ROOT)) return;
  // JSON siempre se consulta primero en red para reflejar altas/bajas recientes.
  if (url.pathname.endsWith('/puntos.json')) {
    event.respondWith(fetch(req, { cache: 'no-store' }).then(res => {
      if (res.ok) { const copy = res.clone(); void caches.open(VERSION).then(cache => cache.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req)));
    return;
  }
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(req).then(response => response || caches.match(new URL('index.html', ROOT).href))));
    return;
  }
  event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(response => {
    if (response.ok) { const copy = response.clone(); void caches.open(VERSION).then(cache => cache.put(req, copy)); }
    return response;
  })));
});
