/* Offline cache for The Dark Realm when served over http(s). Not used from file://.
   Bump CACHE whenever a shipped file changes.
   The page is cached as './' and never as 'index.html': some hosts (Cloudflare) redirect
   /index.html to /, and a redirected response cannot be replayed for a page load. */
var CACHE = 'tdr-v4';
var FILES = [
  './', 'css/style.css', 'js/data.js', 'js/core.js', 'js/game.js', 'manifest.webmanifest',
  'icon.svg', 'favicon.ico', 'icons/favicon-32.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Serve from cache at once and refresh the copy in the background. Only same-origin GETs are
   handled, and only complete, successful, same-origin responses are ever stored. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      var fresh = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic' && !res.redirected) cache.put(req, res.clone());
        return res;
      });
      if (hit) { e.waitUntil(fresh.catch(function () {})); return hit; }
      return fresh.catch(function () {
        if (req.mode === 'navigate') return cache.match('./');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    });
  }));
});
