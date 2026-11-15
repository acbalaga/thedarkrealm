# The Dark Realm: game design document

## 1. One line

You are the dark. The light is coming for you. Keep the realm quiet, and keep the hours of the real sky.

## 2. The honest position

Under the theme this is a standard incremental: generators (Denizens), one-time upgrades (Workings), a random clickable (Stray Lanterns), auto-combat stages with timed bosses (Sunshafts), a second currency with repeatable upgrades (Echoes and Rites), and one prestige layer (Unlighting and Nightglass). A player who has finished two idle games has seen every system in it.

Reskinning does not make a game different. A game is different when its mechanics could not be lifted into another theme without breaking. The plan below adds four things that only make sense in a game where the player is the dark.

## 3. Pillars

Every ticket should serve at least one. A feature that serves none does not belong.

### P1. The realm keeps the real sky

The enemy is daylight, so the real day matters. The game reads the device's local clock and calendar (nothing else, no location, no network) and the realm responds:

- Night above, and Gloom runs down unopposed. Day above, and the chains are busy, so Echoes come faster. Dusk and dawn are shift changes, so lanterns come thick.
- The moon is computed from the date. A moonless night thickens Nightglass. A full moon keeps the Lampwardens working and paying out.
- The solstices are the realm's two holidays.
- Real solar eclipses are in a table. On those days the Eclipse Choir, which has been "rehearsing the moment the sun is covered" since the first build, finally performs.

This is the differentiator. It gives the player a reason to open the game at different times of day, a reason to look at the moon, and a date months away that the game is waiting for with them. It costs nothing to run and needs no server.

Every phase is a bonus. There is no bad time to play, only different times.

### P2. Light is an opponent, not a resource node

Today the Concord is a health bar. The plan makes it something the player acts against: Litanies (short active abilities used on Lampwardens), lantern Processions that reward attention, Vows that give up a tool for a fathom, and Currents that change what each fathom is good at.

### P3. A story that finishes

The Codex already sets up a second act: every shard of Nightglass is a piece of one pane, and a Regent keeps the chair warm until the pane is whole. The Pane becomes the endgame object. Twenty-four lights, each earned from a different system, ending in a choice with two endings. Idle games rarely end. This one ends twice.

### P4. Respect

No purchases, no ads, no accounts, no telemetry, and no mechanic that punishes the player for having a life. This is stated to the player and it is a feature. It also sets design rules:

- Return hooks are additive bonuses, never decay.
- Daily content counts days kept, not consecutive days. Missing a day costs nothing.
- Timed things wait for the player. A finished Sounding sits there until collected.
- The game says when to come back ("the realm will have worked its full 8 hours at 03:40") instead of sending notifications. It cannot send them anyway without a server.

### P5. Quiet

Sessions are two to five minutes, a few times a day. The interface should feel like checking on something that is doing fine without you. Sound is low and procedural. Text is dry. Nothing shouts.

## 4. Why a player comes back

| Rhythm | Hook | Ticket |
| --- | --- | --- |
| Seconds | Stillwell, lanterns from any side, Processions and snuff streaks | TDR-020, 021 |
| Minutes | Litanies on cooldown, Lampwarden attempts, next-objective strip | TDR-022, 051 |
| Hours | Away cap with a stated return time, Soundings on 1 h, 4 h and 12 h lines, the phase of the day changing | TDR-034, 033, 030 |
| Daily | One Petition a day (choose one of three), the Night Report, Vigil count | TDR-032, 034 |
| Weekly | Moon phase, a new Current each fathom, a Vow in progress | TDR-031, 023, 024 |
| Seasonal | Solstices, equinoxes, eclipses listed ahead in the Almanac | TDR-031 |
| Long | Relic sets, the Pane, two endings, Elder Shafts | TDR-033, 035, 036 |

The Almanac tab is the retention surface. It shows today's sky, what it does, and what is coming: "Moonless Night in 6 days. The Performance in 83 days."

## 5. Core loop after the plan

1. **Arrive.** The Night Report says what happened and hands over a welcome-back lantern. The header shows the phase of the sky.
2. **Spend.** Bind denizens, complete workings, perform rites. The next-objective strip names one thing worth doing.
3. **Act.** Grant today's Petition. Collect and relaunch a Sounding. Use Litanies on the Lampwarden at the frontier.
4. **Decide.** When the Unlighting advisor says the rate has peaked, choose a Current and optionally a Vow, and let go.
5. **Leave.** The Seat screen says when the away cap fills and when the Sounding returns.

## 6. Systems added

Specs are in the tickets. Text is in `LORE_BIBLE.md`. Numbers are in `ECONOMY.md`.

| System | What it is | Unlock |
| --- | --- | --- |
| Lantern paths and kinds | Left, right, lowered from above. Votive lanterns, Processions, snuff streaks. | From the start; kinds after 10 snuffed |
| Litanies | Three active abilities on cooldown. | With Rites |
| Surface Clock | Four phases of the real day, each a bonus. | With Sunshafts |
| Almanac | Moon, solstices, equinoxes, eclipses. | With the Surface Clock |
| Petitions | One daily choice of three boons or trades. | 25 denizens |
| Soundings | Timed lines into the Sunless Sea. Relics in six sets. | First Tidewell |
| Currents | Choose one of three fathom traits at each Unlighting. | First Unlighting |
| Vows | Give something up for a fathom, earn a permanent Seal. | Third Unlighting |
| The Pane | 24 lights from across all systems. Two endings. | First Nightglass (visible), completes late |
| Elder Shafts | Sunshafts 151 to 200, two new denizens, epilogue. | The First Lamp |

## 7. Non-goals

Do not build these. If a ticket drifts toward one, stop.

- Server, accounts, cloud saves, leaderboards, friends, chat.
- Purchases, ads, reward videos, premium currency.
- Analytics or crash reporting of any kind.
- Push notifications (not possible offline, and against P5).
- Consecutive-day streaks, limited-time items that can be permanently missed, energy systems, decay.
- Geolocation. The sky comes from the device clock only.
- Cryptographic save signing. The key ships with the game. See `SECURITY_MODEL.md`.
- A framework or bundler. See `CLAUDE.md`.

## 8. Measures of success

There is no telemetry, so these are checked by the simulator (TDR-003) and by hand.

- First Unlighting reachable in 60 to 120 minutes of mixed play. **Current value unverified.**
- No stretch longer than 10 minutes in the first hour without a new unlock, omen or codex page.
- A returning player has at least one new thing to do on every return after day 2 (Petition, Sounding, sky phase).
- The Pane cannot be completed in under 30 days of honest play, and can be in under 120.
- Every screen is usable one-handed at 360 px wide.
