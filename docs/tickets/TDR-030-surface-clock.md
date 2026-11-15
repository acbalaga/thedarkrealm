# TDR-030: The Surface Clock

**Epic:** Retention · **Size:** M · **Depends on:** 004 · **Blocks:** 031

## Why

This is the differentiator (GDD P1). The enemy is daylight, so the real hour should matter. Four phases of the real day, each a different bonus, give a reason to open the game at different times and make the setting feel connected to the world the player is sitting in. Every phase is a bonus. There is no bad time to play.

## Spec

### 1. Phases

Computed from the device's local time. No location, no network. Boundaries in `data.js` as `SKY.PHASES`. *Starting values.*

| Phase | Local hours | Effect while present | Channel |
| --- | --- | --- | --- |
| Night | 20:00 to 05:00 | All Gloom ×1.25 | `gloom` |
| Dawn | 05:00 to 08:00 | Lanterns arrive twice as often | `lanternRate` |
| Day | 08:00 to 17:00 | Echoes ×1.25 | `echo` |
| Dusk | 17:00 to 20:00 | Lanterns arrive twice as often | `lanternRate` |

- `phaseAt(wallMs)` returns `{ id, endsAt }` using `new Date(wallMs).getHours()` and `getMinutes()`. It must take the time as an argument (from `env.wallNow()`) so tests can drive it. Daylight-saving shifts need no special handling: the phase is whatever the local clock says.
- Register a source `sky` that returns the phase's channel **only when `ctx.present` is true**. Away pay never includes sky bonuses (`ECONOMY.md` section 4).
- Unlocks with Sunshafts (`S.unlocked.shafts`). Before that the source returns nothing and the strip is hidden.

### 2. Interface

- **Sky strip** at the top of the scene box: glyph, phase name, effect in words, and time to the next phase. Example: "☾ Night above · Gloom ×1.25 · day in 3h 12m". Gold text per the colour rule (things from above).
- Glyphs: Night ☾, Dawn ◐, Day ☀, Dusk ◑.
- On a phase change while the game is open, one Whisper from `LORE_BIBLE.md` section 11.
- The scene background shifts subtly by phase: a CSS class on `#scene-box` (`sky-night`, `sky-dawn`, `sky-day`, `sky-dusk`) that changes one gradient stop and the opacity of a thin band of gold at the very top edge (brightest by Day, absent at Night). Keep it quiet. With motion off, switch without a transition.
- Tapping the strip opens the Almanac when TDR-031 exists. Until then it does nothing.
- Add a line to the stats list: "The surface: Night, Gloom ×1.25".

### 3. Codex

Page `surfaceclock` unlocks with the feature (`LORE_BIBLE.md` section 4).

### 4. Omens

Four, one per phase: be on the seat during each. Names: "Kept the Night", "Saw Them Wake", "Worked the Day Shift", "Saw Them Sleep". Not `mono` (they are one-time flags). Store `S.sky.phases = { night: 1, ... }` so the condition is checkable and adopt it against the four ids.

### 5. Integrity

A player can set the device clock to any hour. Accepted (`SECURITY_MODEL.md` section 4): each phase is a similar-sized bonus on a different channel, so there is no hour worth faking for long, and moving the clock back triggers the existing debt rule. Do not add detection.

Add one row to the README Fair play table saying exactly this.

## Tests

- `phaseAt` at each boundary minute (04:59, 05:00, 07:59, 08:00, 16:59, 17:00, 19:59, 20:00) and across midnight. Build the timestamps with `new Date(y, m, d, h, min).getTime()` so the test is time-zone independent.
- `endsAt` is the next boundary, including Night ending at 05:00 the next day.
- With `present: false` the `sky` source contributes nothing. An `away()` report at 02:00 equals one at 12:00 for the same state.
- Phase flags are set and the four omens fire.
- Simulator: policies must feed a realistic wall clock. Record the delta. Expected: a few percent, different by policy.

## Acceptance criteria

- [ ] The strip shows the right phase for the device's local time and updates within a second of a boundary.
- [ ] No bonus is applied to away time.
- [ ] Nothing reads location or makes a request.
- [ ] Phase is never conveyed by colour alone (glyph and name).
- [ ] Baseline delta recorded.

## Out of scope

Moon, solstices, eclipses (TDR-031). Sunrise and sunset by latitude.
