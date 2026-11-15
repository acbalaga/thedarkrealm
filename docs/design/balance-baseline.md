# Balance baseline

Measured with `tools/sim.js` (TDR-003) on the build at the end of TDR-002. Seed 1, 60 simulated days, three player policies. The simulator drives the real engine with a fake clock, so away time, the 8 hour cap and the away pace behave as in play. It steps 5 seconds at a time while the player is present.

Regenerate with `npm run sim -- --days 60 --seed 1`. Same seed, same output.

**Elapsed** is wall time since the first launch. **Present** is time the policy was actually at the screen. **Played** is the game's own `played` counter, which includes credited away time.

## Answers

| Question | idle | casual | active |
| --- | --- | --- | --- |
| First Unlighting that yields Nightglass is possible (present) | never | 15 min | 30 min |
| First Unlighting under the simulator's rule (present) | never | 9.2 h | 34.5 h |
| First Unlighting under the rule (elapsed) | never | 10.3 days | 17.5 days |
| Sunshaft 150 (present) | never | 11.0 h | 36.6 h |
| Sunshaft 150 (elapsed) | never | 12.3 days | 18.5 days |
| All 13 perks (present) | never | 10.4 h | 36.0 h |
| All 13 perks (elapsed) | never | 11.5 days | 18.3 days |

"Possible" is the first moment `glassGain()` is at least 1, which needs 1e9 Gloom in the fathom. The rule row is when the simulator's Unlighting rule fires: Nightglass per hour has fallen to 70 percent of its peak for the fathom, and the yield is at least 1 (and at least 20 percent of lifetime Nightglass after the first).

## What is surprising

1. **The idle policy never starts.** With no hand gathering the realm has no income to buy a first Wisp-Gleaner, so 60 days of 3 minute check-ins produce nothing. The first gather by hand is a hard gate. This is a finding about the opening, not a simulator fault.
2. **A Lampwarden wall stops the first fathom.** Casual reaches Sunshaft 99 inside the first two days, then spends days at Lampwardens 100 to 109 with Gloom per second flat. The first fathom lasts 10 days, and under the 70 percent rule that is when the player lets go. Nobody in a real game would wait that long if the game told them Nightglass was available after 15 minutes.
3. **Unlighting is first possible at 15 minutes (casual) and 30 minutes (active) of presence, well under the 60 to 120 minute target.** Whether that is too early or the target should move is an owner decision (follow-up note in `docs/tickets/README.md`).
4. **After the first fathom the loop collapses.** Casual makes 33 Unlightings in 60 days. Fathoms 3 to 5 last 1.5 hours elapsed and 5 minutes present. Once all 13 perks are bought on day 11, the long game is the Nightglass multiplier, not new content.
5. **All perks and Sunshaft 150 land inside two days of each other.** Content is exhausted by day 12 (casual) and day 18 (active), before the day 14 line for casual. The Pane (TDR-035) is meant to take 30 to 120 days, so the current endgame is far short of that.
6. **Milestones under 5 minutes apart.** The first Sunshaft, first Rite and Sunshaft 10 are observed in the same 2 to 5 minute check-in. This is partly the 7 hour overnight gap before the first session, which gives the realm its away credit at once.

## Raw output

