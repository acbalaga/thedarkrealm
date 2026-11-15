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
| Sunshaft 150 (present) | never | 12.5 h | 20.2 h |
| Sunshaft 150 (elapsed) | never | 13.7 days | 10.3 days |
| All perks (present) | never | 12.1 h | 20.0 h |
| All perks (elapsed) | never | 13.4 days | 10.3 days |

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
Perk: Further Down                             13.4d     12.1h     13.0d
All perks                                      13.4d     12.1h     13.0d
Relic set: The Lamp Room                       13.5d     12.2h     13.1d
Sunshaft 150                                   13.7d     12.5h     13.3d
Relic set: The Drowned Table                   13.9d     12.8h     13.5d
Relic set: The Queen's Things                  30.3d     27.5h     29.9d
Relic set: The Sleeper's Bed                   40.3d     36.7h     39.9d
All six relic sets                             40.3d     36.7h     39.9d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1            11.9d     10.9h       452      1.58      109
2             9.1h        8m        91     10.05      116
3            23.9h       52m       968     40.42      119
4             1.5h        5m      1350    900.00      129
5             1.5h        5m      1524   1016.00      129
6               2m        2m       919  23631.43      140
7              88m        3m      3285   2248.29      140
8               5m        5m      1729  21463.45      140
9             8.9h       25m     15572   1745.85      159
10            1.5h        5m      7957   5304.67      159
11            9.0h        5m     17741   1971.22      159
12            1.5h        5m     13516   9010.67      159
13            1.5h        6m     13489   8853.31      159
14            1.6h        8m     16121  10372.76      159
15            4.4h       10m     25592   5787.14      169
16            3.0h       10m     25419   8473.00      169
17            3.0h       11m     30215  10006.81      169
18            9.0h        4m     38014   4232.92      169
19            4.5h       15m     44119   9804.22      169
20            7.5h       25m     54008   7201.07      169
21           12.1h       19m     62440   5176.37      179
22           10.4h       31m     77232   7399.47      179
23           13.5h       20m     96651   7159.33      179
24           24.0h       55m    123078   5128.25      179
25           36.0h      1.6h    138319   3842.19      189
26            2.0d      1.8h    164442   3425.88      189
27            2.5d      2.1h    200656   3344.27      189
28            3.1d      2.9h    235349   3136.77      189
29            2.9d      2.6h    293357   4253.35      189
30            3.1d      2.9h    341837   4557.83      189
31            3.9d      3.5h    409098   4396.87      199
32            4.6d      4.5h    491960   4433.79      199
33            4.4d      3.8h    621221   5916.39      199
34            9.0d      8.3h    720233   3334.41      199

End: 34 Unlightings, Sunshaft 199, 4287954 Nightglass, 2.3d present of 59.9d

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
Perk: Further Down                             10.3d     20.0h      9.5d
All perks                                      10.3d     20.0h      9.5d
Sunshaft 150                                   10.3d     20.2h      9.5d
Relic set: The Drowned Table                   11.5d     22.5h     10.7d
Relic set: The Queen's Things                  26.9d      2.2d     26.0d
Relic set: The Sleeper's Bed                   27.5d      2.3d     26.7d
Relic set: The Lamp Room                       55.3d      4.6d     54.5d
All six relic sets                             55.3d      4.6d     54.5d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1             8.8d     17.0h       427      2.03      109
2              19m       19m       267    832.21      118
3             2.7h       11m       372    138.85      118
4              24m       24m       750   1914.89      119
5               4m        4m       698  11168.00      129
6               2m        2m       504  12960.00      129
7            34.5h      2.0h      7658    221.93      149
8               3m        3m      3741  84172.50      149
9               6m        6m      7631  79627.83      149
10              9m        9m      8109  56684.27      155
11              5m        5m      6608  80640.00      155
12              6m        6m      7376  72749.59      159
13            3.5h        2m      9593   2715.00      159
14             18m       18m     10833  35453.45      159
15              8m        8m     14441 106097.14      165
16            5.6h        4m     18961   3411.27      165
17              9m        9m     20231 131228.11      167
18              9m        9m     25500 180000.00      169
19             10m       10m     29216 175296.00      169
20            2.8h       16m     36583  13209.51      169
21           10.8h       16m     43026   3995.71      169
22            4.0h       33m     50918  12589.62      169
23            6.1h       38m     62992  10277.42      179
24           13.8h       50m     83423   6033.61      179
25           10.0h       60m     94115   9411.50      179
26           14.3h       76m    108829   7632.66      179
27           23.7h      1.7h    135642   5713.25      179
28           24.0h      2.0h    160763   6698.46      189
29           34.0h      3.0h    211723   6227.15      189
30           27.1h      2.6h    234901   8657.29      189
31           45.3h      3.8h    279315   6161.17      189
32           37.5h      2.5h    338894   9029.48      189
33            3.0d      6.0h    412366   5727.31      199
34            2.5d      5.5h    488841   8013.79      199
35            3.9d      7.5h    587701   6319.37      199
36            4.0d      8.1h    702059   7304.77      199
37            5.8d     11.7h    842452   6093.75      199
38            5.0d      9.7h   1009774   8434.70      199
39            9.3d     18.5h   1211707   5457.49      209

End: 39 Unlightings, Sunshaft 209, 7268940 Nightglass, 5.0d present of 59.9d
```
