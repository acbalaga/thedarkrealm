# TDR-003: Headless balance simulator and baseline report

**Epic:** Foundations · **Size:** M · **Depends on:** 001 · **Blocks:** every ticket that adds a multiplier (soft)

## Why

Nobody knows how long the game is. The review could not say how long the first Unlighting takes or when content runs out (REVIEW M-6). Twelve tickets add bonuses. Without a measured baseline they will either trivialise the curve or do nothing.

## Spec

`tools/sim.js`, run as `npm run sim -- [options]`. Uses the engine from TDR-001 with a fake clock. No DOM.

### Player policies

A policy is a function called once per simulated decision interval with the engine. Implement three:

- `idle`: checks in every 4 hours for 3 minutes. No hand gathering. Snuffs no lanterns.
- `casual`: checks in every 90 minutes during 16 waking hours for 5 minutes. Gathers by hand at 4 per second for the first 10 minutes of the save only. Snuffs 50% of lanterns that appear while present.
- `active`: present 2 hours a day in four sessions. Gathers at 8 per second for 20% of present time. Snuffs 90% of lanterns.

While present, every policy spends greedily by payback time: buy the denizen or Working with the lowest `cost / added Gloom per second`, perform the cheapest Rite when Echoes allow (prefer `edge` when the frontier is a Lampwarden the Host cannot beat), buy the cheapest affordable perk.

Unlighting rule: unlight when Nightglass per hour of this fathom has fallen to 70% of its peak for this fathom and the yield is at least 1 (and at least 20% of `glassTotal` after the first).

Time away is fed through `engine.tick()` with the fake wall clock advanced, so `away()` is exercised as in real play.

### Output

- Options: `--policy`, `--days` (default 60), `--seed`, `--json`.
- Prints a milestone table: simulated time to first Sunshaft, first Rite, first Unlighting, Sunshafts 10, 50, 100, 150, each perk, all perks, and `played` hours at each.
- Prints a per-fathom table: duration, Nightglass gained, Nightglass per hour, deepest shaft.
- Deterministic for a given seed.

### Baseline

Run all three policies for 60 days with seed 1. Commit the output as `docs/design/balance-baseline.md`, with a short note on anything surprising (stalls longer than 24 hours, milestones under 5 minutes apart, content exhausted before day 14).

### Regression guard

`tests/balance.test.js` runs `casual` for 3 simulated days (must finish in under 10 seconds of real time) and asserts the first Unlighting falls inside a window of plus or minus 25% of the baseline value. The window lives in one constant with a comment telling the next author to update it deliberately.

## Acceptance criteria

- [ ] `npm run sim -- --policy casual --days 60 --seed 1` prints the tables in under 60 seconds.
- [ ] Two runs with the same seed give identical output.
- [ ] `docs/design/balance-baseline.md` exists and answers: how long to first Unlighting, how long to Sunshaft 150, how long to all perks, for each policy.
- [ ] `docs/design/GDD.md` section 8 is updated to replace "unverified" with the measured numbers. If first Unlighting for `casual` is outside 60 to 120 minutes of present time, open a follow-up note in `docs/tickets/README.md` instead of changing balance here.

## Out of scope

Changing any balance number. A UI for the simulator.