```
Policy idle, 60 days, seed 1

Milestone                                    Elapsed   Present    Played

Fathom    Duration   Present     Glass   Glass/h  Deepest

End: 0 Unlightings, Sunshaft 0, 0 Nightglass, 18.0h present of 59.8d

Policy casual, 60 days, seed 1

Milestone                                    Elapsed   Present    Played
First Sunshaft sealed                           7.0h        2m      7.0h
First Rite                                      7.0h        2m      7.0h
Sunshaft 10                                     7.0h        3m      7.0h
Unlighting first possible (yield >= 1)         11.5h       15m     11.5h
Sunshaft 50                                    11.5h       15m     11.5h
Sunshaft 100                                    4.7d      4.2h      4.5d
First Unlighting                               10.3d      9.2h      9.9d
Perk: The First Absence                        10.3d      9.2h      9.9d
Perk: Keen Dark                                10.3d      9.2h      9.9d
Perk: Deep Vein                                10.3d      9.2h      9.9d
Perk: Echoing Halls                            10.3d      9.2h      9.9d
Perk: Unsleeping                               10.3d      9.2h      9.9d
Perk: Bound Hands                              10.3d      9.2h      9.9d
Perk: Thrifty Dark                             10.3d      9.2h      9.9d
Perk: Remembered Road                          10.3d      9.2h      9.9d
Perk: The Steward                              10.3d      9.2h      9.9d
Perk: Rites Remembered                         10.3d      9.2h      9.9d
Perk: Lantern-Hunger                           11.3d     10.1h     10.9d
Perk: The Queen's Reflection                   11.3d     10.1h     10.9d
Perk: Further Down                             11.5d     10.4h     11.2d
All perks                                      11.5d     10.4h     11.2d
Sunshaft 150                                   12.3d     11.0h     11.9d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1            10.3d      9.2h       372      1.51      109
2            24.0h       55m       779     32.46      119
3             1.5h        5m       526    350.67      119
4             1.5h        5m       859    572.67      129
5             1.5h        5m       864    576.00      129
6             1.5h        5m       938    625.33      129
7               3m        3m       875  15365.85      138
8              87m        2m      2421   1677.69      139
9             1.5h        5m      4189   2792.67      139
10              3m        3m      2380  41795.12      139
11             87m        2m      3757   2603.50      149
12            1.5h        5m      5391   3594.00      149
13            1.5h        5m      5857   3904.67      149
14            1.5h        5m      6322   4214.67      149
15            9.0h        5m     11186   1242.89      149
16            1.5h        5m     10411   6940.67      159
17            1.5h        8m     12908   8342.69      159
18            3.0h        9m     14227   4773.27      169
19            4.5h       13m     19671   4398.48      169
20           13.5h       20m     29411   2178.59      169
21            7.5h       25m     27326   3643.47      169
22           16.5h       30m     38587   2338.61      169
23           15.0h       50m     41248   2749.87      179
24           18.0h       37m     48101   2667.75      179
25           24.0h       53m     58145   2425.80      179
26           39.0h       80m     70439   1806.13      179
27            2.6d      2.7h     83487   1355.71      179
28           43.4h      1.5h    101095   2328.41      189
29            5.9d      5.4h    120564    846.06      189
30            3.9d      3.5h    144962   1558.73      189
31            6.4d      6.0h    173840   1136.21      189
32            5.9d      5.4h    208496   1463.13      189
33           13.6d     12.3h    250047    768.19      189

End: 33 Unlightings, Sunshaft 189, 1499681 Nightglass, 2.3d present of 59.9d

Policy active, 60 days, seed 1

Milestone                                    Elapsed   Present    Played
First Sunshaft sealed                           8.1h        4m      8.1h
First Rite                                      8.1h        4m      8.1h
Sunshaft 10                                     8.1h        5m      8.1h
Sunshaft 50                                     8.5h       29m      8.5h
Unlighting first possible (yield >= 1)         12.0h       30m     12.0h
Sunshaft 100                                    8.3d     16.0h      7.5d
First Unlighting                               17.5d     34.5h     15.7d
Perk: The First Absence                        17.5d     34.5h     15.7d
Perk: Keen Dark                                17.5d     34.5h     15.7d
Perk: Deep Vein                                17.5d     34.5h     15.7d
Perk: Echoing Halls                            17.5d     34.5h     15.7d
Perk: Unsleeping                               17.5d     34.5h     15.7d
Perk: Bound Hands                              17.5d     34.5h     15.7d
Perk: Thrifty Dark                             17.5d     34.5h     15.7d
Perk: Remembered Road                          17.5d     34.5h     15.7d
Perk: The Steward                              17.5d     34.5h     15.7d
Perk: Rites Remembered                         17.5d     34.5h     15.7d
Perk: Lantern-Hunger                           17.8d     35.0h     16.0d
Perk: The Queen's Reflection                   17.9d     35.5h     16.1d
Perk: Further Down                             18.3d     36.0h     16.6d
All perks                                      18.3d     36.0h     16.6d
Sunshaft 150                                   18.5d     36.6h     16.7d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1            17.5d     34.5h       419      1.00      109
2             6.0h       30m       271     45.17      109
3              23m       23m       387    998.71      115
4             2.6h        7m       285    109.09      115
5               8m        8m       502   3971.87      128
6               4m        4m       830  11952.00      128
7               7m        7m       543   4948.86      129
8            10.7h       12m      2645    247.32      129
9               2m        2m      1936  51626.67      138
10              3m        3m      2180  42421.62      139
11              6m        6m      3073  29112.63      149
12              5m        5m      2626  35013.33      149
13              3m        3m      3484  64320.00      149
14              8m        8m      3837  30358.68      149
15            3.5h        3m      6788   1912.11      149
16              4m        4m      7128 116640.00      149
17             12m       12m      9449  45968.11      158
18            5.7h       14m     14203   2477.27      159
19             21m       21m     12415  35054.12      159
20            2.7h       12m     15049   5588.08      166
21             23m       23m     18372  48101.24      166
22           10.6h        4m     21575   2040.99      166
23            4.0h       30m     25737   6434.25      169
24            6.0h       32m     31973   5295.73      169
25           14.0h       58m     37963   2718.93      169
26           13.0h      1.5h     47180   3629.23      179
27           21.0h      1.5h     55630   2649.05      179
28           38.0h      3.0h     68275   1796.71      179
29           37.0h      3.5h     79668   2153.19      179
30            2.5d      4.5h     95391   1616.80      179
31            3.0d      6.0h    118023   1639.21      189
32            4.0d      8.1h    137568   1431.92      189
33            4.0d      7.9h    167904   1750.32      189
34            5.5d     11.5h    199034   1496.50      189
35            6.5d     12.5h    241937   1560.88      189

End: 35 Unlightings, Sunshaft 189, 1434280 Nightglass, 5.0d present of 59.9d
```
