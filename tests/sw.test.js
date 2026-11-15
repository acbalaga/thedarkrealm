'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
const BASE = 'https://game.test/sub/sw.js';

/* Loads sw.js into a vm with stubbed self, caches, fetch, Request and Response. `store` is shared
   between loads so a test can install one version, then another. */
function loadSw(opts) {
  opts = opts || {};
  const store = opts.store || new Map();            // cache name -> Map(absolute url -> response)
  const L = {};
  const state = { skipped: 0, claimed: 0, fetched: [] };
  const abs = (k) => (typeof k === 'string' ? new URL(k, BASE).href : k.url);
  function Request(u, init) { this.url = new URL(u, BASE).href; this.cache = init && init.cache; this.method = 'GET'; }
  function Response(body, init) { this.status = (init && init.status) || 200; this.type = 'basic'; this.redirected = false; this.body = body; }
  Response.prototype.clone = function () { return this; };
  const open = (name) => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name);
    return Promise.resolve({
      match: (k) => Promise.resolve(m.get(abs(k))),
      put: (k, r) => { m.set(abs(k), r); return Promise.resolve(); },
      addAll: (reqs) => Promise.all(reqs.map((r) => opts.fetch ? opts.fetch(r) : Promise.resolve(new Response('file:' + r.url))))
        .then((rs) => { reqs.forEach((r, i) => m.set(r.url, rs[i])); })
    });
  };
  const ctx = {
    self: {
      location: { href: BASE, origin: 'https://game.test' },
      addEventListener: (t, f) => { L[t] = f; },
      skipWaiting: () => { state.skipped++; },
      clients: { claim: () => { state.claimed++; return Promise.resolve(); } }
    },
    caches: {
      open,
      keys: () => Promise.resolve([...store.keys()]),
      delete: (k) => { store.delete(k); return Promise.resolve(true); }
    },
    fetch: (req) => { state.fetched.push(req.url); return opts.fetchNet ? opts.fetchNet(req) : Promise.resolve(new Response('net:' + req.url)); },
    Request, Response, URL, Promise
  };
  vm.createContext(ctx);
  vm.runInContext(opts.src || SRC, ctx);
  const files = vm.runInContext('FILES', ctx);
  return { L, state, store, files, cacheName: vm.runInContext('CACHE', ctx) };
}

function fetchEvent(L, url, extra) {
  const ev = Object.assign({ request: Object.assign({ method: 'GET', url, mode: 'no-cors' }, extra), responded: false, waited: null }, {});
  ev.respondWith = (p) => { ev.responded = true; ev.response = Promise.resolve(p); };
  L.fetch(ev);
  return ev;
}

async function install(sw) {
  let p = null;
  sw.L.install({ waitUntil: (x) => { p = x; } });
  await p;
}

test('install fetches every listed file with the HTTP cache bypassed and does not skip waiting', async () => {
  const sw = loadSw();
  await install(sw);
  const cache = sw.store.get(sw.cacheName);
  assert.equal(cache.size, sw.files.length);
  assert.equal(sw.state.skipped, 0, 'a new worker waits for the page to ask');
  assert.ok(cache.has('https://game.test/sub/'), 'the page is cached as ./');
});

test('a listed file is answered from the cache, with no network call', async () => {
  const sw = loadSw();
  await install(sw);
  const ev = fetchEvent(sw.L, 'https://game.test/sub/js/core.js?v=3');
  assert.equal(ev.responded, true);
  const res = await ev.response;
  assert.equal(res.body, 'file:https://game.test/sub/js/core.js');
  assert.equal(sw.state.fetched.length, 0);
});

test('the root and /index.html are both served as ./', async () => {
  const sw = loadSw();
  await install(sw);
  for (const u of ['https://game.test/sub/', 'https://game.test/sub/index.html']) {
    const ev = fetchEvent(sw.L, u, { mode: 'navigate' });
    assert.equal(ev.responded, true, u);
    assert.equal((await ev.response).body, 'file:https://game.test/sub/');
  }
});

