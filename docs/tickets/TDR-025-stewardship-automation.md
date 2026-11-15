# TDR-025: Stewardship, bulk buying and late-game automation

**Epic:** Mechanics · **Size:** S · **Depends on:** 004 · **Blocks:** none

## Why

By the fifth fathom the opening is a chore: bind the same denizens in the same order, perform the same Rites one click per level. The Steward perk only covers Workings. Automation is the standard reward for prestige depth and it is cheap to add. (REVIEW M-9.)

## Spec

### 1. Rites in bulk

- The Rites page gets the same ×1, ×10, ×25, Max segment the Denizens page has. Store as `S.opts.buyRite`.
- `riteCostN(r, level, k)`: geometric sum `base × g^level × (g^k − 1) / (g − 1)`, rounded up, through the `riteCost` channel. `maxRite(r)` mirrors `maxBuy`, and respects `r.max`.
- The button shows "Perform ×k" and the total.

### 2. Three new perks

Add to `PERKS`. *Starting costs.* Place them in cost order.

| id | Cost | Name | Effect |
| --- | --- | --- | --- |
| `usher` | 25 | The Usher | Unlocks auto-bind. Each denizen row gains a toggle. Twice a second, for each toggled denizen from cheapest to dearest, bind one if its cost is at most 10% of current Gloom. |
| `precentor` | 90 | The Precentor | Unlocks auto-rite. Each Rite row gains a toggle. Twice a second, perform one level of each toggled Rite if its cost is at most 25% of current Echoes. |
| `chamberlain` | 160 | The Chamberlain | After a failed Lampwarden, the Host returns to the frontier as soon as it could win in 60% of the allowed time (was 80%). Shafts already sealed this fathom below the frontier are skipped at 10 per second. |

- Toggles are stored in `S.auto = { den: { id: true }, rite: { id: true } }`, adopted against known ids. They persist across Unlightings.
- Automation runs in `slowChecks()` next to the Steward, during present time only. It does not run in `away()`, because away pay is already a rate. Say so on the perk card: "while you are on the seat".
- Respect vows: auto-bind stops at 50 under `few`, auto-rite does nothing under `silence`.
- The 10% and 25% thresholds are constants in `data.js`. They keep automation from draining the pool the player is saving.

### 3. Small conveniences

- Max mode label fix: when nothing is affordable, the button reads "Bind" and shows the single next price (REVIEW B-3). If TDR-051 has landed this is already done there. Do not do it twice.
- "Complete all" button on the Workings page when two or more are affordable. It buys from cheapest up.
- Remember the last sub-page per destination.

### 4. Save and audit

- New perks are covered by the existing perk audit (cost sum against `glassTotal`).
- `S.auto` grants nothing by itself. No audit.

## Tests

- `riteCostN` equals the sum of single costs for k from 1 to 30 at several levels. `maxRite` never exceeds what is affordable or the cap.
- Auto-bind buys nothing when the cheapest cost is above 10% of Gloom, and buys in cheapest-first order when below.
- Auto-rite respects the cap on `sleep` and `lure`.
- Automation is inert without the perk even if `S.auto` has toggles (a forged save).
- Simulator: allow policies to buy and use the new perks. Record the delta. Expect later fathoms to shorten for `casual` and `active`.

## Acceptance criteria

- [ ] A fathom can be restarted to its previous denizen counts with no manual binding once The Usher is owned and toggles are set.
- [ ] Toggles are reachable by keyboard and have accessible names ("Bind Wisp-Gleaners automatically").
- [ ] Automation never spends below the stated reserve.
- [ ] Total perk cost is updated wherever it is quoted (`ECONOMY.md` section 1, `REVIEW.md` is historical and stays).

## Out of scope

Automatic Unlighting. Automation during away time.
