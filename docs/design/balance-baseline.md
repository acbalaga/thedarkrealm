# Balance baseline

Measured with `tools/sim.js` (TDR-003) on the build at the end of TDR-002. Seed 1, 60 simulated days, three player policies. The simulator drives the real engine with a fake clock, so away time, the 8 hour cap and the away pace behave as in play. It steps 5 seconds at a time while the player is present.

Regenerate with `npm run sim -- --days 60 --seed 1`. Same seed, same output.

**Elapsed** is wall time since the first launch. **Present** is time the policy was actually at the screen. **Played** is the game's own `played` counter, which includes credited away time.

## Answers

| Question | idle | casual | active |
| --- | --- | --- | --- |
| First Unlighting that yields Nightglass is possible (present) | never | 15 min | 26 min |
| First Unlighting under the simulator's rule (present) | never | 8.7 h | 21.0 h |
| First Unlighting under the rule (elapsed) | never | 9.6 days | 10.8 days |
| Sunshaft 150 (present) | never | 10.2 h | 22.4 h |
| Sunshaft 150 (elapsed) | never | 11.4 days | 11.3 days |
| All perks (present) | never | 9.7 h | 22.1 h |
| All perks (elapsed) | never | 10.7 days | 11.3 days |

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
Sunshaft 150                                   11.4d     10.2h     11.0d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1             9.6d      8.7h       357      1.55      109
2             3.0h        9m        90     30.11      109
3             3.0h       10m       147     49.00      109
4            10.5h       10m       300     28.57      109
5             3.0h       10m       261     87.00      109
6               4m        4m       231   3615.65      119
7              88m        3m       411    280.76      119
8              88m        3m       635    431.32      119
9             1.5h        5m       897    598.00      119
10            1.5h        5m       968    645.33      129
11              2m        2m       867  29725.71      137
12              3m        3m      1655  38438.71      142
13            5.9h       16m      7962   1343.17      149
14            9.0h        5m      8795    977.22      149
15            1.5h        5m      7977   5318.00      149
16            1.5h        5m      6955   4636.67      159
17            1.5h        7m      8127   5300.22      159
18            3.0h        8m     11414   3847.42      159
19            1.5h        6m     11943   7881.72      159
20            1.5h        7m     14508   9496.15      165
21            3.0h       10m     17478   5842.23      169
22           10.5h        8m     21549   2059.09      169
23            6.0h       20m     25673   4278.83      169
24            6.1h       25m     29850   4912.46      169
25           12.0h       15m     35811   2986.32      169
26           13.5h       45m     43164   3197.33      179
27           17.9h       31m     53569   2987.35      179
28           21.0h       45m     63084   3004.00      179
29           27.0h       67m     78536   2905.90      179
30           31.5h       82m     90824   2879.62      179
31            2.4d      1.9h    109942   1931.07      179
32            5.4d      5.1h    131165   1016.78      189
33            5.7d      5.1h    157706   1155.36      189
34            4.6d      4.5h    188571   1721.30      189
35            7.0d      6.4h    226289   1347.37      189
36           10.8d      9.8h    271770   1047.28      189

End: 36 Unlightings, Sunshaft 189, 1629481 Nightglass, 2.3d present of 59.9d

Policy active, 60 days, seed 1

Milestone                                    Elapsed   Present    Played
First Sunshaft sealed                           8.0h        2m      8.0h
First Rite                                      8.0h        2m      8.0h
Sunshaft 10                                     8.0h        3m      8.0h
Sunshaft 50                                     8.3h       20m      8.3h
Unlighting first possible (yield >= 1)          8.4h       26m      8.4h
Sunshaft 100                                    4.9d      9.7h      4.5d
First Unlighting                               10.8d     21.0h      9.7d
Perk: The First Absence                        10.8d     21.0h      9.7d
Perk: Keen Dark                                10.8d     21.0h      9.7d
Perk: Deep Vein                                10.8d     21.0h      9.7d
Perk: Echoing Halls                            10.8d     21.0h      9.7d
Perk: Unsleeping                               10.8d     21.0h      9.7d
Perk: Bound Hands                              10.8d     21.0h      9.7d
Perk: Thrifty Dark                             10.8d     21.0h      9.7d
Perk: Remembered Road                          10.8d     21.0h      9.7d
Perk: The Steward                              10.8d     21.0h      9.7d
Perk: Rites Remembered                         10.8d     21.0h      9.7d
Perk: Lantern-Hunger                           10.9d     21.5h      9.8d
Perk: The Queen's Reflection                   10.9d     21.9h      9.9d
Perk: Further Down                             11.3d     22.1h     10.3d
All perks                                      11.3d     22.1h     10.3d
Sunshaft 150                                   11.3d     22.4h     10.3d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1            10.8d     21.0h       475      1.84      109
2             3.0h       30m       438    146.00      109
3              27m       27m       761   1696.35      119
4            10.6h        3m      1375    130.31      119
5               4m        4m       623  10680.00      134
6               2m        2m      1502  49156.36      141
7               2m        2m      1467  58680.00      141
8               2m        2m      1726  44382.86      141
9               3m        3m      2062  46395.00      146
10              2m        2m      3034  75326.90      146
11              5m        5m      3882  43000.62      148
12              7m        7m      5030  45270.00      155
13            3.6h        4m      7848   2203.81      159
14              6m        6m      6091  59263.78      159
15             10m       10m      7532  43734.19      159
16             10m       10m     11217  70844.21      159
17            5.6h        4m     14535   2611.08      159
18             12m       12m     14910  77231.65      166
19              8m        8m     16925 133912.09      166
20              9m        9m     21129 138298.91      169
21            2.8h       18m     24852   8853.76      169
22           10.7h       13m     36009   3358.79      169
23             28m       28m     36791  79073.19      169
24            9.5h       32m     46482   4875.02      179
25            3.3h       47m     53342  16260.05      179
26           20.7h       73m     66038   3187.25      179
27           24.3h      2.3h     77218   3175.34      179
28           27.0h      2.5h     92862   3444.65      179
29           34.7h      2.2h    112256   3232.84      179
30            2.0d      4.4h    133683   2764.66      189
31            2.4d      4.7h    160523   2782.56      189
32            3.0d      6.0h    192710   2677.25      189
33            3.0d      6.1h    231234   3208.06      189
34            6.6d     12.9h    277984   1760.54      189
35            8.4d     17.0h    332967   1648.35      189
36           10.1d     20.9h    399534   1641.15      199

End: 36 Unlightings, Sunshaft 199, 2397047 Nightglass, 5.0d present of 59.9d
```
