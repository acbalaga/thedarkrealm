# TDR-022: Litanies, active abilities for the Host

**Epic:** Mechanics · **Size:** M · **Depends on:** 004 · **Blocks:** none

## Why

A Lampwarden is a 45 second wait. The player has no way to act on a fight they are watching. Three short abilities with long cooldowns give a present player something to time, without giving an absent player anything to miss. (REVIEW M-4, GDD P2.)

## Spec

### 1. The three Litanies

Unlock all three when Rites unlock (`S.unlocked.rites`). Data in `data.js` as `LITANIES`. *Starting values.*

| id | Name | Effect | Lasts | Cooldown |
| --- | --- | --- | --- | --- |
| `teeth` | Litany of Teeth | Host Might ×3 | 15 s | 300 s |
| `breath` | Litany of the Held Breath | The Lampwarden's timer does not run. No effect on ordinary shafts. | 10 s | 480 s |
| `undertow` | Litany of the Undertow | At once, gather 90 s of current Gloom per second (unbuffed rate: use `C.gps` divided by the Deep Hush factor if Deep Hush is active) | instant | 420 s |

Rules:

- State: `S.lit = { teeth: { on: 0, cd: 0 }, breath: {...}, undertow: {...} }`. `on` is seconds of effect left, `cd` is seconds of cooldown left. Both count down in `step(dt)`. In `away(sec)`, `on` is zeroed and `cd` is reduced by the full away seconds.
- A Litany can be spoken when `cd === 0`. Speaking sets `on` and `cd`.
- `teeth` registers a modifier source on the `might` channel while `on > 0`. It stacks multiplicatively with Bared Teeth.
- `breath`: in `fight()`, while `on > 0` and the shaft is a Lampwarden, do not subtract from `bossTime`. Handle a `dt` that spans the end of the effect by splitting the interval.
- Cooldowns reset to zero on Unlighting.
- Require a trusted event and the key-repeat guard from TDR-011.

### 2. Rite that feeds them

Add one Rite: `breathing`, "Rite of the Long Breath", "Litanies return 5% sooner per level.", base 30, growth 2.2, max 6. Cooldown is multiplied by `0.95^level`.

### 3. Interface

- A row of three round buttons at the bottom of the scene box (above the hint text), 48 px each. Each shows a glyph, and a radial or bar cooldown fill. Disabled while cooling. The accessible name includes the state: "Litany of Teeth, ready" or "Litany of Teeth, 3 minutes 20 seconds".
- When in effect, an effect chip shows the name and seconds left.
- The Sunshafts page shows the same three buttons under the bars, so they are usable while watching the fight.
- Hotkeys `1`, `2`, `3` when focus is not in a text field.
- First use of any Litany unlocks the Codex page `litanies` (`LORE_BIBLE.md` section 4).

### 4. Save and audit

`S.lit` adopted per known id with `num` clamps (`on` 0 to its duration, `cd` 0 to its base cooldown). Nothing to audit: these grant no stored value directly, and `undertow` Gloom flows through `gain()` and the existing ceilings.

## Tests

- Speaking when `cd > 0` does nothing.
- `teeth` multiplies `C.might` by 3 for exactly 15 simulated seconds.
- `breath`: a Lampwarden that would fail at 45 s with the Host needing 50 s is sealed when `breath` is spoken at any point in the first 35 s. A single `step(60)` call with `breath` active handles the boundary correctly.
- `undertow` during Deep Hush pays the unbuffed 90 s.
- Away of 1,000 s clears effects and reduces cooldowns by 1,000 s, not below zero.
- The new Rite shortens the cooldown.
- Simulator: add Litany use to `active` (use `teeth` and `breath` on any Lampwarden the Host cannot otherwise beat, `undertow` on cooldown). Record the delta.

## Acceptance criteria

- [ ] All three work by pointer, touch and keyboard.
- [ ] A Litany cannot be triggered by a synthetic event or by holding a key.
- [ ] No Litany has any effect during away time.
- [ ] Buttons meet the 44 px target and have visible focus.
- [ ] Baseline delta recorded. The `idle` policy must not change.

## Out of scope

More than three Litanies. Upgrading Litanies with Nightglass.
