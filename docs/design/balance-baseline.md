# Balance baseline

Measured with `tools/sim.js` (TDR-003) on the build at the end of TDR-002. Seed 1, 60 simulated days, three player policies. The simulator drives the real engine with a fake clock, so away time, the 8 hour cap and the away pace behave as in play. It steps 5 seconds at a time while the player is present.

Regenerate with `npm run sim -- --days 60 --seed 1`. Same seed, same output.

**Elapsed** is wall time since the first launch. **Present** is time the policy was actually at the screen. **Played** is the game's own `played` counter, which includes credited away time.

## Answers

| Question | idle | casual | active |
| --- | --- | --- | --- |
| First Unlighting that yields Nightglass is possible (present) | never | 15 min | 25 min |
| First Unlighting under the simulator's rule (present) | never | 10.9 h | 17.0 h |
| First Unlighting under the rule (elapsed) | never | 11.9 days | 8.8 days |
| Sunshaft 150 (present) | never | 12.6 h | 18.3 h |
| Sunshaft 150 (elapsed) | never | 13.8 days | 9.3 days |
| All perks (present) | never | 12.1 h | 18.0 h |
| All perks (elapsed) | never | 13.4 days | 9.3 days |

"Possible" is the first moment `glassGain()` is at least 1, which needs 1e9 Gloom in the fathom. The rule row is when the simulator's Unlighting rule fires: Nightglass per hour has fallen to 70 percent of its peak for the fathom, and the yield is at least 1 (and at least 20 percent of lifetime Nightglass after the first).

## What is surprising

1. **The idle policy never starts.** With no hand gathering the realm has no income to buy a first Wisp-Gleaner, so 60 days of 3 minute check-ins produce nothing. The first gather by hand is a hard gate. This is a finding about the opening, not a simulator fault.
2. **A Lampwarden wall stops the first fathom.** Casual reaches Sunshaft 99 inside the first two days, then spends days at Lampwardens 100 to 109 with Gloom per second flat. The first fathom lasts 10 days, and under the 70 percent rule that is when the player lets go. Nobody in a real game would wait that long if the game told them Nightglass was available after 15 minutes.
3. **Unlighting is first possible at 15 minutes (casual) and 30 minutes (active) of presence, well under the 60 to 120 minute target.** Whether that is too early or the target should move is an owner decision (follow-up note in `docs/tickets/README.md`).
4. **After the first fathom the loop collapses.** Casual makes 33 Unlightings in 60 days. Fathoms 3 to 5 last 1.5 hours elapsed and 5 minutes present. Once all 13 perks are bought on day 11, the long game is the Nightglass multiplier, not new content.
5. **All perks and Sunshaft 150 land inside two days of each other.** Content is exhausted by day 12 (casual) and day 18 (active), before the day 14 line for casual. The Pane (TDR-035) is meant to take 30 to 120 days, so the current endgame is far short of that.
6. **Milestones under 5 minutes apart.** The first Sunshaft, first Rite and Sunshaft 10 are observed in the same 2 to 5 minute check-in. This is partly the 7 hour overnight gap before the first session, which gives the realm its away credit at once.

## Change log

| Ticket | What changed | casual first Unlighting possible | casual first Unlighting (rule) | active first Unlighting possible | active first Unlighting (rule) |
| --- | --- | --- | --- | --- | --- |
| TDR-003 | First baseline | 15 min | 9.2 h | 30 min | 34.5 h |
| TDR-021 | Lantern kinds, Processions, streaks | 15 min | 12.8 h | 25 min | 20.0 h |
| TDR-022 | Litanies and the Rite of the Long Breath | 15 min | 12.8 h | 28 min | 25.0 h |
| TDR-030 | Surface Clock; simulator clock now starts at local midnight (UTC) | 15 min | 8.7 h | 26 min | 22.5 h |
| TDR-031 | Almanac: moon, solstices, eclipses | 15 min | 8.7 h | 26 min | 21.0 h |
| TDR-032 | Petitions and the Vigil | 15 min | 8.7 h | 25 min | 19.0 h |
| TDR-033 | Soundings and Relics | 15 min | 10.9 h | 25 min | 17.0 h |
| TDR-025 | Bulk Rites and three automation perks | 15 min | see table | 25 min | see table |
| TDR-023 | Currents | 15 min | see table | 25 min | see table |
| TDR-024 | Vows and Keepings | 15 min | unchanged | 25 min | unchanged |

