# TDR-031: The Almanac, moon, solstices and eclipses

**Epic:** Retention · **Size:** L · **Depends on:** 030 · **Blocks:** 035 (some Pane lights)

## Why

The Surface Clock gives a daily rhythm. The Almanac gives monthly and yearly ones, and a visible list of dates the game is waiting for. The Eclipse Choir has been "rehearsing the moment the sun is covered" since the first build. On a real eclipse, it performs. (GDD P1.)

## Spec

All of this is computed from the device date. No network.

### 1. Moon

- Synodic month `29.530588853` days. Reference new moon: `2000-01-06T18:14:00Z` (Julian date 2451550.1).
- `moonPhase(wallMs)` returns a fraction in [0, 1): `((ms − ref) / (synodic × 86400000)) mod 1`. 0 is new, 0.5 is full. This simple model is accurate to within about half a day, which is enough.
- **Moonless Night**: phase under 0.034 or over 0.966 (about two days). Effect: Nightglass gained ×1.1 for an Unlighting performed during it (`glass` channel, applies regardless of `present` since Unlighting is always a present act).
- **Lidless Moon**: phase between 0.466 and 0.534. Effect: Echoes ×2 from Lampwarden shafts only, while present. Implement in `shaftReward` through a flag on the `sky` source, not the general `echo` channel.

### 2. Solstices and equinoxes

Fixed local-date windows, northern calendar. State in the Almanac that the surface above Vesperdeep keeps a northern year.

| Event | Window (local dates, inclusive) | Effect while present |
| --- | --- | --- |
| The Longest Night | 20 to 22 December | All Gloom ×2 |
| The Longest Day | 20 to 22 June | Echoes ×2 |
| The Balance | 19 to 21 March, 21 to 23 September | Gloom ×1.25 and Echoes ×1.25 |

### 3. Eclipses

A table `SKY.ECLIPSES` of local dates. On that date: Eclipse Choir output ×10 while present (`den.choir`), and a one-time reward per eclipse id.

**The dates below were written from memory and must be verified against the NASA GSFC solar eclipse catalogue before merging. Remove any that cannot be confirmed. Do not guess.**

| id | Date (UTC) | Type |
| --- | --- | --- |
| e2027a | 2027-02-06 | annular |
| e2027b | 2027-08-02 | total |
| e2028a | 2028-01-26 | annular |
| e2028b | 2028-07-22 | total |
| e2030a | 2030-06-01 | annular |
| e2030b | 2030-11-25 | total |
| e2031a | 2031-05-21 | annular |
| e2031b | 2031-11-14 | hybrid |
| e2033a | 2033-03-30 | total |
| e2034a | 2034-03-20 | total |
| e2035a | 2035-09-02 | total |

- Match on the player's **local** calendar date equal to the listed date. An eclipse is "seen" from Vesperdeep wherever the player is.
- Witnessing: the first time the game is open on that date, add the id to `S.sky.eclipses`. Each witnessed eclipse gives a permanent +2% to `gloom`, `might` and `echo`, capped at 10 eclipses.
- If the session implementing this has no network access to verify, ship the moon and solstices, leave `ECLIPSES` empty, and note it in `docs/tickets/README.md`.

### 4. Combined ceiling

Sky bonuses can coincide (Night, Longest Night). Cap the product of all temporary sky and petition factors at ×3 per channel, as `ECONOMY.md` section 4 requires. Apply the cap inside the `sky` source.

### 5. The Almanac page

A new sub-page (Ledger destination after TDR-050; a tab until then), unlocked with the Surface Clock.

- **Today**: phase of day, moon drawn as a simple disc with a CSS-masked shadow and its name (eight names: new, waxing crescent, first quarter, waxing gibbous, full, waning gibbous, last quarter, waning crescent), any active event and its effect.
- **Coming**: the next six dated things in order, each with a countdown in days: next Moonless Night, next Lidless Moon, next solstice or equinox, next eclipse. Example: "The Performance · 2 August 2027 · in 260 days".
- **Seen**: counts of each event kind witnessed, and the eclipse list with witnessed ones marked.
- Dates are formatted with `toLocaleDateString` using the device locale.

### 6. Text, Codex, Omens

- Whispers from `LORE_BIBLE.md` section 11 when an event begins while the game is open.
- Codex pages `moonless`, `lidless`, `longestnight`, `longestday`, `balance`, `performance` on first sight of each.
- Omens: "Nothing in the Sky" (first Moonless Night), "A Lamp Nobody Lit" (first Lidless Moon), "The Holiday" (Longest Night), "Sun, Crossed Out" (Longest Day), "Sung Through" (an eclipse). Flags in `S.sky.seen`.

### 7. Save and integrity

- `S.sky = { phases: {}, seen: {}, eclipses: {} }`, adopted against known ids only.
- Clock forward to an eclipse date grants that eclipse once. Accepted. The cap of 10 bounds it at ×1.22.
- Audit: none possible without a trusted clock. Say so in a comment.

## Tests

- `moonPhase` for known dates: new moon 2000-01-06 gives about 0; full moon 2000-01-21 gives about 0.5 (tolerance 0.03). Add two recent known new moons from the same verification source as the eclipses.
- Event windows at their first and last local minute.
- An eclipse is granted once, and the 11th has no effect.
- The combined cap holds on a Longest Night at Night with a Gloom petition active.
- "Coming" list is sorted and never shows a past date.

## Acceptance criteria

- [ ] The Almanac shows the correct moon phase for today, checked against any published source.
- [ ] Every event is a bonus. None removes anything.
- [ ] Eclipse dates carry a source citation in a comment in `data.js`.
- [ ] Works offline and from `file://`.
- [ ] Baseline delta recorded (expect small).

## Out of scope

Lunar eclipses, meteor showers, location-based visibility, southern-hemisphere calendar option.
