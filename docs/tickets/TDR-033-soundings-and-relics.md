# TDR-033: Soundings and Relics

**Epic:** Retention · **Size:** L · **Depends on:** 004, 010 · **Blocks:** 035

## Why

Timed expeditions are the most reliable "come back in a few hours" hook in the genre, and a collection gives a long goal that is not a bigger number. The Sunless Sea is already in the Codex with something pulling at the buckets. Lower a line and see what comes up. (GDD section 4.)

## Spec

### 1. Soundings

Unlocks when the first Tidewell is bound. Codex page `soundings` on the first return.

`SOUNDINGS` in `data.js`. *Starting values.*

| id | Name | Line out for | Unlock | Cost to lower | Draws from sets |
| --- | --- | --- | --- | --- | --- |
| `shallows` | The Shallows | 1 h | with Soundings | 60 s of current Gloom per second | Drowned Table, Lamp Room |
| `shelf` | The Shelf | 4 h | 25 Tidewells | 10 min of Gloom per second | Surveyor's Kit, Choir Loft |
| `trench` | The Trench | 12 h | first Unlighting | 1 h of Gloom per second | Queen's Things, Sleeper's Bed |

- One line at a time. A second line is a new perk: `twolines`, 40 Nightglass, "A Second Line", "Two Soundings can be out at once."
- State per line: `{ id, left }` where `left` is seconds remaining.
- **Time accrual** (`SECURITY_MODEL.md` section 4): `left` decreases by `dt` in `step()`, and in `away()` by the full away seconds after debt is paid, **not** capped by the away cap. A 12 hour line finishes after 12 real hours even with an 8 hour away cap.
- When `left` reaches 0 the line is "slack" and waits to be drawn up. It does not expire.
- Drawing up resolves the result and frees the line. Lines survive an Unlighting (the Sea is under every fathom).

### 2. Results

On drawing up, using `rng('sounding', S.snd.done)`:

1. Choose one of the depth's two sets at random.
2. Relic chance: `0.35 + 0.15 × S.snd.dry`, capped at 1, where `dry` is consecutive Soundings at this depth without a new relic (stored per depth).
3. On success: pick a relic from that set uniformly. If the player already has it, it is a duplicate: pay Echoes (below) and count it as a miss for `dry`. If new: add it, reset `dry`.
4. On a miss: pay Echoes.
5. If both sets at this depth are complete, always pay Echoes at double rate.

Echo payout: seals of the current frontier shaft worth `depth hours × 6` (so 6, 24, 72 seals), through the `echo` channel.

`S.snd.done` increments on every draw. Whispers from `LORE_BIBLE.md` section 7.

### 3. Relics

24 relics in 6 sets of 4, names and lines in the lore bible. `RELICS` in `data.js` with `{ id, set, name, line }`, and `RELIC_SETS` with `{ id, name, stat, each, bonus }`. *Starting values, sized to the budget in `ECONOMY.md` section 3.*

| Set | Each relic | Set complete |
| --- | --- | --- |
| Drowned Table | Echoes +2% | Echoes ×1.25 |
| Surveyor's Kit | Might +2% | Might ×1.25 |
| Choir Loft | Gloom +2% | Gloom ×1.25 |
| Lamp Room | Lantern yields +2% | Lantern yields ×1.25 |
| Queen's Things | Nightglass gained +2% | Nightglass gained ×1.1 |
| Sleeper's Bed | Away pace +1 point | Away pace +6 points (10 in all) |

Relics are permanent. Register one source `relics`. Completing a set unlocks its Codex page and an Omen named for the set.

### 4. Interface

A Soundings sub-page (Host destination after TDR-050; a tab until then).

- **Lines**: for each line slot, either a picker of the three depths (name, duration, cost, what it may bring up in words: "things from a table, things from a lamp room") with "Lower the line", or a progress bar with time left and the clock time it will be slack ("slack at 03:40"), or "Draw up" when slack.
- **The Shelves**: six set panels, each with four slots. Found relics show name and line. Unfound show a dim outline and "not yet found". A set shows its bonus, greyed until complete.
- Badge on the destination and a toast when a line goes slack while the game is open.
- The Seat shows one line of status: "The line is down, 2h 14m" or "The line is slack".

### 5. Save and audit

- `S.snd = { lines: [{ id, left }], done, dry: { shallows, shelf, trench } }`, `S.relics = { id: 1 }`.
- `adopt()`: at most 2 lines (1 without the perk), known ids, `left` clamped to the depth's duration.
- `audit()`: relic count `<= done`. `done <= played / 3600 + 2`. A Trench relic requires `unlightings >= 1`. On failure remove relics from the last in table order and count a fix.

## Tests

- Lowering deducts the cost and refuses when unaffordable or when no slot is free.
- `left` falls by `dt` in `step` and by full seconds in `away` beyond the cap. Debt is respected.
- A slack line waits across any length of time and across an Unlighting.
- Result determinism for a given seed and `done`. Bad-luck protection reaches certainty after 5 dry Soundings.
- Duplicates pay Echoes and never add a second copy.
- Set completion applies the bonus once.
- Audit strips relics a save could not have.
- Simulator: policies keep the longest affordable line out at all times. Report days to complete each set and all six. Target: all six in 30 to 90 days for `casual`. Tune chances if outside.

## Acceptance criteria

- [ ] A line lowered before closing the game is slack after the stated real time, on return.
- [ ] Results cannot be rerolled by reloading before drawing up.
- [ ] The page states when to come back as a clock time.
- [ ] Relic bonuses stay inside the budget.
- [ ] Baseline delta and completion times recorded.

## Out of scope

Relic upgrades, trading, a fourth depth, events on the line.
