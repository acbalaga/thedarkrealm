# TDR-051: Feedback layer, toasts, next objective and affordability

**Epic:** UI/UX · **Size:** M · **Depends on:** 010 · **Blocks:** none (012, 033, 035 use toasts when present)

## Why

The game does not tell the player when something good happens, what to do next, or how far away anything is. An Omen arrives as one line in a log that is 62 px tall on a phone. (REVIEW U-3, U-4, U-5, B-3, B-8, M-8.)

## Spec

### 1. Toasts

Component rules are in `UI_UX_GUIDE.md` section 5.

- `toast({ kind, title, text, go })`. `kind` is one of `omen`, `codex`, `unlock`, `sky`, `sounding`, `keeping`, `update`. `go` is an optional `{ dest, page }`.
- One visible at a time, queue of five, extra ones are dropped oldest first. 4 s each, paused while the pointer is over it or it has focus. Tap the close button to dismiss, tap the body to navigate.
- Placement: bottom centre on desktop, above the bottom bar on mobile.
- Each toast also writes its line to Whispers.
- One visually hidden `aria-live="polite"` element receives the toast text. Remove `aria-live` from `#log`.
- Wire up now: Omen earned ("Omen · A Lake of Night · +1% Gloom"), Codex page unlocked, a tab or system unlocking, a Lampwarden undone, first of each denizen. Routine Whispers (purchases, lantern results) do not toast.
- With motion off, toasts appear and disappear without sliding.
- Not shown while a modal is open. Hold them until it closes.

### 2. Next objective

One line on the Seat under the well (replace the static hint once `clicks >= 15`). Tapping it navigates. The first rule that applies wins. Keep the list in `data.js` as `OBJECTIVES`, each with a test and a text function, so tickets can add entries.

| Order | When | Text |
| --- | --- | --- |
| 1 | no denizens | "Gather 10 Gloom and bind a Wisp-Gleaner." |
| 2 | an offer is waiting (TDR-032) | "The denizens have intentions." |
| 3 | a line is slack (TDR-033) | "Draw up the line." |
| 4 | a Working is affordable | "A working is ready: Honed Hooks." |
| 5 | frontier is a Lampwarden the Host cannot beat in time | "The Host needs N× more Might for Lampwarden Orrin Vale." |
| 6 | Unlighting available and never performed | "The realm is heavy enough to let go." |
| 7 | a denizen kind not yet owned is within 10 minutes of income | "A Murk-Weaver in 4m 10s." |
| 8 | a Rite is affordable | "The Cantors can perform a rite." |
| 9 | next Omen within 25% | "A Sea of Night: 82%." (pick the closest by ratio among countable omens) |
| 10 | otherwise | "The realm is quiet." |

Entries for systems that do not exist yet are simply omitted until those tickets add them.

### 3. Affordability on every buy control

Applies to denizen rows, Working cards, Rite rows, perk cards.

- A 2 px underline inside the button filled to `min(1, have / cost)` in the currency's colour.
- When unaffordable and the relevant income is positive, a small line: "in 3m 20s". Gloom uses `C.gps`. Echoes use a rolling average of Echo income over the last 60 s of present time (keep a small ring buffer in the UI layer, not in the save). Nightglass shows no time.
- Over 24 hours shows "over a day". Zero income shows nothing.
- Max mode with nothing affordable reads "Bind" and the next single price, not "Bind ×1".
- Update at most twice a second to avoid layout churn.

### 4. Omens page

- Group omens by their set with a heading and a count ("Gloom gathered · 4 of 8").
- For countable sets show a thin progress bar toward the next unearned omen.
- Earned omens carry a check glyph (not colour alone).
- The header line stays: total and the bonus.

### 5. "Why" breakdown

Tapping the Gloom rate in the header opens a small popover listing the factors in `C.mods.gloom` by source name and value ("Nightglass ×3.4 · Omens ×1.12 · Rites ×2.2 · Night above ×1.25"). Same for Might on the Sunshafts page. Requires TDR-004. If it has not landed, skip this section and note it in the PR.

## Tests

- Toast queue: order, cap of five, hold while a modal is open, single live-region update per toast.
- Objective rules: each fires for a hand-built state, and order is respected when several apply.
- Time-to-afford formatting at 0 income, 59 s, 1 h, 25 h.
- Echo income average with a fake clock.
- Playwright: earn the first Omen and assert a toast is visible and the live region contains its text.

## Acceptance criteria

- [ ] Every Omen, Codex page and unlock is impossible to miss while the game is open, without a modal.
- [ ] The Seat always names one concrete thing to do.
- [ ] Every price shows progress, and a time when one can be computed.
- [ ] Screen readers announce toasts once and are not flooded by routine lines.
- [ ] No HTML strings.

## Out of scope

Tutorial overlays. Achievements with rewards beyond the existing +1%.
