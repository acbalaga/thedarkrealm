# Balance baseline

Measured with `tools/sim.js` (TDR-003) on the build at the end of TDR-002. Seed 1, 60 simulated days, three player policies. The simulator drives the real engine with a fake clock, so away time, the 8 hour cap and the away pace behave as in play. It steps 5 seconds at a time while the player is present.

Regenerate with `npm run sim -- --days 60 --seed 1`. Same seed, same output.

**Elapsed** is wall time since the first launch. **Present** is time the policy was actually at the screen. **Played** is the game's own `played` counter, which includes credited away time.

## Answers

| Question | idle | casual | active |
| --- | --- | --- | --- |
| First Unlighting that yields Nightglass is possible (present) | never | 15 min | 25 min |
| First Unlighting under the simulator's rule (present) | never | 12.8 h | 20.0 h |
| First Unlighting under the rule (elapsed) | never | 14.3 days | 10.3 days |
| Sunshaft 150 (present) | never | 14.0 h | 21.6 h |
| Sunshaft 150 (elapsed) | never | 15.5 days | 10.9 days |
| All perks (present) | never | 13.8 h | 21.0 h |
| All perks (elapsed) | never | 15.3 days | 10.8 days |

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
Sunshaft 100                                    6.5d      5.8h      6.3d
First Unlighting                               14.3d     12.8h     13.8d
Perk: The First Absence                        14.3d     12.8h     13.8d
Perk: Keen Dark                                14.3d     12.8h     13.8d
Perk: Deep Vein                                14.3d     12.8h     13.8d
Perk: Echoing Halls                            14.3d     12.8h     13.8d
Perk: Unsleeping                               14.3d     12.8h     13.8d
Perk: Bound Hands                              14.3d     12.8h     13.8d
Perk: Thrifty Dark                             14.3d     12.8h     13.8d
Perk: Remembered Road                          14.3d     12.8h     13.8d
Perk: The Steward                              14.3d     12.8h     13.8d
Perk: Rites Remembered                         14.3d     12.8h     13.8d
Perk: Lantern-Hunger                           14.4d     13.0h     13.9d
Perk: The Queen's Reflection                   14.8d     13.5h     14.3d
Perk: Further Down                             15.3d     13.8h     14.8d
All perks                                      15.3d     13.8h     14.8d
Sunshaft 150                                   15.5d     14.0h     14.9d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1            14.3d     12.8h       447      1.30      109
2             3.0h       10m       130     43.33      109
3             3.0h       10m       209     69.67      109
4             3.0h       10m       280     93.33      109
5             3.0h       10m       289     96.33      109
6             1.5h        5m       561    374.00      119
7               3m        3m       397   8407.06      119
8              87m        2m       480    330.40      119
9             9.0h        5m      1548    172.00      119
10              4m        4m      1612  26991.63      139
11             86m       85s      2304   1599.69      139
12              4m        4m      2426  35647.35      146
13            7.4h       21m     11735   1578.99      159
14            1.5h        5m      5557   3704.67      159
15            1.5h        5m      6523   4348.67      159
16            1.5h        7m      7289   4766.65      159
17           10.5h        8m     14842   1417.46      159
18            3.0h       10m     12946   4315.33      159
19            4.5h       15m     14108   3133.18      159
20            4.5h       15m     17544   3901.07      159
21            3.0h       11m     20246   6720.66      169
22            9.0h        4m     24468   2722.45      169
23            6.0h       21m     30629   5090.69      169
24            9.0h       29m     36324   4043.49      169
25           16.5h       30m     43795   2654.24      169
26           16.6h       35m     51442   3102.81      179
27           23.9h       50m     68671   2870.76      179
28           27.0h       65m     75486   2795.78      179
29            2.3d      2.3h     90594   1632.32      179
30            3.2d      3.0h    108781   1421.97      179
31            2.6d      2.3h    130381   2068.90      189
32            4.4d      4.2h    156447   1489.28      189
33            4.5d      3.8h    188043   1742.24      189
34            5.9d      5.3h    227458   1613.18      189
35           13.5d     12.6h    270932    836.21      189

End: 35 Unlightings, Sunshaft 189, 1624924 Nightglass, 2.3d present of 59.9d

Policy active, 60 days, seed 1

Milestone                                    Elapsed   Present    Played
First Sunshaft sealed                           8.0h        2m      8.0h
First Rite                                      8.0h        2m      8.0h
Sunshaft 10                                     8.0h        3m      8.0h
Sunshaft 50                                     8.3h       19m      8.3h
Unlighting first possible (yield >= 1)          8.4h       25m      8.4h
Sunshaft 100                                    5.3d     10.0h      4.8d
First Unlighting                               10.3d     20.0h      9.3d
Perk: The First Absence                        10.3d     20.0h      9.3d
Perk: Keen Dark                                10.3d     20.0h      9.3d
Perk: Deep Vein                                10.3d     20.0h      9.3d
Perk: Echoing Halls                            10.3d     20.0h      9.3d
Perk: Unsleeping                               10.3d     20.0h      9.3d
Perk: Bound Hands                              10.3d     20.0h      9.3d
Perk: Thrifty Dark                             10.3d     20.0h      9.3d
Perk: Remembered Road                          10.3d     20.0h      9.3d
Perk: The Steward                              10.3d     20.0h      9.3d
Perk: Rites Remembered                         10.3d     20.0h      9.3d
Perk: Lantern-Hunger                           10.5d     20.5h      9.5d
Perk: The Queen's Reflection                   10.5d     20.9h      9.5d
Perk: Further Down                             10.8d     21.0h      9.7d
All perks                                      10.8d     21.0h      9.7d
Sunshaft 150                                   10.9d     21.6h      9.8d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1            10.3d     20.0h       428      1.73      109
2             4.0h       30m       388     97.00      109
3              11m       11m       223   1274.29      109
4              12m       12m       328   1674.89      113
5               5m        5m       982  11403.87      129
6             5.5h        3m      1513    272.95      129
7               2m        2m      2748  82440.00      139
8               6m        6m      3451  36540.00      147
9               4m        4m      2592  38086.53      147
10              3m        3m      2540  53788.24      147
11              4m        4m      3048  43030.59      149
12              9m        9m      5811  38384.59      149
13            2.5h        2m      6692   2640.13      149
14              4m        4m      7611 107449.41      151
15              9m        9m      8186  54573.33      159
16             13m       13m     10910  52021.19      159
17           10.6h        4m     13767   1302.53      159
18            4.0h       30m     18337   4584.25      169
19             29m       29m     17966  37064.53      169
20           19.5h       61m     48603   2490.51      169
21            4.0h       30m     31461   7865.25      169
22            6.2h       43m     38366   6178.38      169
23           13.8h       47m     46722   3388.04      169
24           10.1h       67m     54721   5407.51      179
25           23.9h      1.9h     68448   2866.26      179
26           24.4h      2.4h     79229   3250.42      179
27           37.6h      2.6h     97729   2597.45      179
28            2.2d      4.8h    114916   2198.01      179
29            2.0d      4.0h    137958   2873.71      189
30            2.8d      5.5h    165137   2429.73      189
31            3.4d      7.0h    198172   2417.80      189
32            5.0d      9.8h    237896   1986.08      189
33            8.0d     16.2h    285532   1485.58      189
34           11.6d     22.8h    342899   1234.35      189

End: 34 Unlightings, Sunshaft 189, 2055310 Nightglass, 5.0d present of 59.9d
```