TDR-024: the first-fathom milestones are untouched (vows start at the fourth Unlighting). **Every vow is completable**: both `casual` and `active` keep all six, one fathom each, within about a tenth of a day of each other (rows `Vow kept: ...` in the raw output), because after the fourth Unlighting a fathom with the Remembered Road and the other perks reaches the goal quickly. That also means the vows are cheap for this policy: the ticket's goals (30 to 70) may be too low for a late-game realm. Owner decision: raise the goals, or accept that the vows pay out within a few hours once unlocked.

TDR-023: the policies choose Heavy after a fathom over six hours and otherwise the offered current with the highest Gloom times Might. Sunshaft 150 and all perks move by under 10 percent for both policies (casual 12.6 h and 12.1 h present, active 18.3 h and 18.0 h). The first fathom has no current, so the first Unlighting figures do not change.

TDR-025: the three new perks (Usher, Precentor, Chamberlain) are bought by the same cheapest-perk rule and their toggles are switched on by the policies. Sunshaft 150 and all perks arrive slightly later than before for `casual` (12 h against 11.7 h present) and about 10 percent later for `active`: every added perk is one more purchase before the full set, and automation matters mostly after the first fathoms, which these milestones do not measure. See the table for exact values.

TDR-033: relic completion with the simulator's policy (it keeps the longest affordable line out and draws it up at every visit). `casual` completes all six sets in 36 days of elapsed time (33 hours present), inside the 30 to 90 day target, so no chances were tuned. `active` completes all six in about 24 days. Each set's time is in the raw output below as `Relic set: ...`. The rule-driven first Unlighting moved by under 25 percent in each policy, within the noise this measure has shown.

TDR-032 changes `casual` and `idle` not at all in the rule-driven first Unlighting (both play less than a day before they have 25 denizens and then meet one petition a day) and `active` by about 10 percent, within the noise. `idle` still never starts: it has no hand gathering, so it never binds a first denizen, so it never reaches 25.

TDR-031 moved the baseline very little, as expected: the 60 simulated days run from 1 January 2026, so they meet two Moonless Nights and two Lidless Moons (Echoes x2 on Lampwarden seals) and no solstice, equinox or eclipse.

TDR-030 adds the sky bonuses and, in the same step, makes the simulator's wall clock start at midnight so policies meet real phases of the day. The time to first possible Unlighting barely moves (casual 15 min, active 28 to 26 min). The rule-driven figure moves by up to 30 percent (casual 12.8 h to 8.7 h), which is within the noise this measure has shown at every ticket; the sky bonus is worth about a quarter on Gloom at night and on Echoes by day, so a few percent was expected and the rest is the 70 percent rule.

TDR-022 made `active` slower, not faster, in this measurement (28 minutes to first possible, 25 h by the rule, against 25 min and 20 h). The cause is the simulator's policy, not the Litanies: it spends Echoes on the cheapest Rite, and the new Rite of the Long Breath (base cost 30) is now among the cheapest, so `active` buys levels of a Rite that does nothing for Gloom or Might. The Litanies themselves (Teeth and the Held Breath on Lampwardens, the Undertow on cooldown) are in the `active` policy and help it, but not by more than that policy cost. `casual` and `idle` are unchanged, as the ticket requires. If the Rite choice matters, make the policy skip rites that do not feed the economy.

TDR-021 moved the rule-driven first Unlighting by more than 20 percent in both directions (casual later, active earlier). That number is the time at which Nightglass per hour has fallen to 70 percent of its peak, which is sensitive to the order in which random lantern outcomes arrive, and the new kinds draw random numbers the old build did not. The time at which an Unlighting first yields Nightglass, which does not depend on that rule, moved by 0 minutes for casual and by 5 minutes for active. `active` gets the faster start the ticket expects (Processions and Votive Lanterns pay more per minute of attention) and `idle` does not move.

The notes above describe the TDR-003 run and are left as written.

## Raw output

