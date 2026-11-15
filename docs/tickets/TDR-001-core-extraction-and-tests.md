# TDR-001: Extract game rules into `core.js` and add a test harness

**Epic:** Foundations · **Size:** L · **Depends on:** none · **Blocks:** 002, 003, 004 and most feature tickets

## Why

`public/js/game.js` holds state, rules, save handling, timing and DOM in one closure. None of it can run outside a browser, so there are no tests and no way to simulate balance. Every later ticket edits `fresh()`, `adopt()`, `audit()` and `recalc()`. Without tests those edits are blind. (REVIEW section 6.)

## Constraints

- Must still run from `file://`. No ES modules, no bundler.
- State must stay out of console reach. Use the hand-off pattern `data.js` already uses.
- **No behaviour change.** This is a move, not a rewrite. Same formulas, same save format, same text.

## Spec

1. Create `public/js/core.js`, loaded between `data.js` and `game.js` in `index.html`. It sets `window.TDR_CORE = { create: create }`. `game.js` captures it and deletes it, as it does with `TDR_DATA`.
2. `create(D, env)` returns an engine object. `env` supplies everything impure:
   - `wallNow()`, `monoNow()`, `random()` (clock and RNG, so tests can control them)
   - `say(msg)` (Whispers sink)
   - `storage` with `get(key)`, `set(key, value)`, `remove(key)` (wraps `localStorage`; tests pass a map)
3. Move into `core.js`, unchanged in logic: constants, `fresh`, `own/num/int/flag`, `adopt`, `audit`, `pruneOmens`, `seal`, `pack`, `unpack`, `save`, `load`, the `UPGS` and `OMENS` construction, accessors, cost functions, `recalc`, `gain`, `addEchoes`, all `buy*`, `unlight`, `setShaft`, `clearShaft`, `failBoss`, `fight`, `lanternDelay`, lantern state and outcome roll, `step`, `away`, the time part of `tick`, and the non-DOM part of `slowChecks`.
4. Engine surface (names are binding, later tickets use them):
   - Read: `engine.S` (getter), `engine.C`, `engine.UPGS`, `engine.OMENS`, `engine.TABS` stays in UI.
   - Time: `engine.tick()` returns `{ away: report|null, ending: bool }`. `away()` returns a plain report object `{ sec, credited, pace, capHours, gloom, echoes, bestShaft }` instead of opening a modal. The UI renders it.
   - Actions: `buyDenizen(id)`, `buyUpg(id)`, `buyRite(id)`, `buyPerk(id)`, `unlight()`, `setShaft(n)`, `setAutoAdvance(bool)`, `gather(trusted)`, `snuffLantern(trusted)` returning `{ kind, amount, duration }`.
   - Lantern: `engine.lantern` is `{ life }` or `null`. Core decides when one spawns. The UI draws it and calls `snuffLantern`.
   - Save: `engine.load()` returns `{ note }`, `engine.save()`, `engine.exportText()`, `engine.importText(str)` returning `{ ok, error }`.
   - Flags the UI clears after redrawing: `engine.dirty.omens`, `engine.dirty.codex`, `engine.dirty.upgs`.
5. `game.js` keeps: DOM helpers, modal, tabs and page builders, render, motes, boot, event wiring, the `isTrusted` and rate-limit checks (it passes the result to `gather`), service worker registration.
6. Add `'js/core.js'` to `FILES` in `public/sw.js` and bump `CACHE`.

## Tests

Use Node's built-in runner. No new dependencies.

- `package.json`: add `"test": "node --test tests/"`.
- `tests/helpers.js`: loads `data.js` and `core.js` into a `vm` context with a stub `window`, returns `{ D, create }` and a fake `env` with a controllable clock, a seeded `random`, and an in-memory `storage`.
- **Before moving any code**, add `tests/fixtures/` with at least four save strings produced by the current build (fresh, mid first fathom, after two Unlightings with perks, post-ending). The current build cannot be driven from outside, so produce them with a throwaway local edit that exposes `pack()` and a way to advance time, run it in headless Chromium, and copy the strings out. That edit is **not committed**. Record the steps in `tests/fixtures/README.md`.
- `tests/save.test.js`: each fixture unpacks, seals as valid, adopts with zero audit fixes, and re-packs to a string that adopts to a deep-equal state. A tampered body fails the seal. `__proto__`, `constructor`, wrong types, negative and non-finite numbers, and a 200,001 character input are all rejected or defaulted. An over-rich forged save (10 Sleepers, no Gloom earned) is repaired and `marks` rises.
- `tests/rules.test.js`: `denCost` and `maxBuy` agree for k from 1 to 200; buying when unaffordable changes nothing; `recalc` values for a hand-built state match numbers computed in the test; `fight` seals the expected number of shafts for a fixed Might and dt; a Lampwarden fails at 45 s and sets regroup; `away` respects the cap, the pace, and the debt.
- `tests/time.test.js`: a wall-clock jump forward while running does not speed `step`; a jump back of more than 120 s creates debt; debt is paid before any credit.

## Acceptance criteria

- [ ] `public/index.html` opened from `file://` plays identically. Manually check: gather, bind, a Working, first Sunshaft, a lantern, export and import, reload.
- [ ] `window.TDR_CORE` and `window.TDR_DATA` are both `undefined` after boot.
- [ ] `core.js` contains no reference to `document`, `window` (other than the hand-off line), `localStorage`, `Date`, `performance` or `Math.random`.
- [ ] A save from before the change loads after it with no irregularity mark.
- [ ] `npm test` passes, with at least 30 assertions across the three files.
- [ ] README "Files" table updated.

## Out of scope

Any change to formulas, text, layout or the save format. Removing `innerHTML` (TDR-010). The modifier registry (TDR-004).
