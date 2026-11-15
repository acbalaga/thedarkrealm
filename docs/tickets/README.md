# Tickets

29 tickets. One per session, one per PR. Tick the box when merged.

Sizes: **S** under half a session, **M** one session, **L** one long session (split the PR if review gets hard, not the ticket).

## Index

### Foundations

| Done | Ticket | Size | Depends on |
| --- | --- | --- | --- |
| [x] | [TDR-001](TDR-001-core-extraction-and-tests.md) Extract rules into `core.js`, add tests | L | none |
| [x] | [TDR-002](TDR-002-ci-and-supply-chain.md) CI, static guards, dependency hygiene | M | 001 |
| [x] | [TDR-003](TDR-003-balance-simulator.md) Balance simulator and baseline | M | 001 |
| [x] | [TDR-004](TDR-004-modifiers-and-seeded-rng.md) Modifier registry, seeded RNG, save scaffolding | M | 001 |

### Security and integrity

| Done | Ticket | Size | Depends on |
| --- | --- | --- | --- |
| [x] | [TDR-010](TDR-010-dom-sinks-trusted-types-headers.md) Remove HTML sinks, Trusted Types, headers | M | none |
| [x] | [TDR-011](TDR-011-save-integrity-gaps.md) Save and input integrity gaps | S | 001 |
| [x] | [TDR-012](TDR-012-service-worker-atomic-updates.md) Service worker, atomic versions, update prompt | M | 002 |
| [x] | [TDR-013](TDR-013-save-durability-and-backups.md) Backups, file export, durability | M | 001, 010 |

### Mechanics

| Done | Ticket | Size | Depends on |
| --- | --- | --- | --- |
| [x] | [TDR-020](TDR-020-lantern-paths.md) Lanterns from both sides and down the chain | S | none |
| [x] | [TDR-021](TDR-021-lantern-kinds-and-processions.md) Lantern kinds, Processions, streaks | M | 020, 004 |
| [x] | [TDR-022](TDR-022-litanies.md) Litanies | M | 004 |
| [ ] | [TDR-023](TDR-023-currents.md) Currents | M | 004, 010 |
| [ ] | [TDR-024](TDR-024-vows.md) Vows and Keepings | M | 004, 023 |
| [ ] | [TDR-025](TDR-025-stewardship-automation.md) Bulk buying and automation | S | 004 |

### Retention

| Done | Ticket | Size | Depends on |
| --- | --- | --- | --- |
| [x] | [TDR-030](TDR-030-surface-clock.md) The Surface Clock | M | 004 |
| [ ] | [TDR-031](TDR-031-almanac.md) The Almanac: moon, solstices, eclipses | L | 030 |
| [ ] | [TDR-032](TDR-032-petitions-and-vigil.md) Petitions and the Vigil | M | 004, 010 |
| [ ] | [TDR-033](TDR-033-soundings-and-relics.md) Soundings and Relics | L | 004, 010 |
| [x] | [TDR-034](TDR-034-night-report.md) The Night Report | S | 001, 010 |
| [ ] | [TDR-035](TDR-035-the-pane.md) The Pane and two endings | L | 024, 031, 032, 033 |
| [ ] | [TDR-036](TDR-036-elder-shafts.md) The Elder Shafts | M | 003, 004 |

### Lore

| Done | Ticket | Size | Depends on |
| --- | --- | --- | --- |
| [x] | [TDR-040](TDR-040-codex-v2.md) Codex: learned order, categories, new pages | S | 001 |
| [x] | [TDR-041](TDR-041-court-chatter.md) Court chatter and persistent Whispers | S | 001 |

### UI and UX

| Done | Ticket | Size | Depends on |
| --- | --- | --- | --- |
| [x] | [TDR-050](TDR-050-information-architecture-and-mobile-shell.md) Five destinations, mobile shell | L | 010 |
| [x] | [TDR-051](TDR-051-feedback-layer.md) Toasts, next objective, affordability | M | 010 |
| [x] | [TDR-052](TDR-052-accessibility.md) Accessibility baseline | M | none |
| [ ] | [TDR-053](TDR-053-living-scene.md) A throne room that fills in | M | 050, 030 (both soft) |
| [ ] | [TDR-054](TDR-054-sound-and-haptics.md) Procedural sound and haptics | M | none |
| [ ] | [TDR-055](TDR-055-ledger-of-fathoms.md) Ledger of Fathoms, advisor, realm card | M | 004, 010 |
| [x] | [TDR-056](TDR-056-visual-identity.md) Visual identity pass | S | none |

