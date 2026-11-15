# The Dark Realm: plan

This folder is the output of a full review of the game as of commit `1003666`. It holds the findings, the design direction, and 29 tickets sized for one working session each.

## What is here

| Path | Purpose |
| --- | --- |
| `review/REVIEW.md` | Findings from the code and mechanics review. Bugs, security gaps, UX problems, each mapped to a ticket. |
| `design/GDD.md` | Game design document. What the game is, what makes it different, why players come back, what it will not do. |
| `design/LORE_BIBLE.md` | Canon, voice rules, and every piece of new text the tickets need (codex pages, whispers, petitions, relics, endings). |
| `design/ECONOMY.md` | Current formulas, the modifier model, and the budget every new bonus has to fit in. |
| `design/UI_UX_GUIDE.md` | Information architecture, colour rules, components, mobile shell, accessibility baseline. |
| `design/SECURITY_MODEL.md` | Threat model for an offline client-side game, what is defended, what is accepted, rules for new features. |
| `tickets/README.md` | Ticket index, dependencies, execution order, status. |
| `tickets/TDR-*.md` | The tickets. |
| `../CLAUDE.md` | Standing rules for any session working in this repo. |

## How to execute a ticket

One ticket per session and per PR. Suggested prompt:

```
Read CLAUDE.md, docs/tickets/TDR-0XX-<name>.md, and the design docs it references.
Implement the ticket exactly as specified. Do not widen scope.
Where the ticket says "starting value", keep the number in data.js so it can be tuned.
Write the tests listed under Tests. Run npm test.
Tick the ticket in docs/tickets/README.md and open a PR against the default branch.
If the spec conflicts with the code as you find it, stop and list the conflicts instead of guessing.
```

## Order of work

The full dependency table is in `tickets/README.md`. The short version:

1. **Wave 0, foundations.** TDR-001 (core extraction and tests), TDR-002 (CI), TDR-004 (modifier registry and seeded RNG), TDR-003 (balance simulator). Everything after this is safer and faster because of it.
2. **Wave 1, fixes and quick wins.** Lanterns from both sides (TDR-020, no dependencies, can ship first), security hardening (TDR-010 to 013), accessibility (TDR-052), feedback layer (TDR-051).
3. **Wave 2, shape.** New information architecture and mobile shell (TDR-050), visual identity (TDR-056), codex and court chatter (TDR-040, 041), lantern kinds (TDR-021), litanies (TDR-022), night report (TDR-034), surface clock (TDR-030).
4. **Wave 3, return loops.** Almanac (TDR-031), petitions (TDR-032), soundings and relics (TDR-033), currents (TDR-023), automation (TDR-025), ledger of fathoms (TDR-055), sound (TDR-054), living scene (TDR-053).
5. **Wave 4, long game.** Vows (TDR-024), the Pane and second ending (TDR-035), Elder Shafts (TDR-036).

## Two things to know before starting

- **Balance numbers in the tickets are starting values.** Nothing in this plan was play-tested. TDR-003 builds a headless simulator. Every ticket that adds a multiplier must record its before and after milestone times with it.
- **Eclipse dates in TDR-031 must be verified** against the NASA GSFC eclipse catalogue before they are hardcoded. They were written from memory.
