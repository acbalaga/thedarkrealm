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
| Sunshaft 150 (present) | never | 11.7 h | 18.3 h |
| Sunshaft 150 (elapsed) | never | 12.8 days | 9.3 days |
| All perks (present) | never | 11.6 h | 18.0 h |
| All perks (elapsed) | never | 12.7 days | 9.3 days |

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
Perk: Thrifty Dark                             11.9d     10.9h     11.5d
Perk: Remembered Road                          11.9d     10.9h     11.5d
Perk: The Steward                              11.9d     10.9h     11.5d
Perk: Rites Remembered                         11.9d     10.9h     11.5d
Perk: A Second Line                            11.9d     10.9h     11.5d
Perk: Lantern-Hunger                           12.3d     11.0h     11.9d
Perk: The Queen's Reflection                   12.5d     11.4h     12.1d
Perk: Further Down                             12.7d     11.6h     12.3d
All perks                                      12.7d     11.6h     12.3d
Sunshaft 150                                   12.8d     11.7h     12.4d
Relic set: The Drowned Table                   14.4d     12.9h     13.9d
Relic set: The Lamp Room                       15.5d     14.0h     15.1d
Relic set: The Sleeper's Bed                   25.3d     22.9h     24.9d
Relic set: The Queen's Things                  36.3d     33.0h     35.9d
All six relic sets                             36.3d     33.0h     35.9d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1            11.9d     10.9h       452      1.58      109
2             9.0h        5m       129     14.33      109
3             1.5h        7m       125     81.97      109
4             3.0h        9m       307    103.19      119
5             1.5h        7m       295    193.09      119
6              88m        3m       694    471.40      129
7             1.5h        5m       975    650.00      129
8             1.5h        5m      1095    730.00      129
9               3m        3m      3061  71094.19      139
10              2m        2m      2832  72822.86      142
11            4.4h       10m      8506   1925.28      159
12              4m        4m      3695  55425.00      159
13           32.9h       56m     34622   1051.28      169
14            1.5h        5m     13615   9076.67      169
15            1.5h        5m     14420   9613.33      169
16            1.6h        9m     21763  13878.97      169
17            2.9h        6m     22570   7697.96      169
18            4.5h       15m     28150   6255.56      169
19            3.0h       10m     32999  10999.67      169
20            9.1h        8m     40811   4506.74      175
21            8.9h       27m     46580   5207.70      179
22           16.5h       30m     57760   3500.61      179
23            9.0h       32m     68249   7554.08      179
24           18.0h       33m     80925   4504.52      179
25           19.5h       40m    101128   5186.05      179
26           28.5h       70m    117391   4118.98      189
27            2.8d      2.5h    142990   2118.37      189
28           37.5h      1.7h    169752   4526.72      189
29            3.9d      3.5h    203652   2189.81      189
30            4.8d      4.3h    244241   2142.46      189
31            4.8d      4.3h    292926   2536.16      189
32            5.3d      5.0h    351878   2759.83      199
33            4.7d      4.2h    422814   3758.35      199

End: 33 Unlightings, Sunshaft 199, 2531402 Nightglass, 2.3d present of 59.9d

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
Perk: Thrifty Dark                              8.8d     17.0h      7.9d
Perk: Remembered Road                           8.8d     17.0h      7.9d
Perk: The Steward                               8.8d     17.0h      7.9d
Perk: Rites Remembered                          8.8d     17.0h      7.9d
Perk: A Second Line                             8.8d     17.0h      7.9d
Perk: Lantern-Hunger                            8.8d     17.3h      7.9d
Perk: The Queen's Reflection                    8.8d     17.5h      7.9d
Perk: Further Down                              9.3d     18.0h      8.5d
All perks                                       9.3d     18.0h      8.5d
Sunshaft 150                                    9.3d     18.3h      8.5d
Relic set: The Drowned Table                   12.5d     24.5h     11.7d
Relic set: The Queen's Things                  19.5d     38.5h     18.7d
Relic set: The Sleeper's Bed                   24.3d      2.0d     23.5d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1             8.8d     17.0h       427      2.03      109
2              18m       18m       280    946.48      116
3              10m       10m       565   3390.00      116
4               2m        2m       270   8100.00      125
5            13.5h       30m      3720    275.47      139
6               4m        4m      2914  49954.29      148
7               5m        5m      5225  59714.29      148
8               7m        7m      6497  59213.16      149
9               5m        5m      4575  54900.00      154
10              4m        4m      5780  92480.00      156
11            3.6h        6m     14815   4116.87      159
12             12m       12m      9842  48205.71      159
13             17m       17m     11082  40298.18      168
14            5.5h       75s     15385   2786.72      168
15              9m        9m     17429 118385.66      169
16             10m       10m     21586 128445.62      169
17            2.7h       11m     28456  10599.23      169
18           11.0h       30m     40494   3681.27      169
19            4.0h       30m     39183   9795.75      169
20            6.0h       31m     46781   7782.42      179
21             22m       22m     55834 154024.83      179
22           13.6h       38m     66247   4861.67      179
23           10.2h       73m     79827   7814.47      179
24           17.9h       87m     95993   5349.46      188
25           20.2h      1.7h    115368   5703.44      189
26           27.8h      2.3h    137834   4953.85      189
27           20.2h      1.7h    165612   8203.13      189
28           33.6h      2.6h    205803   6125.09      189
29           27.0h      2.5h    240368   8902.52      189
30           45.3h      3.8h    288746   6370.37      189
31            2.1d      4.2h    346713   6842.08      199
32            3.5d      6.5h    415622   5007.49      199
33            6.0d     12.4h    498068   3449.12      199
34            9.5d     19.4h    597789   2611.38      199
35            5.0d     10.0h    717398   5977.56      199
36           13.9d     27.5h    860607   2584.36      209

End: 36 Unlightings, Sunshaft 209, 5163135 Nightglass, 5.0d present of 59.9d
```
