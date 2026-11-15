# The Dark Realm: working rules

An offline idle browser game. Static files only, served from `public/`. No server, no accounts, no network calls, no runtime dependencies.

The plan for upcoming work lives in `docs/`. Start at `docs/README.md`. Tickets are in `docs/tickets/`.

## Hard constraints

These hold for every change. A ticket that seems to need an exception is wrong or needs the owner's sign-off first.

1. **Runs from `file://`.** Opening `public/index.html` must work with no server. That rules out ES modules, `fetch` of local files, and any build step that the player depends on. Scripts are classic `<script src>` files.
2. **No runtime dependencies, no remote hosts.** Nothing from a CDN, no fonts, no analytics. `devDependencies` are for deploy and tests only.
3. **CSP stays strict.** No inline script or style, no `eval`, no `new Function`, no `style=""` attributes in HTML strings. Styles set from JS go through `el.style.prop = value` or a class. The CSP is declared twice (the `<meta>` in `public/index.html` and `public/_headers`). Change both or neither.
4. **No new HTML string sinks.** Build DOM with `createElement` and `textContent`. Do not add `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`.
5. **Nothing is sent anywhere.** No telemetry, no leaderboards, no ads, no purchases. This is a product promise shown to the player in the Realm tab.
6. **No punishment for absence.** Return hooks are bonuses. No streaks that reset, no decay, no loss while away.

## Save rules

The save is the only thing the player owns. Treat the schema as a public API.

- Every new saved field is added in three places: `fresh()` (default), `adopt()` (copied by name with type and range clamps), and `audit()` when the field can be checked against other bookkeeping.
- `adopt()` copies known fields only. Never merge, spread or `Object.assign` untrusted data into state.
- Changes are additive. A save written by an older version must load in a newer one with defaults for the missing fields. Do not rename `KEY` or `SAVE_TAG`.
- Anything earned must be auditable where practical: store the counter that justifies it (for example relics found cannot exceed soundings completed).
- Wall-clock time is only trusted through `S.seen` and `away()`. Elapsed play time comes from the monotonic clock. New timed features follow the rules in `docs/design/SECURITY_MODEL.md` section 4.

## Code style

- Plain ES5-compatible script inside one IIFE per file, `'use strict'`, `var`, function declarations. Match the surrounding code. No transpiler.
- Balance numbers live in `public/js/data.js` or the constants at the top of the logic file, never inline in UI code.
- All player-facing text follows `docs/design/LORE_BIBLE.md` section 2 (voice). No exclamation marks, no em dashes, no modern slang.
- Gold (`--light`) is the enemy's colour. See `docs/design/UI_UX_GUIDE.md` section 2 before choosing a colour.

## Shipping a change

1. Run `npm test` (available once TDR-001 lands).
2. If any file under `public/` changed, add new files to `FILES` in `public/sw.js` and run `npm run stamp`. It rewrites `CACHE` and `public/js/version.js` from a hash of the files. `npm run check` fails when the stamp is stale.
3. Update `README.md` if player-visible behaviour, the Fair play table or the Security list changed.
4. Tick the ticket in `docs/tickets/README.md`.
5. One ticket per branch and PR. Do not bundle.
