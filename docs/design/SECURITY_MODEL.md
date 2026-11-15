# Security model

## 1. What this is

A static site. Five text files and some icons, served by Cloudflare as assets with no Worker script, or opened from disk. No server code, no accounts, no personal data, no network calls after load. The only stored data is a game save in `localStorage`.

So there are two separate concerns, and they should not be confused:

- **Security**: can someone harm a player or the site? (Script injection, a poisoned update, a malicious save file, framing.)
- **Integrity**: can a player cheat? (Edited saves, clock changes, autoclickers.) There is no other player to harm and no leaderboard. Integrity matters only so that progress means something to the person playing.

Security gets real controls. Integrity gets friction, and an honest statement of where it stops.

## 2. Security: threats and controls

| Threat | Control | Status |
| --- | --- | --- |
| Script injection through game text or a crafted save | Strict CSP (`default-src 'none'`, `script-src 'self'`), DOM built with `textContent`, saves copied field by field | In place. String sinks remain in six places. Close with TDR-010. |
| A future change reintroduces an HTML sink | Trusted Types enforced by CSP, plus a CI grep | TDR-010, TDR-002 |
| A hostile save file (prototype pollution, huge input, deep nesting, wrong types) | 200,000 character cap, strict regex on the envelope, `adopt()` reads named own-properties with type and range clamps | In place |
| Clickjacking, embedding | `frame-ancestors 'none'`, `X-Frame-Options: DENY` | In place (hosted only) |
| Downgrade or interception on a custom domain | HSTS | TDR-010 |
| Cache poisoning or version skew through the service worker | Same-origin, GET-only, 200-only caching. Needs allowlist and atomic versions. | TDR-012 |
| Compromised dev dependency reaching deploy | Lockfile, `npm ci`, pinned actions, Dependabot, `npm audit` in CI | TDR-002 |
| Deploy credential leak | No secrets in the repo. If CI deploys, use a Cloudflare token scoped to Workers Scripts edit on this one account, stored as an Actions secret. | TDR-002 |
| Data loss (browser eviction, bad import, two tabs) | Storage persistence request, second-tab halt. Needs backups and file export. | TDR-013, TDR-011 |

The CSP is declared in two places and they must match: the `<meta>` tag in `index.html` (covers `file://` and any host) and `public/_headers` (adds `frame-ancestors`, which only works as a header). CI checks parity after TDR-002.

## 3. Integrity: what is defended and what is not

| Route | Friction | Stops |
| --- | --- | --- |
| Console | State in a closure, tables frozen, hand-off globals deleted | Casual poking |
| Editing the save | Keyed checksum (cyrb53) | Anyone who does not read the source |
| Forging a sealed save | `audit()` recomputes what was affordable | Careless forgeries |
| Scripted clicks | `isTrusted`, 14 per second cap | Console scripts. Not OS-level autoclickers. |
| Device clock | Monotonic clock while running, capped away pay, rollback debt | Speeding up a running game, and rollback loops |

**Accepted limits.** Write these in the README rather than pretending otherwise.

1. Anyone who edits `game.js` can do anything.
2. The checksum key is in the source. A reader of the source can seal any save.
3. Audit ceilings scale with `played`, which is itself in the save. A forger who raises it passes the ceilings.
4. Moving the device clock forward and leaving it there earns one capped away credit per jump, and advances calendar features.
5. OS-level input automation is indistinguishable from a person.

Do not spend tickets on these. In particular do not add WebCrypto signing: the key would still ship, `crypto.subtle` is not reliably available on `file://`, and it would add an async path to save and load for no gain.

## 4. Rules for new features

Twelve tickets add state, timers or calendar logic. Each must follow these.

**Saved state**

- New fields go through `fresh()`, `adopt()` and, where a counter can justify them, `audit()`.
- Store the justification. Relics need `soundings` (completed count). Seals need `unlightings`. Pane lights are derived from other state at load, never trusted from the file.
- Strings in a save are never rendered. IDs are matched against the data tables and dropped if unknown.

**Randomness**

- Anything the player could reroll by reloading (petition offers, current offers, sounding results) uses the seeded generator from TDR-004 with a seed derived from `S.seed` and a counter stored in the save. `Math.random()` is fine for cosmetics and lantern timing.

**Time**

- Elapsed time for cooldowns and Soundings accrues from `step(dt)` (monotonic) and from `away(sec)` after debt is paid. Never compute "now minus started at" from the wall clock.
- Calendar features (phase of day, moon, solstice, eclipse, daily petition) read the wall clock by nature. Limit what a clock change can win:
  - Every phase is a bonus of similar size, so no hour is worth faking.
  - Per-day grants need the local day index to exceed the last granted day **and** at least 6 hours of `played` since the last grant.
  - One-time calendar rewards (an eclipse witnessed) are keyed by event ID and granted once per save.
  - Sky bonuses apply in `step()` only, never in `away()`.

**Input**

- Any action that grants resources from a click or key checks `ev.isTrusted` and ignores key repeat.

**DOM**

- No HTML strings. After TDR-010 the browser enforces this.

## 5. Reporting

There are no users' data to breach. A `SECURITY.md` (added in TDR-002) should say so, give a contact route through GitHub private vulnerability reporting, and state that cheating reports are not security reports.
