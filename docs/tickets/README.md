# Tickets

29 tickets. One per session, one per PR. Tick the box when merged.

Sizes: **S** under half a session, **M** one session, **L** one long session (split the PR if review gets hard, not the ticket).

## Index

### Foundations

| Done | Ticket | Size | Depends on |
| --- | --- | --- | --- |
| [ ] | [TDR-001](TDR-001-core-extraction-and-tests.md) Extract rules into `core.js`, add tests | L | none |
| [ ] | [TDR-002](TDR-002-ci-and-supply-chain.md) CI, static guards, dependency hygiene | M | 001 |
| [ ] | [TDR-003](TDR-003-balance-simulator.md) Balance simulator and baseline | M | 001 |
| [ ] | [TDR-004](TDR-004-modifiers-and-seeded-rng.md) Modifier registry, seeded RNG, save scaffolding | M | 001 |

### Security and integrity

| Done | Ticket | Size | Depends on |
| --- | --- | --- | --- |
| [ ] | [TDR-010](TDR-010-dom-sinks-trusted-types-headers.md) Remove HTML sinks, Trusted Types, headers | M | none |
| [ ] | [TDR-011](TDR-011-save-integrity-gaps.md) Save and input integrity gaps | S | 001 |
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

- (none yet)