## Recommended order

Within a wave, tickets on the same line can run in parallel sessions. Tickets on different lines touch the same code and are easier in sequence.

**Wave 0. Foundations**
1. TDR-020 (independent, user-visible, good first ticket)
2. TDR-001
3. TDR-002 · TDR-004
4. TDR-003

**Wave 1. Fixes and quick wins**
5. TDR-010
6. TDR-011 · TDR-012 · TDR-056
7. TDR-013 · TDR-052
8. TDR-051

**Wave 2. Shape**
9. TDR-050
10. TDR-040 · TDR-041 · TDR-034
11. TDR-021 · TDR-022
12. TDR-030

**Wave 3. Return loops**
13. TDR-031 · TDR-032
14. TDR-033 · TDR-025
15. TDR-023 · TDR-055
16. TDR-054 · TDR-053

**Wave 4. Long game**
17. TDR-024
18. TDR-035
19. TDR-036 (read its gate first)

## Rules that apply to every ticket

- Read `CLAUDE.md` first. Its constraints override anything a ticket seems to imply.
- "Starting value" means: put the number in `data.js`, then tune it with the simulator.
- A ticket that adds a multiplier records simulator results before and after in the PR description (`ECONOMY.md` section 5).
- A ticket that adds a saved field must pass the schema round-trip test from TDR-004.
- Where a ticket says "if TDR-0XX has landed", check the index above, not memory.
- If the code no longer matches what a ticket describes, stop and report the difference.

## Follow-up notes

Use this section for anything a session discovers that needs the owner's decision (a balance result outside its target, an eclipse date that could not be verified, a gate in TDR-036 that said stop).

