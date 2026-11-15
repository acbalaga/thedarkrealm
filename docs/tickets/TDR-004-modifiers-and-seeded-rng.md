# TDR-004: Modifier registry, seeded RNG and save scaffolding

**Epic:** Foundations · **Size:** M · **Depends on:** 001 · **Blocks:** 021, 022, 023, 024, 030, 031, 032, 033, 035, 036

## Why

`recalc()` computes every bonus with inline `if (perk(...))` lines, and `audit()` re-derives costs separately. A dozen tickets add modifiers. They need one place to register, and daily or per-fathom content needs randomness that a reload cannot reroll. (REVIEW section 6, `ECONOMY.md` section 2.)

## Spec

### 1. Modifier registry (in `core.js`)

- Channels as listed in `docs/design/ECONOMY.md` section 2. Multiplicative: `gloom`, `might`, `echo`, `hand`, `cost`, `riteCost`, `glass`, `lanternRate`, `lanternLife`, and `den.<id>`. Additive: `awayPace`, `bossTime`.
- `var SOURCES = []`. `addSource(name, fn)` where `fn(s, ctx)` returns an object of channel to factor (or addend). `ctx` is `{ present: bool, wall: ms }`. `present` is false when called from `away()`.
- `mods(s, ctx)` folds all sources into one object with defaults (1 for multiplicative, 0 for additive).
- Re-express the existing bonuses as sources, one per origin: `nightglass`, `omens`, `rites`, `workings`, `perks`, `lanternBuffs`. Output must be numerically identical to today.
- `recalc()` reads `mods(S, { present: true })`. `away()` reads `mods(S, { present: false })`. `denCost`, `riteCost`, `glassGain`, `lanternDelay` and the boss timer read their channel.
- `audit()` calls the same cost functions with the audited state, so cost modifiers are honoured. Remove the duplicated `disc` and free-denizen logic from `audit()` by parameterising the shared helpers on a state argument.
- Expose `C.mods` for the UI and for a new "Why" breakdown later (not in this ticket).

### 2. Seeded RNG

- Add `S.seed`: a 32-bit unsigned integer, set in `fresh()` from `env.random()`, copied in `adopt()` with `int(o, 'seed', 0, 4294967295, <new random>)`.
- `rng(label, counter)` returns a function yielding floats in [0, 1): mulberry32 seeded from a 32-bit hash of `S.seed + ':' + label + ':' + counter`. Pure, no stored state.
- Helpers: `pick(r, list)`, `shuffle(r, list)` (returns a copy), `weighted(r, pairs)`.
- Document in a comment: use `rng` for anything a reload could reroll. Use `env.random` for cosmetics and lantern timing.

### 3. Save scaffolding

- Set `v: 3` in `fresh()`. `adopt()` ignores `v`. No migration code: missing fields take defaults.
- Add `S.born` (wall ms at creation, informational only, clamped 0 to now).
- Add a test that fails when a key exists in `fresh()` but is not handled in `adopt()`: build a state where every leaf of `fresh()` is replaced by a different valid value, round-trip through `pack`, `unpack`, `adopt`, and assert deep equality. This catches the most likely mistake in every later ticket.

## Tests

- `tests/mods.test.js`: for each fixture save from TDR-001, `C.gps`, `C.click`, `C.might`, `C.echoMult` before and after this change are equal to 12 significant figures (record the "before" numbers in the fixture README as part of this ticket's first commit).
- A fake source returning `{ gloom: 2, awayPace: 0.1 }` doubles `C.gps` and raises away pace by 10 points, capped at 100%.
- `rng('x', 1)` gives the same sequence twice, a different one for `('x', 2)`, and a different one for a different `S.seed`.
- The round-trip schema test described above.

## Acceptance criteria

- [ ] No `perk('...')` call remains inside `recalc()`. Bonuses are sources.
- [ ] Simulator baseline (TDR-003) is unchanged to the minute for all three policies. If TDR-003 has not landed, the fixture equality test stands in.
- [ ] Old saves load with no irregularity mark.
- [ ] `npm test` passes.

## Out of scope

Any new bonus. Any UI.
