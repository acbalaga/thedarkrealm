# TDR-023: Currents, a choice at every Unlighting

**Epic:** Mechanics · **Size:** M · **Depends on:** 004, 010 · **Blocks:** 024 (shares the choice modal)

## Why

Every fathom plays the same. A prestige reset is the one moment the player has full attention on the game, and it offers no decision. Currents give each fathom a grain: one boon, one bane, chosen from three. (REVIEW M-5, GDD P2.)

## Spec

### 1. Data

`CURRENTS` in `data.js`. Names and lines are in `LORE_BIBLE.md` section 8. *Starting values.*

| id | Boon | Bane |
| --- | --- | --- |
| `still` | none | none |
| `silted` | Tidewell and Sleeper Below output ×3 | hand gathering ×0.5 |
| `loud` | Echoes ×2 | Stray Lanterns never grant Deep Hush (reroll to Spill) |
| `narrow` | denizens cost 25% less | Host Might ×0.6 |
| `lit` | lanterns arrive twice as often | away pace −20 points |
| `cold` | Shade-Forge output ×4, Host Might ×1.5 | Starless Orchard output ×0.25 |
| `hollow` | Echoes ×1.5, Rites cost 15% less | Lampwarden timer −10 s |
| `heavy` | Nightglass from the next Unlighting ×1.25 | all Gloom ×0.7 |

Each entry declares its effects as modifier channels, for example `{ id: 'narrow', mods: { cost: 0.75, might: 0.6 } }`, plus optional flags (`noHush: true`). Register one source, `current`, that returns the active entry's `mods`.

### 2. Offer and choice

- Unlocks at the first Unlighting. The very first Unlighting has no choice and results in `still`.
- From the second Unlighting on, confirming "Let go" opens a required-choice modal (cannot be dismissed) titled "Three currents". It lists three options, each with name, line, boon and bane in plain words.
- The three are drawn with `rng('current', S.unlightings)`: always `still`, plus two distinct others. Because the seed and counter are in the save, reloading shows the same three.
- The reset happens only after a choice is made. Cancelling is possible through a "Not yet" button, which returns without unlighting.
- `S.current` holds the chosen id for the fathom. Show it as an effect chip ("A Silted Fathom · this fathom") and under the fathom subtitle in the header.

### 3. Rules to get right

- `heavy` applies its `glass` factor when the fathom **ends**, to the Unlighting that leaves it. `glassGain()` reads the `glass` channel, so the Unlighting page preview already includes it.
- `narrow` changes cost. The audit recomputes spend through the shared cost function with `S.current` in place, so an honest save still passes. A forged save cannot switch `current` mid-fathom to pass the audit cheaply, because `current` is not player-settable outside `unlight()`. Clamp in `adopt()`: unknown id becomes `still`; `unlightings === 0` forces `still`.
- `lit` and `hollow` use additive channels (`awayPace: -0.2`, `bossTime: -10`). The away pace floor is 0.1. The boss timer floor is 15 s.
- `loud`: implement as a flag checked in the lantern outcome roll.

### 4. Record

Append to a per-fathom history (used by TDR-055; if that has not landed, add the field anyway): `S.fathoms` is an array of at most 20 entries `{ n, current, vow, sec, glass, best }`, newest last, pushed in `unlight()`.

### 5. Text

Codex page `currents` unlocks on the first choice. Whisper on choosing: the current's line.

## Tests

- The offer for a given `seed` and `unlightings` is stable and always contains `still`.
- Each current's modifiers reach `C` (spot-check `narrow` cost, `silted` Tidewell output, `hollow` boss timer).
- `heavy`: the Nightglass preview and the actual gain agree, and the factor does not carry into the following fathom.
- Audit: an honest `narrow` fathom with denizens bought at the discount passes with zero fixes.
- `adopt()` rejects an unknown id.
- Simulator: add a policy rule (pick `heavy` when the previous fathom lasted over 6 hours, otherwise the option with the highest `gloom × might` product). Record deltas.

## Acceptance criteria

- [ ] The choice appears from the second Unlighting on and cannot be rerolled by reloading.
- [ ] `still` is always available, so the player is never forced into a bane.
- [ ] Banes are stated as plainly as boons.
- [ ] The modal is keyboard operable and traps focus.
- [ ] Baseline delta recorded.

## Out of scope

Currents that add new mechanics. More than one current at a time.
