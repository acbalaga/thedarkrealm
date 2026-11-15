# TDR-032: Petitions and the Vigil

**Epic:** Retention · **Size:** M · **Depends on:** 004, 010 · **Blocks:** 035 (some Pane lights)

## Why

A daily reason to open the game that is a choice, not a login reward. Once a day the denizens state three intentions and the Regent grants one. Days are counted, never chained: missing a day costs nothing. (GDD P4, section 4.)

## Spec

### 1. Offer

- Unlocks at 25 total denizens. Codex page `petitions` on the first grant.
- `dayIndex(wallMs)`: local calendar day number, `Math.floor((ms − tzOffsetMs) / 86400000)` using `new Date(ms).getTimezoneOffset()`.
- A new offer is available when both hold:
  - `dayIndex(now) > S.pet.day` (last granted day), and
  - `S.played − S.pet.playedAt >= 21600` (6 hours of counted play time since the last grant; away time counts up to its cap). This is the clock rule from `SECURITY_MODEL.md` section 4.
- The three options are drawn with `rng('petition', S.pet.count)` from those the player qualifies for (see `needs`), without repeats. `S.pet.count` is the number granted so far, so reloading shows the same three, and so does changing the clock.
- The offer waits. It does not expire at midnight. A player who returns after three days gets one offer, not three.

### 2. The pool

`PETITIONS` in `data.js`. Text in `LORE_BIBLE.md` section 6. *Starting values.* Effects last until the next local midnight, or 12 hours of present play, whichever is later, tracked as `S.pet.until` in `played` seconds plus a wall day check. Simplest correct rule: the effect ends when `dayIndex(now) > S.pet.day`.

| id | needs | Effect |
| --- | --- | --- |
| `rake` | gleaner ≥ 1 | Wisp-Gleaner output ×10 |
| `ink` | scribe ≥ 1 | Hand gathering yields nothing today. All Gloom ×1.5. |
| `curtain` | weaver ≥ 1, shafts unlocked | Lampwarden timer +15 s |
| `watch` | warden ≥ 1, shafts unlocked | Host Might ×1.5 |
| `rehearse` | cantor ≥ 1 | Litanies return twice as fast (inert if TDR-022 is absent: then exclude from the pool) |
| `temper` | forge ≥ 1 | At once, lose 10% of current Gloom. Host Might ×2. |
| `sluice` | tide ≥ 1 | Tidewell output ×5 |
| `bait` | lanterns ≥ 5 | Lanterns arrive three times as often |
| `names` | rites unlocked | Echoes ×1.5 |
| `rest` | always | Away pace +25 points until the next grant (this one lasts until replaced, since its value is while away) |
| `tithe` | shafts unlocked | At once, gain Echoes equal to 20 seals of the current frontier shaft |
| `hands` | always | Hand gathering ×5 |

Each is a modifier map plus an optional `now` function for instant effects. Register one source `petition`. Petition factors share the ×3 combined ceiling with sky bonuses (`ECONOMY.md` section 4). Petition effects apply while present only, except `rest`.

### 3. Interface

- On the Seat, when an offer is waiting: a card "The denizens have intentions" with the three options as buttons, each showing the line and the effect in plain words. No modal. It can be left for later.
- After granting: the card collapses to an effect chip with the petition's short name and "until midnight".
- A badge on the Seat destination when an offer is waiting.
- Whisper on grant, from the lore bible.

### 4. Vigil

- `S.pet.count` is the Vigil: days on which a petition was granted.
- Show "Vigils kept: N" on the Seat card and in the stats list.
- Milestones at 3, 7, 14, 30, 60, 100. Each gives a permanent `gloom` factor so that all six multiply to ×1.3 (use ×1.045 each) and an Omen. Names: "Three Days Kept", "A Week of Evenings", "A Fortnight", "A Month Below", "Two Months Below", "A Hundred Vigils". Codex page `vigil` at 7.
- There is no streak, no "you missed a day", and no display of days missed.

### 5. Save and audit

- `S.pet = { day, count, playedAt, active, offer }`. `active` is a petition id or `''`. `offer` is not stored: it is derived from the seed and count.
- `adopt()`: ids matched against the table. `day` at most today's index plus 1.
- `audit()`: `count <= played / 21600 + 1`. Over that, clamp and count a fix.

## Tests

- No offer before 25 denizens. An offer on day 1. After granting, none until both the day changes and 6 hours of `played` pass. Test each condition failing alone.
- Advancing the fake wall clock by 10 days with no play grants one offer.
- Same seed and count gives the same three. Options the player does not qualify for never appear.
- `temper` removes exactly 10% of current Gloom and the audit still passes afterward.
- Effects end when the local day changes. `rest` persists.
- Milestone factors apply once each.
- Simulator: policies grant the option with the best value for their style each day. Record the delta.

## Acceptance criteria

- [ ] At most one grant per real day for an honest clock, and no more than one per 6 hours of counted play for any clock.
- [ ] The offer cannot be rerolled.
- [ ] Nothing is lost by not playing.
- [ ] The card is usable at 360 px and by keyboard.
- [ ] Baseline delta recorded.

## Out of scope

Petition chains, denizen favour meters, weekly quests.