- TDR-001: `maxBuy` can report one fewer than affordable when Gloom equals a denizen cost exactly (for example Hush-Warden, first one, k=4). The log estimate rounds down at the boundary and nothing corrects it upward. The shortfall is one bind and only on an exact match, so it was left alone (TDR-001 forbids behaviour changes). `tests/rules.test.js` pins the real contract: never over-reports, never more than one short. A fix is a one-line upward correction if the owner wants it.
- TDR-001: `npm test` runs `node --test "tests/**/*.test.js"`, not `node --test tests/`. Node 22 no longer accepts a bare directory. The quoted glob works on Node 21 and later.
- TDR-001: `core.js` also holds `fmt`, `fmtTime` and the Omen text helper, because the engine's own Whispers messages use them. The interface reads them from `engine`.
- TDR-002: the CI workflow could not be run from this session (no Actions access), so "CI is green on the PR" is unverified until a PR is opened. Action SHAs were taken from `git ls-remote` tags (checkout v4.3.1, setup-node v4.4.0). `wrangler` is pinned at 4.162.0, the version already in the lockfile. `tools/check-allow.json` holds the five current `innerHTML` lines for TDR-010 to empty.
- TDR-003: `casual` can first Unlight (yield of 1 or more) after 15 minutes of presence, outside the 60 to 120 minute target in GDD section 8. The first fathom then lasts 10 days under the simulator's 70 percent rule because of the Lampwarden wall at Sunshafts 100 to 109. Owner decision needed: move the target, or retune the opening. No balance number was changed. Also: the `idle` policy never gets started because nothing earns Gloom before the first hand gather, and all 13 perks plus Sunshaft 150 are reached by day 12 (`casual`), well short of the Pane's 30 day floor. See `docs/design/balance-baseline.md`.
- TDR-003: `tests/balance.test.js` guards the "first Unlighting possible" milestone over 3 days, not the rule-driven first Unlighting, because the rule-driven one falls on day 10 and cannot be reached in a 3 day run.
- TDR-004: the simulator baseline is unchanged for `casual` and `active` (diffed line for line against `docs/design/balance-baseline.md`). The realm seed now draws one number from `env.random` when a new realm is created, so the simulator feeds that one draw from a separate stream to keep its lantern rolls identical. Loading a save never draws.
- TDR-004: added an additive channel `autoHands` (Bound Hands, 4 gathers a second) so `recalc()` has no perk check left. It is listed in `ECONOMY.md` section 2. `awayCapHours` still reads the Unsleeping perk directly; it is outside `recalc()` and has no channel in the spec.
- TDR-004: the Unlighting screen in `game.js` works out "Gloom needed for the next Nightglass" from `GLASS_EXP` alone. When the first `glass` source lands (TDR-023 or later), that line must divide by the `glass` channel too.
- TDR-004: cost functions read the folded modifiers cached by `recalc()`. Code that edits `S.perks` or `S.rites` directly must call `recalc()` before asking for a cost (two existing tests were updated for this). Game code always goes through the buy functions, which do.
- TDR-010: the browser test is `tests/e2e/csp.spec.js`, run with `npm run e2e`. It is not in `npm test` or CI because it needs Playwright. It passed here under Chromium with the header CSP, including the `document.body.innerHTML` probe that Trusted Types must refuse. Firefox and Safari were not checked, and Safari's support for `require-trusted-types-for` is limited (it ignores the directive, so the check is defence in depth there, not a regression). The service worker registration on https was not exercised (the test server is plain http on localhost, where `register` still runs but its result is not asserted).
- TDR-010: a unit test of `h()` was not added because `h` lives inside the `game.js` closure. The e2e test covers it through the Import error text.
- TDR-011: Rites Remembered only matters for the audit through `ritesKept`. A save from before `runEchoes` existed has its current Rites treated as carried in, so the new check starts tracking from that load and cannot flag an honest old save. The fixture saves load with zero repairs. The Rite-spend check now also runs when Rites are partly kept, replacing the old check that only ran before the first Unlighting.
- TDR-011: an oversized v1 save is moved to `thedarkrealm.save.v1.unreadable` rather than deleted, in the same spirit as the v2 `.rejected` key. Keys under `.retired` and `.unreadable` are never read and are not removed by Erase.
- TDR-011: key repeat was tested in Chromium only. Browsers differ in whether `preventDefault` on a repeated Enter keydown stops the click, so check Firefox and Safari by hand.
- TDR-012: tested in Chromium end to end (`tests/e2e/update.spec.js`): the new version waits, the Realm tab offers it, applying reloads onto it, and the offline reload still loads. The update prompt is a Whisper plus a button and a dot on the Realm tab, because the toast layer (TDR-051) has not landed. Replace it when TDR-051 lands.
- TDR-012: a navigation to an unlisted path (for example `/nothing`) is no longer answered with the game page when offline. Only `/` and `/index.html` map to `./`. The 404 page is therefore not available offline either.
- TDR-012: the stamp covers every file in `FILES` except `js/version.js`, which holds it. `sw.js` itself is not hashed (the browser compares it byte for byte already), so a change to `sw.js` alone does not change `CACHE`.
- TDR-013: verified in Chromium (`tests/e2e/backup.spec.js`): download under the header CSP, import from a file, restore. Not checked: Safari and iOS Safari downloads, Android Chrome, and the `file://` meta CSP path. Check the download by hand on iOS before relying on it.
- TDR-013: Erase leaves one sealed backup (the import slot) so an erase can be undone. The Erase dialog says so. A player who wants every trace gone must also Discard it, which today means restoring or overwriting the slot; there is no "discard backup" button for sealed slots. Owner decision: add one, or accept.
- TDR-013: the daily slot is chosen from the local calendar day of the last observed time, so a device in a different timezone on its next visit can rotate a day early or late. It is harmless.
- TDR-020: verified in Chromium (`tests/e2e/lantern.spec.js`, screenshots written to the OS temp folder, not the repo): each path at 1280x800, rtl and drop at 390x844, tappable at 7 s. Hang stillness on the `drop` path was not measured numerically, only that it is inside the scene and tappable. Not checked: Safari and Firefox rendering of the individual `translate` property used for the bob (supported since Safari 14.1 and Firefox 72).
- TDR-020: the welcome-back Whisper and the 8 second clamp fire on any credited absence of 600 seconds or more, including a long hidden tab, because the tab resuming goes through `away()`.
- TDR-020: with `prefers-reduced-motion` the lantern still travels, as before. TDR-052 is the ticket for that.
- TDR-056: before and after screenshots were not attached (there is no PR yet). Screenshots of every page at 1280x800 and 390x844 can be regenerated with a Playwright script like the one in this session. The Fathom subtitle does not show a Current name yet because TDR-023 has not landed. Unearned omens are now dim text with an open circle mark instead of reduced opacity, which also does part of TDR-052's contrast work. Font sizes 10 and 11 were also moved onto the scale (to 12), which makes the resource tile labels a little larger.
- TDR-050: the destination map is a separate file, `public/js/nav.js`, so it can be unit-tested (`tests/nav.test.js`). `S.tab` is gone, replaced by `S.nav`; old saves map as the ticket says. A new save opens on the Seat (on a wide screen that resolves to Realm, because the Seat is the left column). The Realm tab is now "Ledger", with "Keeping" as its last sub-page. The `Apply update` button and the backups list live there.
- TDR-050: tested in Chromium at 390x844, 360x640, 768x1024 and 1280x800 (no sideways scroll, bar fully visible and not covering content, every button at least 44 px on phones, the well strip gathers, resize keeps state). Safari's dynamic toolbar and the notch inset were not checked on a real device. "Every existing page is reachable in at most two taps" holds from the bar (destination, then sub-page). The next-objective strip and toasts belong to TDR-051. Whispers on the Seat show 5 lines on phones (150 px).
- TDR-050: a lantern that appears while the scene is hidden keeps its place in its 14 second life, so returning to the Seat mid-flight shows it part of the way across. The Seat item in the bottom bar shows the one gold dot meanwhile.
- TDR-052: axe is run with `axe-core` 4.14.0 directly (devDependency, pinned exactly; published by Deque, repository `dequelabs/axe-core`, released 2026-10-05) rather than `@axe-core/playwright`. The wrapper is a thin layer over the same engine and brings a Playwright peer dependency that would clash with the preinstalled one. Axe is injected through `page.evaluate`, which the CSP does not block. Zero serious or critical findings on every destination at 1280x800 and 390x844 and in the Import dialog. It found and fixed: the scrollable Whispers list not being focusable, unlabelled save text fields, and the well strip's label not matching its visible text.
- TDR-052: the hot keys `1` to `3` for Litanies are not wired because Litanies (TDR-022) do not exist yet. Hot key `G` focuses the Stillwell on a wide screen, where the Seat is always on screen.
- TDR-052: `#log` keeps `aria-live` for now; TDR-051 moves announcements to the single live region and removes it. Not covered: a manual pass with a real screen reader, and the 200 percent zoom check was not run (the layout switches to the phone layout below 860 px, which a 1280 px window at 200 percent falls into).
- TDR-051: the toast queue is `public/js/toast.js` (pure, unit-tested) and the objective, ETA, event and breakdown logic lives in `core.js` (tested). The rules raise events (`engine.drainEvents()`) and the interface turns them into toasts; the rules already write their own Whisper for each, so those toasts do not write a second one. Items 2 and 3 of the objective table (offers, slack lines) are omitted until TDR-032 and TDR-033 add entries to `OBJECTIVES` in `data.js`.
- TDR-051: the Why popover for Gloom is a transparent button over the Gloom tile (so it is a 44 px target on phones); the one for Might is a button on the Sunshafts page. The Gloom list names sources by label: Nightglass, Omens, Rites, Workings, Nightglass perks, Lantern boon. Surface Clock and Petition sources will appear there on their own once they register as modifier sources.
- TDR-051: Echo income for the "in 3m 20s" line is a rolling 60 second average sampled once a second while the page is running; it resets after an away credit or any gap over 5 seconds. Update rate for the underlines and times is capped at twice a second. The full suite of 30 browser tests passed once; one objective test is timing sensitive under load (fixed to retry its clicks).
- TDR-040: all 24 pages from the lore bible are in `data.js` now, each with a `sys`. `LIVE_SYSTEMS` is `['core']`, so only the 25 original pages can unlock and count. Each later ticket adds its system name to that list (`sky`, `petitions`, `litanies`, `soundings`, `currents`, `vows`, `pane`, `elder`) and fills in the matching field of the facts object in `slowChecks()`. The Court pages sit in the `realm` category, as the ticket says. A hash of the original 25 pages' words is pinned in `tests/codex.test.js`.
- TDR-040: tapping the Ledger while Codex pages are unread opens the Codex (one tap from the badge). Opening or closing a page's title counts as reading it; new pages start open. Not browser-tested beyond the existing axe run, which covers the Codex page.
- TDR-041: chatter lines come verbatim from the lore bible (30 lines, 10 denizens). The simulator turns chatter off after loading, because chatter draws random numbers and the baseline (`docs/design/balance-baseline.md`) was built without it. The last 30 Whispers are kept under `thedarkrealm.log.v1` (outside the sealed save), written every 15 seconds and when the page is hidden, restored as plain text under an "earlier" divider. A line over 300 characters, a non-string entry or a non-array file is dropped, not repaired. The log is no longer a live region (TDR-051 did that), so chatter is never announced.
- TDR-034: a throttled tab (a monotonic gap over 90 seconds with the page running) now never opens a report and credits its time with one Whisper however long it was. That is what the ticket says, but it means a player who leaves a tab open in the background for hours and returns sees "The realm kept working. 6h 10m." and no Night Report. If that is not wanted, the rule is the `dm > 90` branch of `tick()`. A lantern boon that outlasts a throttled stretch keeps its remaining time; in a true absence boons are cleared as before. `tests/time.test.js` was updated for the new rule (reports only from 5 minutes of real absence).
- TDR-034: waiting lines are provider functions in `core.js` (`WAITING`); offers, slack lines and the sky phase will append to it. The Night Report chatter line is drawn from the same pool as the Whispers chatter and obeys the Court chatter setting.
- TDR-021: baseline delta is in the change log of `docs/design/balance-baseline.md` (`npm run baseline` regenerates its numbers). The time of first possible Unlighting is steady (casual 15 min, active 25 min against 30). The rule-driven first Unlighting swung by about 40 percent in each direction, which is noise from the new random draws and the 70 percent rule rather than a systematic speed-up. `tests/balance.test.js` still passes unchanged.
- TDR-021: Processions are not gated behind the ten-lantern unlock, so a new player's eighth lantern is a Procession. The ticket says "every eighth spawn" without a gate; say if it should wait. `S.lanternSpawns` is audited loosely against `lanterns` and `processions`. The Warden's Lamp falls back to a Stray Lantern outcome if the Host is no longer fighting a Lampwarden when it is snuffed. A Warden's Lamp spawns only while the Host is fighting a Lampwarden shaft.
- TDR-021: lantern omens were appended to the end of the omen list so existing omen ids did not move, and are grouped with the other lantern omens by set name. No Codex text was added.
- TDR-022: baseline delta is in the change log. `idle` and `casual` did not move. `active` got slower because the simulator's cheapest-Rite rule now buys the new Rite of the Long Breath, which does nothing for Gloom; the Litanies are used by `active` as specified. Owner decision: teach the policy to skip Rites that do not feed the economy, or leave it. Litanies are hotkeys 1 to 3 and the three buttons sit on the Seat and the Sunshafts page. `litanies` is now a live Codex system.
- TDR-022: a `step()` is cut where a Litany's effect ends, so one long step and many short ones give the same result. The Undertow pays 90 seconds of the rate without a Deep Hush. Away time never uses a Litany and takes the full away seconds off every cooldown.
- TDR-030: baseline delta is in the change log. The sky source is switched off in unit tests with `env.sky === false` (the test helper does it unless a test asks), so no rule test depends on the hour it runs; the production page never passes it. The simulator pins `TZ=UTC` and starts its clock at midnight so runs are identical on every machine. The `surfaceclock` Codex page uses its own system name `skyclock` (live); the other sky pages keep `sky` for TDR-031. Not browser-tested beyond the existing axe and layout runs.
