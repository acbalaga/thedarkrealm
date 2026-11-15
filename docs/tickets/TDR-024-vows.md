# TDR-024: Vows and Keepings

**Epic:** Mechanics · **Size:** M · **Depends on:** 004, 023 · **Blocks:** 035

## Why

Challenge runs are the proven long-tail of the genre: give up a tool, reach a mark, keep a permanent reward. They turn a known system into a new problem and give experienced players a reason to run another fathom. Here they are Vows, and the fiction already supports them. (GDD P2, P3.)

## Spec

### 1. Data

`VOWS` in `data.js`. Names and lines in `LORE_BIBLE.md` section 8. *Starting values.*

| id | Restriction for the fathom | Kept when | Keeping (permanent) |
| --- | --- | --- | --- |
| `hands` | Hand gathering yields nothing. Bound Hands perk is inert. | Seal Sunshaft 40 | Hand gathering ×2. Bound Hands has 6 shadows instead of 4. |
| `silence` | No Rite can be performed. Rites carried in by Rites Remembered still apply. | Seal Sunshaft 30 | Rites cost 10% less |
| `door` | Lanterns appear but cannot be snuffed | Seal Sunshaft 50 | Lanterns stay 6 s longer |
| `chain` | Lampwarden timer is 20 s | Seal Sunshaft 60 | Lampwarden timer +10 s |
| `few` | No more than 50 of any denizen | Seal Sunshaft 50 | Denizens cost 5% less |
| `unlit` | The +5% per Nightglass bonus is ignored | Seal Sunshaft 70 | Nightglass gained ×1.1 |

"Seal Sunshaft N" means sealing it during the vowed fathom, counted from the fathom's own progress (`S.shaftTop > N`), not from `bestShaft`. With the Remembered Road perk the fathom may start past the target: in that case the target is `max(N, startShaft + 20)`, stored in `S.vowGoal` at the moment the vow is taken.

### 2. Taking a vow

- Unlocks when `S.unlightings >= 3`. Codex page `vows`.
- Taken only at an Unlighting, in the same required-choice modal as the Current (TDR-023), as a second step: "Take a vow for this fathom?" with the six listed, kept ones marked, and "No vow".
- One vow at a time. `S.vow` is the id or `''`.
- A kept vow can be taken again, but pays nothing further. Mark it "Kept".

### 3. During the fathom

- Each vow is a modifier source or a rule check in the relevant action:
  - `hands`: `gather()` returns without gain. The well still pulses. The floater reads "0". Register `hand: 0` and make Bound Hands read it.
  - `silence`: `buyRite()` refuses. The Rites page shows a notice.
  - `door`: `snuffLantern()` refuses. Lanterns are drawn dimmed. They do not break or build the snuff streak.
  - `chain`: `bossTime` set to 20 by replacing, not adding. Apply after all other sources.
  - `few`: `buyDenizen()` clamps the bought count so the total does not pass 50. Max mode respects it.
  - `unlit`: the `nightglass` source returns 1 for `gloom` and `might`.
- Effect chip: "Vow of Silence · Sunshaft 30".
- A "Set down the vow" button on the Vows page ends it at once with no reward and no penalty. Confirm first.
- When the goal is met: `S.keepings[id] = 1`, clear `S.vow`, toast and Whisper from `LORE_BIBLE.md`, and the Keeping's modifier applies from then on, including for the rest of this fathom.
- An Unlighting while a vow is active sets it down.

### 4. Vows page

Under the Deep destination (or as a section of the Unlighting tab until TDR-050 lands). Lists the six with restriction, goal and Keeping, the active one highlighted with progress ("Sunshaft 22 of 30"), kept ones marked with a check glyph and the glass colour.

### 5. Save and audit

- Fields: `vow` (id or `''`), `vowGoal` (int), `keepings` (map of id to 1).
- `adopt()`: unknown ids dropped. `vow` forced to `''` when `unlightings < 3`.
- `audit()`: any keeping requires `unlightings >= 4` (three to unlock, one to take it). Count of keepings cannot exceed `unlightings − 3`. The keeping's own goal shaft cannot exceed `bestShaft`. On failure remove keepings from the last backward.
- Audit interaction: with `few` kept, the cost channel changes. The shared cost function covers it.

### 6. Omens

"Kept" (keep one vow), "Six Things Set Aside" (keep all six). Both `mono` against `keepings` count.

## Tests

- Each restriction blocks its action and nothing else.
- Goal with and without Remembered Road.
- Keeping a vow applies the reward immediately and permanently, and survives an Unlighting.
- Setting down, and unlighting mid-vow, grant nothing.
- Audit removes impossible keepings.
- Simulator: extend the policies to take the cheapest unkept vow whenever the previous fathom's deepest shaft exceeded that vow's goal by 20. Record how many fathoms each vow costs.

## Acceptance criteria

- [ ] Every vow is completable. Show this with the simulator, not by argument.
- [ ] No vow can soft-lock a fathom. The player can always set it down or unlight.
- [ ] Restrictions are explained on the page where the blocked action lives.
- [ ] Total permanent power from the six Keepings stays inside the budget in `ECONOMY.md` section 3.

## Out of scope

Stacking vows. Vow tiers. Timed vows.
