/* Offline cache for The Dark Realm when served over http(s). Not used from file://.
   CACHE is written by `npm run stamp` (a hash of every file in FILES). Never edit it by hand.
   One version is all of FILES from one install, or nothing: install is atomic, there is no background
   refresh, and only files named in FILES are ever answered or stored. A new worker waits until the
   page asks it to apply, or until the next cold launch. The page is cached as './' and never as
   'index.html': some hosts (Cloudflare) redirect /index.html to /, and a redirected response cannot
   be replayed for a page load. */
var CACHE = 'tdr-b174c4b4dd';
var FILES = [
  './', 'css/style.css', 'js/data.js', 'js/core.js', 'js/nav.js', 'js/toast.js', 'js/version.js', 'js/game.js', 'manifest.webmanifest',
  'icon.svg', 'favicon.ico', 'icons/favicon-32.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];

var SCOPE_PATH = new URL('./', self.location.href).pathname;

/* The FILES key for a URL, or null when it is not ours. The root and /index.html are both './'. */
function keyOf(url) {
  var p = url.pathname;
  if (p.indexOf(SCOPE_PATH) !== 0) return null;
  p = p.slice(SCOPE_PATH.length);
  return (p === '' || p === 'index.html') ? './' : p;
}

self.addEventListener('install', function (e) {
  // addAll rejects if any file fails, so a half-fetched version never installs and the old worker stays in charge.
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('tdr-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'apply') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  var key = keyOf(url);
  if (key === null || FILES.indexOf(key) < 0) return;     // not ours: the network handles it and nothing is stored
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(key, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic' && !res.redirected) cache.put(key, res.clone());
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') return cache.match('./');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    });
  }));
});
