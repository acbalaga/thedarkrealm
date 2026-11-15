# TDR-012: Service worker, atomic versions and an update prompt

**Epic:** Security · **Size:** M · **Depends on:** 002 (for the check script) · **Blocks:** none

## Why

The worker refreshes files one at a time in the background and stores any same-origin 200. Two problems follow. A partial refresh can pair a new `game.js` with an old `data.js` on the next launch, and a table lookup that does not exist yet throws at boot. And the cache can be grown without limit with query strings. The cache name is also bumped by hand, which is easy to forget. (REVIEW B-5, S-8.)

## Spec

### 1. Cache-first from one precached version

Rewrite the `fetch` handler in `public/sw.js`:

- Handle only same-origin GET, as now.
- Normalise the request to a path. A navigation request maps to `./`.
- If the path is in `FILES`, answer from the versioned cache (`ignoreSearch: true`). If it is missing from the cache, fetch it, and store only when status is 200, type is `basic`, and not redirected.
- If the path is **not** in `FILES`, do not call `respondWith`. Let the network handle it. Nothing outside the list is ever cached.
- Remove the background refresh entirely. A version is all files from one install or nothing.

`install` keeps `cache.addAll(FILES)` (atomic: it rejects if any file fails, and the old worker stays in control). Request each file with `{ cache: 'reload' }` so the HTTP cache cannot hand back a stale copy.

### 2. Controlled activation

- Remove `self.skipWaiting()` from `install`. A new worker waits.
- The worker listens for `message` with `{ type: 'apply' }` and then calls `skipWaiting()`.
- In `game.js`: after `register()`, watch `registration.waiting` and the `updatefound` then `statechange` to `installed` path. When a new worker is waiting and there is an existing controller, show a toast or a Whisper: "A newer realm is ready." with a button "Apply". On click: `save()`, post `{ type: 'apply' }`, and reload on `controllerchange` (guard against double reloads with a flag).
- If the player ignores it, the new version applies on the next cold launch, as now.
- If TDR-051 (toasts) has not landed, use `say()` plus a small button in the Realm settings page: "Apply update".

### 3. Generated version

- `tools/stamp-sw.js`: computes a SHA-256 over the sorted contents of every file in `FILES` and rewrites the line `var CACHE = 'tdr-<first 10 hex chars>';` in `public/sw.js`. Also verifies `FILES` against the directory (shared code with `tools/check.js`).
- `package.json`: `"stamp": "node tools/stamp-sw.js"`, and make `deploy` run `npm run stamp && wrangler deploy`.
- `npm run check` fails if the stamp in `sw.js` does not match the current contents. That makes a forgotten bump a CI failure instead of a stuck player.
- Update `CLAUDE.md` "Shipping a change" step 2 to say: run `npm run stamp`.

### 4. Version shown to the player

Expose the stamp to the page without a network call: write the same value into `public/js/version.js` as `window.TDR_VERSION = 'tdr-…'` (captured and deleted by `game.js`, added to `FILES` and to `index.html` before `game.js`). Show it in small text at the bottom of the settings page. It makes bug reports usable.

## Tests

- `tests/sw.test.js`: load `sw.js` in a `vm` with stubbed `self`, `caches`, `fetch`. Assert: a request for a listed file is served from cache; an unlisted same-origin path is not intercepted and nothing is stored; a cross-origin request is not intercepted; a POST is not intercepted; a failed `addAll` leaves the previous cache untouched; `activate` deletes other `tdr-` caches only.
- `tests/stamp.test.js`: changing one byte of a listed file changes the stamp. `check` fails when the stamp is stale.
- Manual with `npm run dev`: load, change a file, stamp, reload. The old version keeps running and the prompt appears. Apply. The new version runs. Go offline and reload. It still loads.

## Acceptance criteria

- [ ] No code path stores a response for a path outside `FILES`.
- [ ] A new deploy never mixes file versions within one page load.
- [ ] The update prompt appears and works. Progress is saved before the reload.
- [ ] The stamp is checked in CI.
- [ ] README "Updates" paragraph rewritten to match.

## Out of scope

Background sync, push, periodic sync.
