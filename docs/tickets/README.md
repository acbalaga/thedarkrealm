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
| [ ] | [TDR-012](TDR-012-service-worker-atomic-updates.md) Service worker, atomic versions, update prompt | M | 002 |
| [ ] | [TDR-013](TDR-013-save-durability-and-backups.md) Backups, file export, durability | M | 001, 010 |

### Mechanics

| Done | Ticket | Size | Depends on |
| --- | --- | --- | --- |
| [ ] | [TDR-020](TDR-020-lantern-paths.md) Lanterns from both sides and down the chain | S | none |
| [ ] | [TDR-021](TDR-021-lantern-kinds-and-processions.md) Lantern kinds, Processions, streaks | M | 020, 004 |
| [ ] | [TDR-022](TDR-022-litanies.md) Litanies | M | 004 |
| [ ] | [TDR-023](TDR-023-currents.md) Currents | M | 004, 010 |
| [ ] | [TDR-024](TDR-024-vows.md) Vows and Keepings | M | 004, 023 |
| [ ] | [TDR-025](TDR-025-stewardship-automation.md) Bulk buying and automation | S | 004 |

### Retention

| Done | Ticket | Size | Depends on |
| --- | --- | --- | --- |
| [ ] | [TDR-030](TDR-030-surface-clock.md) The Surface Clock | M | 004 |
| [ ] | [TDR-031](TDR-031-almanac.md) The Almanac: moon, solstices, eclipses | L | 030 |
| [ ] | [TDR-032](TDR-032-petitions-and-vigil.md) Petitions and the Vigil | M | 004, 010 |
| [ ] | [TDR-033](TDR-033-soundings-and-relics.md) Soundings and Relics | L | 004, 010 |
| [ ] | [TDR-034](TDR-034-night-report.md) The Night Report | S | 001, 010 |
| [ ] | [TDR-035](TDR-035-the-pane.md) The Pane and two endings | L | 024, 031, 032, 033 |
| [ ] | [TDR-036](TDR-036-elder-shafts.md) The Elder Shafts | M | 003, 004 |

### Lore

| Done | Ticket | Size | Depends on |
| --- | --- | --- | --- |
| [ ] | [TDR-040](TDR-040-codex-v2.md) Codex: learned order, categories, new pages | S | 001 |
| [ ] | [TDR-041](TDR-041-court-chatter.md) Court chatter and persistent Whispers | S | 001 |

### UI and UX

| Done | Ticket | Size | Depends on |
| --- | --- | --- | --- |
| [ ] | [TDR-050](TDR-050-information-architecture-and-mobile-shell.md) Five destinations, mobile shell | L | 010 |
| [ ] | [TDR-051](TDR-051-feedback-layer.md) Toasts, next objective, affordability | M | 010 |
| [ ] | [TDR-052](TDR-052-accessibility.md) Accessibility baseline | M | none |
| [ ] | [TDR-053](TDR-053-living-scene.md) A throne room that fills in | M | 050, 030 (both soft) |
| [ ] | [TDR-054](TDR-054-sound-and-haptics.md) Procedural sound and haptics | M | none |
| [ ] | [TDR-055](TDR-055-ledger-of-fathoms.md) Ledger of Fathoms, advisor, realm card | M | 004, 010 |
| [ ] | [TDR-056](TDR-056-visual-identity.md) Visual identity pass | S | none |

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
