# Balance baseline

Measured with `tools/sim.js` (TDR-003) on the build at the end of TDR-002. Seed 1, 60 simulated days, three player policies. The simulator drives the real engine with a fake clock, so away time, the 8 hour cap and the away pace behave as in play. It steps 5 seconds at a time while the player is present.

Regenerate with `npm run sim -- --days 60 --seed 1`. Same seed, same output.

**Elapsed** is wall time since the first launch. **Present** is time the policy was actually at the screen. **Played** is the game's own `played` counter, which includes credited away time.

## Answers

| Question | idle | casual | active |
| --- | --- | --- | --- |
| First Unlighting that yields Nightglass is possible (present) | never | 15 min | 25 min |
| First Unlighting under the simulator's rule (present) | never | 8.7 h | 19.0 h |
| First Unlighting under the rule (elapsed) | never | 9.6 days | 9.8 days |
| Sunshaft 150 (present) | never | 10.3 h | 20.6 h |
| Sunshaft 150 (elapsed) | never | 11.4 days | 10.5 days |
| All perks (present) | never | 10.1 h | 20.1 h |
| All perks (elapsed) | never | 11.3 days | 10.3 days |

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
Sunshaft 100                                    5.3d      4.7h      5.1d
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
Perk: Further Down                             11.3d     10.1h     10.9d
All perks                                      11.3d     10.1h     10.9d
Sunshaft 150                                   11.4d     10.3h     11.1d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1             9.6d      8.7h       386      1.67      109
2             3.0h       10m       121     40.33      109
3             3.0h       10m       139     46.33      109
4            10.5h       10m       412     39.24      109
5             3.0h       10m       319    106.33      119
6               4m        4m       277   4638.14      119
7              86m       85s       354    245.79      119
8             1.5h        5m       971    647.33      129
9               5m        5m       601   7591.58      129
10           17.9h       30m      4156    231.91      139
11            1.5h        5m      4502   3001.33      139
12            1.5h        5m      4224   2816.00      149
13            1.5h        5m      6323   4215.33      159
14            1.5h        5m      6138   4092.00      159
15            1.5h        5m      6917   4611.33      159
16              2m        2m      7388 231276.52      159
17             88m        3m      9226   6284.50      159
18            1.5h        5m     11352   7568.00      159
19            1.5h        5m     12916   8610.67      159
20            3.0h       10m     15991   5330.33      159
21           10.5h       10m     20729   1974.19      169
22            6.0h       20m     24133   4022.17      169
23            4.5h       15m     28159   6257.56      169
24           12.0h       15m     33152   2762.67      169
25           10.5h       35m     40614   3868.00      169
26           18.0h       35m     48076   2670.89      179
27           19.5h       42m     58357   2988.83      179
28           28.5h       69m     69828   2452.26      179
29           21.0h       45m     84083   4003.95      179
30            2.3d      2.3h    100446   1808.39      189
31            2.6d      2.2h    120541   1914.70      189
32            2.4d      2.4h    144761   2474.55      189
33            3.8d      3.4h    173177   1892.21      189
34            6.3d      5.9h    207897   1372.45      189
35            4.9d      4.5h    249447   2130.58      189
36            7.6d      6.7h    300296   1655.25      189
37           10.0d      9.2h    361503   1506.26      199

End: 37 Unlightings, Sunshaft 199, 2157912 Nightglass, 2.3d present of 59.9d

Policy active, 60 days, seed 1

Milestone                                    Elapsed   Present    Played
First Sunshaft sealed                           8.0h        2m      8.0h
First Rite                                      8.0h        2m      8.0h
Sunshaft 10                                     8.0h        3m      8.0h
Sunshaft 50                                     8.3h       20m      8.3h
Unlighting first possible (yield >= 1)          8.4h       25m      8.4h
Sunshaft 100                                    3.3d      6.1h      3.0d
First Unlighting                                9.8d     19.0h      8.8d
Perk: The First Absence                         9.8d     19.0h      8.8d
Perk: Keen Dark                                 9.8d     19.0h      8.8d
Perk: Deep Vein                                 9.8d     19.0h      8.8d
Perk: Echoing Halls                             9.8d     19.0h      8.8d
Perk: Unsleeping                                9.8d     19.0h      8.8d
Perk: Bound Hands                               9.8d     19.0h      8.8d
Perk: Thrifty Dark                              9.8d     19.0h      8.8d
Perk: Remembered Road                           9.8d     19.0h      8.8d
Perk: The Steward                               9.8d     19.0h      8.8d
Perk: Rites Remembered                          9.8d     19.0h      8.8d
Perk: Lantern-Hunger                            9.9d     19.5h      8.9d
Perk: The Queen's Reflection                    9.9d     19.8h      9.0d
Perk: Further Down                             10.3d     20.1h      9.4d
All perks                                      10.3d     20.1h      9.4d
Sunshaft 150                                   10.5d     20.6h      9.6d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1             9.8d     19.0h       435      1.86      109
2             3.0h       30m       439    146.33      109
3              21m       21m       300    870.97      119
4            10.7h        9m      1779    166.96      129
5               6m        6m      1360  13791.55      129
6               8m        8m      3981  28379.41      145
7               2m        2m      1834  50787.69      145
8               3m        3m      2846  66100.65      145
9               3m        3m      2844  55342.70      149
10              7m        7m      3169  28521.00      149
11            3.5h       70s      5933   1685.78      149
12              9m        9m      4989  35216.47      156
13              6m        6m      6010  64585.07      158
14             11m       11m     10636  58457.40      159
15              4m        4m      9551 159923.72      159
16            5.5h       85s     11795   2135.38      159
17              8m        8m     15392 109725.15      159
18              8m        8m     16659 126257.68      159
19              7m        7m     20337 183033.00      159
20            2.7h       14m     24061   8820.73      169
21             17m       17m     29070 101113.04      169
22           14.6h       36m     36962   2531.40      169
23            6.2h       41m     42484   6880.00      169
24           13.8h       50m     56633   4096.42      179
25            4.5h       59m     61906  13790.94      179
26           19.5h       61m     86048   4410.21      179
27           28.0h      2.5h     91615   3271.96      179
28           30.4h      2.9h    110352   3629.17      189
29           47.9h      3.9h    131992   2757.49      189
30           27.1h      2.6h    158286   5838.42      189
31           47.8h      3.8h    190409   3986.23      189
32            4.0d      7.8h    228557   2384.56      189
33            5.5d     10.5h    274578   2096.02      189
34            5.0d     10.0h    330726   2756.05      199
35            6.4d     13.1h    394923   2563.56      199
36           10.1d     20.7h    473779   1947.78      199

End: 36 Unlightings, Sunshaft 199, 2842670 Nightglass, 5.0d present of 59.9d
```
