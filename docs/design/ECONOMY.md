# Economy reference

Current formulas, the modifier model new systems must use, and the budget they share. Numbers marked *starting value* are untested and must be tuned with the simulator (TDR-003).

## 1. Current formulas (commit `1003666`)

| Quantity | Formula | Source |
| --- | --- | --- |
| Denizen cost for k more at n owned | `ceil(cost × costMult × 1.15^n × (1.15^k − 1) / 0.15)` | `denCost()` |
| Denizen output each | `rate × 2^(tiers owned) × gMult` | `recalc()` |
| Gloom multiplier | `(1 + 0.05 × glassTotal) × (1 + 0.01 × omens) × 1.12^listen × 1.5^(realm workings) × perks × (5 if Deep Hush)` | `recalc()` |
| Hand gather | `(2 if Cupped Hands) × 1.5^hands × gMult + 2% × denGps per Shadow working` | `recalc()` |
| Host Might | `(1 + Σ count_i × 3^i) × (1 + 0.05 × glassTotal) × 1.2^edge × perks × (5 if Bared Teeth)` | `recalc()` |
| Sunshaft radiance | `12 × 1.25^(n−1)`, ×6 on every tenth | `shaftMaxHp()` |
| Echoes per seal | `ceil((1 + floor(n^1.4 / 4)) × (5 on bosses) × echoMult)` | `shaftReward()` |
| Rite cost | `ceil(base × g^level)` | `riteCost()` |
| Nightglass on Unlighting | `floor((runGloom / 1e9)^0.3)` | `glassGain()` |
| Away pace | `min(1, 0.5 + 0.1 × sleep)` for up to 8 h (24 h with Unsleeping) | `away()` |
| Lantern interval | `(70 + rand × 80) × 0.9^lure` seconds, 14 s on screen | `lanternDelay()` |

Useful calibration: radiance grows ×1.25 per shaft, so **×9.3 Might is worth about 10 shafts** and ×2 is worth about 3.

Perk costs sum to 3,612 Nightglass. One run yielding 2,500 needs about 2e20 Gloom.

## 2. The modifier model (built in TDR-004)

Every bonus, old and new, resolves into one of these channels. `recalc()` multiplies the channel, and `audit()` reads the same function, so the two cannot drift.

| Channel | Meaning | Existing contributors |
| --- | --- | --- |
| `gloom` | All Gloom | Nightglass, omens, Deep Listening, realm workings, Deep Vein, Queen, Further, Deep Hush |
| `might` | Host Might | Nightglass, Sharpened Dark, Keen, Queen, Further, Bared Teeth |
| `echo` | Echoes gained | Remembered Names, Halls, Queen |
| `hand` | Hand gather base | Cupped Hands, Many Hands |
| `cost` | Denizen cost | Thrifty Dark |
| `riteCost` | Rite cost | none yet |
| `glass` | Nightglass gained | none yet |
| `lanternRate` | Lantern frequency | Baited Dark |
| `lanternLife` | Seconds a lantern stays | none yet |
| `awayPace` | Added to away pace, capped at 1 | Long Sleep |
| `bossTime` | Lampwarden seconds | none yet |
| `den.<id>` | One denizen's output | tier workings |

A source is a function `mods(S, env)` returning `{ channel: factor }`. Sources are registered in a fixed list. Multiplicative channels multiply. `awayPace` and `bossTime` add.

Rule: UI code never computes a bonus. It reads `C`.

## 3. Budget for new permanent bonuses

New systems add permanent power. Without a cap the existing curve (shafts, perk prices) collapses. Targets at **full completion of everything in this plan**:

| Channel | Total from new permanent sources | Roughly equals |
| --- | --- | --- |
| `gloom` | ≤ ×8 | less than two Further Down perks |
| `might` | ≤ ×6 | about 8 shafts |
| `echo` | ≤ ×4 | |
| `glass` | ≤ ×1.5 | |

Allocation (*starting values*):

| Source | gloom | might | echo | glass | Other |
| --- | --- | --- | --- | --- | --- |
| Relics, 24 at +2% of their set's stat, six set bonuses | ×1.35 | ×1.35 | ×1.35 | ×1.2 | lanterns ×1.25 yield, away pace +0.1 |
| Vow Seals, six | | | | ×1.1 | see TDR-024 |
| The Pane, 24 lights at ×1.03 all three | ×2.03 | ×2.03 | ×2.03 | | |
| Eclipses witnessed, +2% each, cap 10 | ×1.22 | ×1.22 | ×1.22 | | |
| Vigil milestones | ×1.3 | | | | |
| Elder Shafts denizens and perks | ×1.7 | ×1.7 | | | |

Product per channel stays inside the cap. If a ticket needs more, take it from another row.

## 4. Temporary and situational bonuses

These are not in the permanent budget but have their own ceiling: **no more than ×3 on any channel from all temporary sky and petition effects combined, excluding lantern buffs.**

| Source | Effect (*starting values*) | Duration |
| --- | --- | --- |
| Surface Clock, Night | gloom ×1.25 | while present, 20:00 to 05:00 local |
| Surface Clock, Day | echo ×1.25 | while present, 08:00 to 17:00 |
| Surface Clock, Dusk and Dawn | lanternRate ×2 | 17:00 to 20:00, 05:00 to 08:00 |
| Moonless Night | glass ×1.1 | about 2 days per month |
| Lidless Moon | echo ×2 on Lampwardens only | about 2 days per month |
| Longest Night, Longest Day | gloom ×2, echo ×2 | 3 days each per year |
| Equinox | gloom ×1.25 and echo ×1.25 | 3 days each, twice a year |
| Eclipse | Eclipse Choir output ×10 | the day |
| Petition | one effect from the table in TDR-032, or a trade | until local midnight |
| Current | one boon, one bane | one fathom |

Sky bonuses apply only while the game is open (in `step()`, not `away()`). This keeps away pay simple and removes any reason to move the device clock while away.

Omens stay at +1% each, additive. Their job is recognition, not power. Do not rescale them.

## 5. Rules for adding numbers

1. Put the number in `data.js`. Name it.
2. Register it as a modifier source. Do not add an `if` to `recalc()`.
3. If it changes costs, the audit must use the same function to recompute what was spent.
4. Run the simulator before and after. Record time to: first Sunshaft, first Rite, first Unlighting, Sunshaft 50, 100, 150, all perks. Put both rows in the PR description. A milestone moving more than 20% needs a reason.
5. Anything granted per real day must also require 6 hours of `played` since the last grant (see `SECURITY_MODEL.md` section 4).
