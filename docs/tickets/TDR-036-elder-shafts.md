# TDR-036: The Elder Shafts

**Epic:** Retention · **Size:** M · **Depends on:** 003, 004 · **Blocks:** none

## Why

After the First Lamp the shafts keep counting but nothing names them and nothing new unlocks. Players who reach the ending have shown they will keep going. Give them fifty more shafts with a reason, two more denizens, and a last page. This is content, not a new system. (REVIEW M-6.)

## Read first

Run the simulator (TDR-003) with the plan's other systems in place. If the baseline shows Sunshaft 150 already takes more than 45 days for `casual`, **do not build this ticket yet**. Record that in `docs/tickets/README.md` and stop. Content past an ending nobody reaches is waste.

## Spec

### 1. Shafts 151 to 200

- `FINAL_SHAFT` stays 150. The first ending is unchanged.
- Add `DEEP_SHAFT = 200`.
- Shafts above 150 are "Elder Shaft N" in `shaftName()`. Lampwardens at 160, 170, 180, 190, 200 use the names in `LORE_BIBLE.md` section 10. Add them to `BOSSES`.
- Radiance formula unchanged. Echo reward unchanged.
- The Sunshafts page lede gains one sentence once `bestShaft >= 150`: "Past the First Lamp the shafts are older than the Concord."
- Sealing 151 unlocks Codex page `elder`. Sealing 200 unlocks `root` and shows a short, dismissable modal titled "The Hole in the Field" with the `root` text and one button, "Come home".
- Omens: add 175 ("Older Chains") and 200 ("Under the Seat") to the Sunshaft set.

### 2. Two denizens

Add to `DENIZENS` after the Sleeper Below. Names, glyphs, tools and descriptions in the lore bible. *Starting values, following the existing progression (cost ×~22, rate ×~7.4 per step).*

| id | Name | Base cost | Base rate | Shown when |
| --- | --- | --- | --- | --- |
| `bell` | Drowned Bell | 7e13 | 5.2e7 | `bestShaft >= 150`, then the usual visibility rule |
| `wright` | Pane-Wright | 1.8e15 | 3.9e8 | 12 Pane lights lit (if TDR-035 is absent: `unlightings >= 8`) |

- They take Might weights `3^10` and `3^11` like the others.
- Workings tiers apply to them automatically through `UPG_TIERS`.
- Codex page `bell` on the first Drowned Bell. The Pane-Wright has no page: its description carries it.
- The "Full Attendance" and "Standing Room Only" omens say "every denizen". Decide once: they count only denizens currently **visible** to the player, so an earned omen is not lost and an unearned one is not made impossible. `pruneOmens` does not re-check these (they are not `mono`), so earned omens stay.
- The audit loop iterates `D.DENIZENS`, so it covers them. Add a rule: `bell` requires `bestShaft >= 150`.

### 3. Two perks

| id | Cost | Name | Effect |
| --- | --- | --- | --- |
| `older` | 5000 | Older Than Lamps | All Gloom and Might ×1.7 |
| `patient` | 1200 | The Patient Dark | The realm works up to 48 hours while you are away. Requires Unsleeping. |

`older` is the whole "Elder Shafts" row of the permanent budget (`ECONOMY.md` section 3). Do not add further multipliers here.

### 4. Number formatting

Values will pass 1e33. `fmt()` already falls back to scientific notation after "Dc". Extend `SUFFIX` with `'Ud', 'Dd', 'Td', 'Qad', 'Qid'` so named notation reaches 1e48.

## Tests

- `shaftName` for 150, 151, 160, 200.
- Denizen visibility rules for both.
- "Full Attendance" logic with and without the new denizens visible.
- Audit strips Drowned Bells from a save with `bestShaft < 150`.
- `fmt(1e36)` and `fmt(1e47)` use the new suffixes.
- Simulator: days from Sunshaft 150 to 200 for each policy. Target 10 to 30 days for `casual`. Tune only the two new denizens' numbers and the `older` perk to hit it.

## Acceptance criteria

- [ ] The first ending still triggers at 150 exactly once.
- [ ] Old saves that are past 150 load, keep their progress, and see the new content.
- [ ] Sunshaft 200 is reachable in the simulator.
- [ ] Baseline delta recorded.

## Out of scope

Shafts past 200. A third currency. A second prestige layer.