```
Policy idle, 60 days, seed 1

Milestone                                    Elapsed   Present    Played

Fathom    Duration   Present     Glass   Glass/h  Deepest

End: 0 Unlightings, Sunshaft 0, 0 Nightglass, 18.0h present of 59.8d

Policy casual, 60 days, seed 1

Milestone                                    Elapsed   Present    Played
First Sunshaft sealed                           7.0h       55s      7.0h
First Rite                                      7.0h       55s      7.0h
Sunshaft 10                                     7.0h       80s      7.0h
Sunshaft 50                                    10.0h       11m     10.0h
Unlighting first possible (yield >= 1)         11.5h       15m     11.5h
Relic set: The Surveyor's Kit                   3.5d      3.0h      3.4d
Sunshaft 100                                    3.5d      3.0h      3.4d
Relic set: The Choir Loft                       7.5d      6.7h      7.2d
First Unlighting                               11.9d     10.9h     11.5d
Perk: The First Absence                        11.9d     10.9h     11.5d
Perk: Keen Dark                                11.9d     10.9h     11.5d
Perk: Deep Vein                                11.9d     10.9h     11.5d
Perk: Echoing Halls                            11.9d     10.9h     11.5d
Perk: Unsleeping                               11.9d     10.9h     11.5d
Perk: Bound Hands                              11.9d     10.9h     11.5d
Perk: The Usher                                11.9d     10.9h     11.5d
Perk: Thrifty Dark                             11.9d     10.9h     11.5d
Perk: A Second Line                            11.9d     10.9h     11.5d
Perk: Remembered Road                          11.9d     10.9h     11.5d
Perk: The Steward                              11.9d     10.9h     11.5d
Perk: The Precentor                            11.9d     10.9h     11.5d
Perk: Rites Remembered                         12.3d     11.1h     11.9d
Perk: The Chamberlain                          13.3d     11.9h     12.9d
Perk: Lantern-Hunger                           13.3d     11.9h     12.9d
Perk: The Queen's Reflection                   13.3d     11.9h     12.9d
Vow kept: Vow of Silence                       13.4d     12.0h     12.9d
Perk: Further Down                             13.4d     12.1h     13.0d
All perks                                      13.4d     12.1h     13.0d
Vow kept: Vow of Empty Hands                   13.4d     12.1h     13.0d
Vow kept: Vow of the Open Door                 13.4d     12.1h     13.0d
Relic set: The Lamp Room                       13.5d     12.2h     13.1d
Vow kept: Vow of Few                           13.5d     12.2h     13.1d
Vow kept: Vow of the Short Chain               13.5d     12.2h     13.1d
Vow kept: Vow of the Unlit                     13.5d     12.3h     13.1d
Sunshaft 150                                   13.8d     12.6h     13.4d
Relic set: The Drowned Table                   13.9d     12.8h     13.5d
Relic set: The Queen's Things                  29.4d     26.7h     28.9d
Relic set: The Sleeper's Bed                   33.8d     30.9h     33.4d
All six relic sets                             33.8d     30.9h     33.4d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1            11.9d     10.9h       452      1.58      109
2             9.1h        8m        91     10.05      116
3            23.9h       52m       968     40.42      119
4             1.5h        5m      1429    952.67      129
5             1.5h        5m      1558   1038.67      129
6               3m        3m      1005  24120.00      144
7              88m        3m      3478   2384.91      144
8               4m        4m      1801  28189.57      149
9              86m       70s      4235   2948.94      149
10            1.5h        5m      5934   3956.00      149
11            1.5h        5m      8254   5502.67      149
12            1.5h        5m      8794   5862.67      149
13            1.5h        5m      9129   6086.00      149
14            1.5h        5m     12790   8526.67      159
15            1.5h        5m     13184   8789.33      159
16            9.0h        5m     26118   2902.00      159
17            1.5h        6m     22131  14538.61      166
18            3.0h        9m     31638  10624.70      169
19            3.0h       10m     34969  11656.33      169
20            4.5h       15m     43151   9589.11      179
21           12.0h       15m     68043   5670.25      179
22            4.5h       17m     60505  13363.07      179
23            7.5h       25m     73518   9793.33      179
24           15.0h       25m     86641   5774.46      179
25            7.5h       27m    106654  14144.57      179
26           14.9h       20m    127377   8536.86      179
27           24.0h       55m    151035   6292.40      189
28           33.0h       85m    182056   5517.31      189
29            2.6d      2.3h    217445   3451.51      189
30           34.5h      1.5h    261176   7567.58      189
31            2.6d      2.2h    316012   5017.06      199
32            3.3d      3.2h    376577   4734.01      199
33            3.6d      3.0h    467548   5471.42      199
34            4.3d      4.1h    547170   5286.67      199
35            4.2d      4.0h    655247   6515.73      199
36            5.5d      4.8h    788457   5976.05      199
37            9.0d      8.3h    945851   4378.94      199

End: 37 Unlightings, Sunshaft 199, 5662421 Nightglass, 2.3d present of 59.9d

Policy active, 60 days, seed 1

Milestone                                    Elapsed   Present    Played
First Sunshaft sealed                           8.0h        2m      8.0h
First Rite                                      8.0h        2m      8.0h
Sunshaft 10                                     8.0h        3m      8.0h
Sunshaft 50                                     8.3h       20m      8.3h
Unlighting first possible (yield >= 1)          8.4h       25m      8.4h
Sunshaft 100                                    3.3d      6.0h      3.0d
Relic set: The Surveyor's Kit                   5.3d     10.0h      4.8d
Relic set: The Choir Loft                       8.5d     16.5h      7.7d
First Unlighting                                8.8d     17.0h      7.9d
Perk: The First Absence                         8.8d     17.0h      7.9d
Perk: Keen Dark                                 8.8d     17.0h      7.9d
Perk: Deep Vein                                 8.8d     17.0h      7.9d
Perk: Echoing Halls                             8.8d     17.0h      7.9d
Perk: Unsleeping                                8.8d     17.0h      7.9d
Perk: Bound Hands                               8.8d     17.0h      7.9d
Perk: The Usher                                 8.8d     17.0h      7.9d
Perk: Thrifty Dark                              8.8d     17.0h      7.9d
Perk: A Second Line                             8.8d     17.0h      7.9d
Perk: Remembered Road                           8.8d     17.0h      7.9d
Perk: The Steward                               8.8d     17.0h      7.9d
Perk: The Precentor                             8.8d     17.0h      7.9d
Perk: Rites Remembered                          8.8d     17.3h      7.9d
Perk: The Chamberlain                           8.8d     17.3h      7.9d
Perk: Lantern-Hunger                            8.9d     17.5h      8.0d
Perk: The Queen's Reflection                    8.9d     17.9h      8.1d
Vow kept: Vow of Silence                        8.9d     17.9h      8.1d
Vow kept: Vow of Empty Hands                    8.9d     18.0h      8.1d
Perk: Further Down                              9.3d     18.0h      8.5d
All perks                                       9.3d     18.0h      8.5d
Vow kept: Vow of the Open Door                  9.3d     18.0h      8.5d
Vow kept: Vow of Few                            9.3d     18.1h      8.5d
Vow kept: Vow of the Short Chain                9.3d     18.2h      8.5d
Vow kept: Vow of the Unlit                      9.3d     18.3h      8.5d
Sunshaft 150                                    9.3d     18.3h      8.5d
Relic set: The Drowned Table                   10.8d     21.0h      9.9d
Relic set: The Lamp Room                       21.8d     43.0h     20.9d
Relic set: The Sleeper's Bed                   23.3d     46.0h     22.5d
Relic set: The Queen's Things                  24.5d      2.0d     23.7d
All six relic sets                             24.5d      2.0d     23.7d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1             8.8d     17.0h       427      2.03      109
2              19m       19m       267    832.21      118
3             2.7h       11m       372    138.85      118
4              24m       24m       750   1914.89      119
5               4m        4m       703   9924.71      129
6            10.5h        2m      1976    187.52      129
7               5m        5m      3517  40842.58      149
8               5m        5m      4650  62000.00      149
9               7m        7m      5999  52674.15      149
10             12m       12m      7726  38363.59      159
11            3.5h       85s     12128   3441.92      159
12             13m       13m      9879  44179.38      159
13             11m       11m      9688  54495.00      161
14            5.6h        6m     19508   3484.44      161
15              4m        4m     15544 238120.85      161
16              9m        9m     21735 140983.78      169
17              7m        7m     25847 209099.33      169
18              7m        7m     28662 264572.31      169
19            2.8h       16m     36017  13050.95      169
20           10.8h       20m     41085   3790.52      169
21            4.2h       40m     49807  11957.67      179
22            5.8h       18m     61276  10569.89      179
23             24m       24m     71953 181776.00      179
24           13.6h       36m     92625   6814.84      179
25           10.0h       62m    105058  10473.80      179
26           14.0h       58m    137786   9863.38      179
27           13.1h      1.6h    153234  11717.13      189
28           21.0h       88m    183762   8766.81      189
29           38.0h      3.0h    221407   5832.47      189
30           24.4h      2.4h    265697  10883.65      189
31           33.6h      2.6h    320243   9534.59      189
32            2.0d      4.3h    381944   7905.02      199
33           38.2h      3.2h    458431  12014.35      199
34            3.0d      5.9h    550868   7663.81      199
35            2.4d      4.6h    660286  11453.91      199
36            4.0d      8.0h    793120   8261.67      199
37            4.0d      8.4h    950805   9865.54      209
38            4.7d      9.3h   1141197  10032.26      209
39            5.4d     11.2h   1370982  10608.58      209
40            9.0d     17.7h   1643700   7620.89      209

End: 40 Unlightings, Sunshaft 209, 9860661 Nightglass, 5.0d present of 59.9d
```
