# TDR-055: Ledger of Fathoms, Unlighting advisor and realm card

**Epic:** UI/UX · **Size:** M · **Depends on:** 004, 010 · **Blocks:** none

## Why

The Unlighting screen shows a yield and nothing else. The player cannot tell whether now is a good time, how this fathom compares to the last, or whether they are getting faster. Run history and a rate turn the prestige loop from a guess into a decision. (REVIEW U-10.) The realm card gives players a way to show the game to someone else without any network feature.

## Spec

### 1. History

- `S.fathoms`: array of at most 20, newest last. Pushed in `unlight()` before the reset: `{ n, sec, glass, best, current, vow, kept }` where `n` is the fathom number, `sec` is `runTime`, `glass` is Nightglass gained, `best` is the deepest shaft sealed that fathom (track `S.runBest`, reset on Unlighting), `current` and `vow` are ids or `''`, `kept` is whether the vow was kept.
- If TDR-023 already added `S.fathoms`, extend it. Do not create a second list.
- `adopt()`: array, at most 20 entries, each field clamped, ids matched against tables. `audit()`: sum of `glass` over history cannot exceed `glassTotal`.

### 2. Rate tracking for the current fathom

- `S.peak = { rate, at }`: the highest Nightglass per hour seen this fathom and the `runTime` when it was seen. Sample in `slowChecks()`: `rate = glassGain() / (runTime / 3600)`, only when `runTime >= 300` and `glassGain() >= 1`.
- Reset on Unlighting.

### 3. Unlighting page

Add under the yield:

- "This fathom: 2h 14m · 38 Nightglass per hour (peak 51, 40 minutes ago)."
- "Last fathom: 3h 02m · 44 per hour."
- **Advisor line**, one of:
  - Not yet available: "The realm is not yet heavy enough."
  - Rate still within 90% of its peak: "The realm is still gaining weight quickly."
  - Rate between 60% and 90% of peak: "The gain is slowing. Letting go soon is reasonable."
  - Rate under 60% of peak: "The gain has slowed. The Ledger suggests letting go."
  - A Moonless Night is active (TDR-031): append "No moon tonight. The glass will be thicker."
  - A vow is active and unmet: append "The vow is not yet kept."
- The destination badge shows when the advisor reaches the last state, not only before the first Unlighting.
- Confirmation modal lists what is kept and what is lost in two short columns, built with nodes.

### 4. Fathoms page

A sub-page in Ledger (a section in the settings page until TDR-050 lands).

- A table, newest first: fathom, time, Nightglass, per hour, deepest shaft, current, vow (with a check when kept).
- A small bar chart of Nightglass per hour across the stored fathoms, drawn with plain `div` bars (heights via `el.style.height`). The tallest bar is labelled. Give the chart a text alternative: the table is the alternative, so mark the chart `aria-hidden`.
- Totals: fathoms, total time, best rate.

### 5. Realm card

A "Realm card" button in Keeping.

- Renders a 1200 by 630 canvas: the logo mark, "The Dark Realm", the player's title line ("Regent of Vesperdeep", or the ending title), fathom number, deepest shaft, Nightglass earned, omens, Pane lights if present, vigils if present, and time on the seat. Dark background, the palette's colours, serif numerals. Draw with canvas text and shapes only. Draw the logo from `icon.svg` through an `Image` (same-origin, allowed by `img-src 'self'`). If the image fails to load (it can on `file://` in some browsers because of canvas tainting rules), draw the card without it.
- Two actions: "Save image" (`canvas.toBlob`, then the same download path as TDR-013) and "Copy as text" (a five-line plain summary).
- Nothing is uploaded. There is no share target. The player sends the file themselves.
- No save data, seed or checksum appears on the card.

## Tests

- History push, cap at 20, clamps, audit sum rule.
- Peak tracking with a fake clock. The advisor state for each band.
- `runBest` resets and records correctly with the Remembered Road perk.
- Card text summary is built from state by a pure function. Test it.
- Playwright: open the card, assert the canvas is 1200 by 630 and not blank (sample a few pixels), and that "Save image" produces a download.
- Schema round-trip passes.

## Acceptance criteria

- [ ] The Unlighting page answers "is now a good time" in one sentence.
- [ ] The last 20 fathoms are listed with rates.
- [ ] The realm card can be saved and contains no save data.
- [ ] No network request is made by any of this.

## Out of scope

Automatic Unlighting. Graphs of Gloom over time. Sharing through the Web Share API.
