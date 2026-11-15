# Balance baseline

Measured with `tools/sim.js` (TDR-003) on the build at the end of TDR-002. Seed 1, 60 simulated days, three player policies. The simulator drives the real engine with a fake clock, so away time, the 8 hour cap and the away pace behave as in play. It steps 5 seconds at a time while the player is present.

Regenerate with `npm run sim -- --days 60 --seed 1`. Same seed, same output.

**Elapsed** is wall time since the first launch. **Present** is time the policy was actually at the screen. **Played** is the game's own `played` counter, which includes credited away time.

## Answers

| Question | idle | casual | active |
| --- | --- | --- | --- |
| First Unlighting that yields Nightglass is possible (present) | never | 15 min | 28 min |
| First Unlighting under the simulator's rule (present) | never | 12.8 h | 25.0 h |
| First Unlighting under the rule (elapsed) | never | 14.3 days | 12.8 days |
| Sunshaft 150 (present) | never | 14.1 h | 26.5 h |
| Sunshaft 150 (elapsed) | never | 15.5 days | 13.5 days |
| All perks (present) | never | 13.8 h | 26.3 h |
| All perks (elapsed) | never | 15.3 days | 13.3 days |

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
Perk: The Queen's Reflection                   14.9d     13.6h     14.3d
Perk: Further Down                             15.3d     13.8h     14.8d
All perks                                      15.3d     13.8h     14.8d
Sunshaft 150                                   15.5d     14.1h     15.0d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1            14.3d     12.8h       433      1.26      109
2             3.0h       10m       127     42.33      109
3             1.5h        7m       112     73.38      109
4             3.0h        8m       194     65.24      109
5             3.0h       10m       234     78.00      109
6             3.0h       10m       293     97.67      109
7               4m        4m       558   7726.15      119
8            10.4h        6m      2093    200.71      129
9               4m        4m      1492  24982.33      139
10             86m       85s      2245   1558.73      139
11              4m        4m      2292  36672.00      145
12             86m       75s      3105   2160.00      145
13            1.5h        5m      4961   3307.33      149
14            1.5h        5m      4400   2933.33      149
15              4m        4m      6367  89887.06      153
16            2.9h        6m      9609   3280.46      153
17            3.0h       10m     10463   3487.67      159
18            1.6h        9m     10319   6592.44      159
19           10.4h        6m     18463   1769.38      159
20            4.5h       15m     19224   4272.00      169
21            4.5h       15m     22302   4956.00      169
22            6.0h       20m     25126   4187.67      169
23           13.5h       20m     29970   2220.00      169
24            7.5h       25m     35926   4790.13      169
25           19.5h       40m     42258   2167.08      179
26           16.5h       30m     50996   3090.67      179
27           24.0h       55m     63777   2657.38      179
28           30.0h       75m     74092   2469.73      179
29            2.1d      2.0h     88372   1732.78      179
30            4.8d      4.3h    106240    931.93      179
31            3.4d      3.3h    127525   1574.38      189
32            5.8d      5.2h    152736   1106.78      189
33            5.8d      5.2h    184755   1338.80      189
34            6.0d      5.5h    220755   1533.02      189

End: 34 Unlightings, Sunshaft 189, 1321814 Nightglass, 2.3d present of 59.9d

Policy active, 60 days, seed 1

Milestone                                    Elapsed   Present    Played
First Sunshaft sealed                           8.0h        2m      8.0h
First Rite                                      8.0h        2m      8.0h
Sunshaft 10                                     8.0h        3m      8.0h
Sunshaft 50                                     8.3h       21m      8.3h
Unlighting first possible (yield >= 1)          8.5h       28m      8.5h
Sunshaft 100                                    6.3d     12.1h      5.7d
First Unlighting                               12.8d     25.0h     11.5d
Perk: The First Absence                        12.8d     25.0h     11.5d
Perk: Keen Dark                                12.8d     25.0h     11.5d
Perk: Deep Vein                                12.8d     25.0h     11.5d
Perk: Echoing Halls                            12.8d     25.0h     11.5d
Perk: Unsleeping                               12.8d     25.0h     11.5d
Perk: Bound Hands                              12.8d     25.0h     11.5d
Perk: Thrifty Dark                             12.8d     25.0h     11.5d
Perk: Remembered Road                          12.8d     25.0h     11.5d
Perk: The Steward                              12.8d     25.0h     11.5d
Perk: Rites Remembered                         12.8d     25.0h     11.5d
Perk: Lantern-Hunger                           12.9d     25.5h     11.6d
Perk: The Queen's Reflection                   13.3d     26.0h     12.1d
Perk: Further Down                             13.3d     26.3h     12.1d
All perks                                      13.3d     26.3h     12.1d
Sunshaft 150                                   13.5d     26.5h     12.3d

Fathom    Duration   Present     Glass   Glass/h  Deepest
1            12.8d     25.0h       472      1.54      109
2             3.0h       30m       264     88.00      109
3              18m       18m       370   1244.86      115
4            10.7h       12m       636     59.42      115
5               3m        3m       476   9018.95      119
6               6m        6m       469   4965.88      129
7               9m        9m      1113   7780.19      134
8               2m        2m      1257  39349.57      134
9               3m        3m      2048  40960.00      146
10              3m        3m      2364  44791.58      146
11              4m        4m      2175  34800.00      146
12            9.5h       31m     13733   1443.68      159
13              6m        6m      5077  50074.52      159
14              6m        6m      6392  68690.15      159
15             15m       15m      7370  28996.72      159
16            2.6h        3m     10472   4104.43      159
17              5m        5m     11767 130342.15      159
18             16m       16m     13366  50650.11      159
19           10.6h        9m     22070   2073.11      159
20             11m       11m     21110 113426.87      159
21            3.9h       22m     24973   6456.22      169
22            6.0h       30m     29598   4937.57      169
23            3.1h       38m     36888  11757.13      169
24           10.8h       19m     44515   4116.47      169
25           10.0h       60m     51799   5179.90      179
26           18.0h      1.5h     63673   3537.39      179
27           24.3h      2.3h     75372   3095.71      179
28           19.9h       86m     90507   4538.90      179
29           47.7h      3.7h    109889   2303.15      179
30            2.4d      5.0h    132167   2278.74      189
31            2.8d      5.5h    156477   2369.17      189
32            4.2d      8.5h    189491   1858.62      189
33            4.1d      8.5h    226070   2283.54      189
34            5.5d     10.5h    272383   2079.26      189
35           11.4d     23.2h    325393   1186.78      189

End: 35 Unlightings, Sunshaft 199, 1952196 Nightglass, 5.0d present of 59.9d
```
