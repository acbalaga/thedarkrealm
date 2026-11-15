# TDR-011: Close the save and input integrity gaps

**Epic:** Security · **Size:** S · **Depends on:** 001 · **Blocks:** none

## Why

Four small holes found in review. Each is a few lines. (REVIEW S-4, S-5, S-7, B-2.)

## Spec

### 1. The v1 path bypasses the seal (S-4)

`load()` adopts raw JSON from `thedarkrealm.save.v1` when the v2 key is missing, with no seal, no size cap and no mark.

- Keep the migration (a real v1 player may exist) but: reject input longer than `MAX_SAVE`; after `adopt()`, set `S.marks = Math.max(S.marks, 1)` and set `loadNote` to "An older realm was found and carried over. The Scribes have noted that it arrived unsealed."; immediately `save()` in v2 form and remove the v1 key.
- Add a constant `LEGACY_UNTIL = '2027-06-30'`. After that date the v1 path is skipped and the key is moved to `thedarkrealm.save.v1.retired`. Note the date in the README Fair play table.

### 2. Rites are unaudited after the first Unlighting (S-5)

- Add `S.runEchoes`: Echoes gained this fathom. Increment in `addEchoes`, zero in `unlight()`. `fresh()`, `adopt()` (`num`, 0 to `echoesTotal`).
- For rites kept through an Unlighting by the Rites Remembered perk, add `S.ritesKept`: a map of rite id to levels carried in, written by `unlight()`, adopted with the same clamps as `rites`.
- In `audit()`, for every state: Echoes spent on rite levels above `ritesKept` must not exceed `(runEchoes − echoes) × 1.01 + 1`. On failure reduce rites to `ritesKept` and count a fix.
- Migration: a save with `unlightings > 0` and no `runEchoes` field skips this check once (treat missing as "unknown"), then starts tracking. Use `own(o, 'runEchoes')` to tell the difference.

### 3. Key repeat is a free autoclicker (S-7)

Holding Enter or Space on the focused Stillwell produces trusted clicks at the keyboard repeat rate.

- Track key state on the well: on `keydown` for Enter or Space with `ev.repeat === true`, call `ev.preventDefault()`. A fresh press still gathers. Pointer and touch input are unaffected.
- Apply the same guard to the lantern button and, later, Litany buttons. Put it in one helper `guardRepeat(el)`.

### 4. Erase does not stop a second tab (B-2)

The `storage` listener returns early when `e.newValue === null`.

- Handle `e.key === KEY && e.newValue === null`: set `halted = true`, show the modal "The realm was erased in another window." with one button "Begin again" that reloads.
- Also handle `e.key === null` (a full `localStorage.clear()`): same behaviour.

## Tests

- v1: a v1 JSON string in fake storage loads, yields `marks >= 1`, writes a v2 key, removes v1. A v1 string over `MAX_SAVE` is ignored and the realm is fresh.
- Rites: a forged state with `unlightings: 2`, `runEchoes: 10`, 300 levels of `edge` is repaired to `ritesKept` and marked. An honest state built by calling `buyRite` after `addEchoes` passes with zero fixes. A pre-change fixture with `unlightings > 0` loads with zero fixes.
- Storage event: simulate the handler with `newValue: null` and assert the engine halts (the handler logic should be a small pure function taking the event and returning an action, so it can be tested without a browser).
- Key repeat: Playwright, hold Enter on the well for 2 seconds, assert `clicks` rose by exactly 1.

## Acceptance criteria

- [ ] All four behaviours verified by the tests above.
- [ ] Fixture saves from TDR-001 still load with zero audit fixes.
- [ ] README Fair play table gains a row for the legacy path and updates the forged-save row to mention rites.
- [ ] `CACHE` bumped.

## Out of scope

Bounding `played` (accepted limit, see `SECURITY_MODEL.md` section 3). Cryptographic signing.