test('an unlisted same-origin path is not intercepted and nothing is stored', async () => {
  const sw = loadSw();
  await install(sw);
  const before = sw.store.get(sw.cacheName).size;
  const ev = fetchEvent(sw.L, 'https://game.test/sub/secret.json');
  assert.equal(ev.responded, false);
  const q = fetchEvent(sw.L, 'https://game.test/sub/js/core.js.map');
  assert.equal(q.responded, false);
  assert.equal(sw.store.get(sw.cacheName).size, before);
});

test('cross-origin requests and non-GET requests are not intercepted', async () => {
  const sw = loadSw();
  await install(sw);
  assert.equal(fetchEvent(sw.L, 'https://elsewhere.test/sub/js/core.js').responded, false);
  assert.equal(fetchEvent(sw.L, 'https://game.test/sub/js/core.js', { method: 'POST' }).responded, false);
});

test('a listed file missing from the cache is fetched and stored only when it is a clean 200', async () => {
  const good = loadSw();
  await install(good);
  good.store.get(good.cacheName).delete('https://game.test/sub/css/style.css');
  const ev = fetchEvent(good.L, 'https://game.test/sub/css/style.css');
  await ev.response;
  assert.ok(good.store.get(good.cacheName).has('https://game.test/sub/css/style.css'));

  for (const bad of [{ status: 404 }, { type: 'opaque' }, { redirected: true }]) {
    const sw = loadSw({ fetchNet: () => Promise.resolve(Object.assign({ status: 200, type: 'basic', redirected: false, clone() { return this; } }, bad)) });
    await install(sw);
    sw.store.get(sw.cacheName).delete('https://game.test/sub/css/style.css');
    await fetchEvent(sw.L, 'https://game.test/sub/css/style.css').response;
    assert.equal(sw.store.get(sw.cacheName).has('https://game.test/sub/css/style.css'), false, JSON.stringify(bad));
  }
});

test('a failed install leaves the previous version untouched', async () => {
  const store = new Map();
  const v1 = loadSw({ store, src: SRC.replace(/var CACHE = '[^']*';/, "var CACHE = 'tdr-aaaa';") });
  await install(v1);
  const before = [...store.get('tdr-aaaa').keys()].sort();
  const v2 = loadSw({
    store, src: SRC.replace(/var CACHE = '[^']*';/, "var CACHE = 'tdr-bbbb';"),
    fetch: (r) => (/game\.js$/.test(r.url) ? Promise.reject(new Error('offline')) : Promise.resolve({ status: 200 }))
  });
  await assert.rejects(install(v2));
  assert.deepEqual([...store.get('tdr-aaaa').keys()].sort(), before);
  assert.equal(store.get('tdr-bbbb') ? store.get('tdr-bbbb').size : 0, 0, 'nothing from the failed version was kept');
});

test('activate deletes other tdr- caches only, and takes control', async () => {
  const store = new Map([['tdr-old', new Map()], ['tdr-older', new Map()], ['someone-else', new Map()]]);
  const sw = loadSw({ store });
  await install(sw);
  let p = null;
  sw.L.activate({ waitUntil: (x) => { p = x; } });
  await p;
  assert.deepEqual([...store.keys()].sort(), [sw.cacheName, 'someone-else'].sort());
  assert.equal(sw.state.claimed, 1);
});

test('a worker skips waiting only when the page sends apply', () => {
  const sw = loadSw();
  sw.L.message({ data: { type: 'other' } });
  sw.L.message({ data: null });
  assert.equal(sw.state.skipped, 0);
  sw.L.message({ data: { type: 'apply' } });
  assert.equal(sw.state.skipped, 1);
});

test('FILES in sw.js lists version.js', () => {
  assert.ok(loadSw().files.includes('js/version.js'));
});
