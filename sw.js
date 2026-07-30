/* Aero Clean Pros quote calculator — offline cache.

   The app page itself is NETWORK-FIRST: with any signal the newest build
   wins immediately (a cache-first document meant staff ran one version
   behind until they reloaded twice). With no signal it falls back to the
   cached copy, so the ramp still works offline. Icons/manifest stay
   cache-first — they rarely change and load instantly. */
const CACHE = 'acp-quotes-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  const isDocument = req.mode === 'navigate' || req.destination === 'document';
  if (isDocument) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => { c.put(req, copy); c.put('./index.html', copy.clone()); });
        }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      const refresh = fetch(req).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || refresh;
    })
  );
});
