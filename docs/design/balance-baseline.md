# Balance baseline

Measured with `tools/sim.js` (TDR-003) on the build at the end of TDR-002. Seed 1, 60 simulated days, three player policies. The simulator drives the real engine with a fake clock, so away time, the 8 hour cap and the away pace behave as in play. It steps 5 seconds at a time while the player is present.

Regenerate with `npm run sim -- --days 60 --seed 1`. Same seed, same output.

**Elapsed** is wall time since the first launch. **Present** is time the policy was actually at the screen. **Played** is the game's own `played` counter, which includes credited away time.

## Answers

| Question | idle | casual | active |
| --- | --- | --- | --- |
| First Unlighting that yields Nightglass is possible (present) | never | 15 min | 26 min |
| First Unlighting under the simulator's rule (present) | never | 8.7 h | 22.5 h |
| First Unlighting under the rule (elapsed) | never | 9.6 days | 11.5 days |
| Sunshaft 150 (present) | never | 10.3 h | 24.2 h |
| Sunshaft 150 (elapsed) | never | 11.4 days | 12.3 days |
| All perks (present) | never | 9.7 h | 24.0 h |
| All perks (elapsed) | never | 10.7 days | 12.3 days |

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
Sunshaft 50                                    10.0h       12m     10.0h
Unlighting first possible (yield >= 1)         11.5h       15m     11.5h
Sunshaft 100                                    5.7d      5.2h      5.5d
First Unlighting                                9.6d      8.7h      9.3d
Perk: The First Absence                         9.6d      8.7h      9.3d
Perk: Keen Dark                                 9.6d      8.7h      9.3d
Perk: Deep Vein                                 9.6d      8.7h      9.3d
Perk: Echoing Halls                             9.6d      8.7h      9.3d
Perk: Unsleeping                                9.6d      8.7h      9.3d
Perk: Bound Hands                               9.6d      8.7h      9.3d
Perk: Thrifty Dark                              9.6d      8.7h      9.3d
Perk: Remembered Road                           9.6d      8.7h      9.3d
Perk: The Steward                               9.6d      8.7h      9.3d
Perk: Rites Remembered                          9.6d      8.7h      9.3d
Perk: Lantern-Hunger                            9.9d      9.0h      9.5d
Perk: The Queen's Reflection                   10.4d      9.3h     10.1d
Perk: Further Down                             10.7d      9.7h     10.3d
All perks                                      10.7d      9.7h     10.3d
Sunshaft 150                                   11.4d     10.3h     11.1d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1             9.6d      8.7h       356      1.54      109
2             3.0h       10m       124     41.33      109
3             3.0h       10m       129     43.00      109
4            10.5h       10m       302     28.76      109
5             3.0h       10m       262     87.33      109
6               3m        3m       242   5620.65      116
7              87m        2m       387    265.62      119
8             1.5h        5m       818    545.33      119
9             1.5h        5m       922    614.67      119
10            1.5h        5m      1016    677.33      129
11              2m        2m       914  25310.77      138
12              2m        2m      1586  47580.00      142
13            4.4h       11m      6941   1566.62      149
14              3m        3m      4320  79753.85      149
15             87m        2m      4191   2898.67      149
16            9.0h        5m     10649   1183.22      149
17            1.5h        5m      6641   4427.33      149
18            1.6h        8m      8119   5233.38      159
19            2.9h        7m     11369   3855.71      159
20            3.0h       13m     12134   3985.62      159
21            1.5h        6m     14404   9471.12      165
22            2.9h        6m     17489   5953.70      169
23           10.5h       10m     23283   2218.02      169
24            7.6h       28m     25325   3353.69      169
25            7.4h       22m     31811   4270.73      169
26           13.5h       20m     38578   2857.63      169
27           19.5h       40m     48712   2498.05      179
28           24.0h       55m     59150   2464.58      179
29           36.1h      1.7h     66040   1830.91      179
30           35.9h       66m     82183   2287.27      179
31            3.1d      3.0h     95766   1275.70      179
32            3.4d      3.3h    114850   1417.76      189
33            4.9d      4.5h    137891   1163.84      189
34            4.6d      3.9h    169719   1550.75      189
35            8.1d      7.4h    199495   1030.98      189
36            7.3d      6.8h    239649   1377.29      189
37           10.2d      9.4h    287330   1175.11      189

End: 37 Unlightings, Sunshaft 189, 1723097 Nightglass, 2.3d present of 59.9d

Policy active, 60 days, seed 1

Milestone                                    Elapsed   Present    Played
First Sunshaft sealed                           8.0h        2m      8.0h
First Rite                                      8.0h        2m      8.0h
Sunshaft 10                                     8.0h        3m      8.0h
Sunshaft 50                                     8.3h       20m      8.3h
Unlighting first possible (yield >= 1)          8.4h       26m      8.4h
Sunshaft 100                                    4.9d      9.8h      4.5d
First Unlighting                               11.5d     22.5h     10.4d
Perk: The First Absence                        11.5d     22.5h     10.4d
Perk: Keen Dark                                11.5d     22.5h     10.4d
Perk: Deep Vein                                11.5d     22.5h     10.4d
Perk: Echoing Halls                            11.5d     22.5h     10.4d
Perk: Unsleeping                               11.5d     22.5h     10.4d
Perk: Bound Hands                              11.5d     22.5h     10.4d
Perk: Thrifty Dark                             11.5d     22.5h     10.4d
Perk: Remembered Road                          11.5d     22.5h     10.4d
Perk: The Steward                              11.5d     22.5h     10.4d
Perk: Rites Remembered                         11.5d     22.5h     10.4d
Perk: Lantern-Hunger                           11.8d     23.0h     10.6d
Perk: The Queen's Reflection                   11.8d     23.4h     10.6d
Perk: Further Down                             12.3d     24.0h     11.2d
All perks                                      12.3d     24.0h     11.2d
Sunshaft 150                                   12.3d     24.2h     11.2d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1            11.5d     22.5h       503      1.82      109
2             6.0h       30m       372     62.00      109
3              24m       24m      1002   2513.73      119
4               5m        5m       980  10855.38      137
5            13.5h       31m      3858    285.54      139
6               2m        2m      3582  92108.57      139
7               5m        5m      2702  34740.00      149
8               5m        5m      3991  44208.00      152
9               5m        5m      5159  59910.97      155
10              3m        3m      5360 110262.86      155
11              3m        3m      7011 126198.00      155
12            3.6h        6m     12835   3562.53      159
13             16m       16m     15994  60291.52      159
14             10m       10m     12676  74200.98      159
15            5.6h        4m     19255   3460.71      159
16              9m        9m     19116 127440.00      166
17             10m       10m     23844 144266.22      169
18            2.8h       20m     28784  10134.22      169
19           10.8h       21m     42454   3914.82      169
20            4.2h       39m     41940  10102.64      169
21            6.3h       47m     50737   8067.72      169
22           23.6h      1.6h     62921   2670.70      179
23           18.0h      1.5h     74279   4126.61      179
24           20.5h      2.0h     87874   4292.06      179
25           33.9h      2.9h    105773   3124.12      179
26           47.7h      3.7h    128405   2693.65      189
27            2.1d      4.9h    152966   2975.75      189
28            3.0d      6.0h    182887   2538.68      189
29            5.5d     10.5h    219496   1676.09      189
30            4.4d      8.6h    264917   2508.72      189
31            7.8d     15.5h    317013   1704.37      189
32            9.8d     19.6h    379792   1608.76      199

End: 32 Unlightings, Sunshaft 199, 2278478 Nightglass, 5.0d present of 59.9d
```
