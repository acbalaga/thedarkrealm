# TDR-035: The Pane and the two endings

**Epic:** Retention · **Size:** L · **Depends on:** 024, 031, 032, 033 · **Blocks:** none

## Why

The game stops at Sunshaft 150 with nothing left to want. The Codex already promised a second act: every shard is a piece of one pane, and a Regent keeps the chair warm until the pane is whole. The Pane is the long goal that ties every system together, and it ends in a choice. (REVIEW M-6, GDD P3.)

## Spec

### 1. Twenty-four lights

A light is lit when its condition is true. Lights are **derived from other saved state at load and on change**. They are never stored as earned, so they cannot be forged separately from what justifies them. Store only `S.pane.seen` (which lights the player has been shown, for the "new" badge) and `S.pane.choice`.

`PANE` in `data.js`, ids `p01` to `p24`, in this order (it is also the drawing order, clockwise from the top).

| # | Light | Condition |
| --- | --- | --- |
| 1 | The Shard You Woke With | `glassTotal >= 1` |
| 2 | The First Lamp | `bestShaft >= 150` |
| 3 | Ten Fathoms | `unlightings >= 10` |
| 4 | All Settings | every perk owned |
| 5 | The Moths' Revenge | `lanterns >= 100` |
| 6 | A World Below | 2,000 denizens at once (the existing omen) |
| 7 to 12 | The six Keepings | one per kept vow |
| 13 to 18 | The six Shelves | one per completed relic set |
| 19 | Nothing in the Sky | a Moonless Night seen |
| 20 | The Holiday | a Longest Night seen |
| 21 | Sung Through | an eclipse witnessed |
| 22 | A Month Below | 30 vigils |
| 23 | The Whole Ledger | every Codex page that exists before the endings is unlocked |
| 24 | Every Sign | every Omen that exists before the endings is earned |

Light 21 depends on a real eclipse. If `SKY.ECLIPSES` shipped empty, replace its condition with "the Longest Day seen" and note it.

Each lit light gives ×1.03 to `gloom`, `might` and `echo`. Register a source `pane`. All 24 is ×2.03.

### 2. The Pane page

Under the Deep destination (a section of the Unlighting tab until TDR-050 lands). Visible from the first Nightglass. Codex page `pane` unlocks then.

- A round window drawn in SVG built with `createElementNS` (no markup strings): 24 wedge-shaped lights in two rings (8 inner, 16 outer) with dark leading. Unlit lights are near-black. Lit lights are filled with the glass colour at varying opacity.
- Tapping or focusing a light shows its name and condition, and progress where it is countable ("Ten Fathoms · 6 of 10").
- A list view of the same 24 below the window for screen readers and narrow screens. The SVG is `aria-hidden` and the list carries the information.
- Count and bonus: "9 of 24 lights. Gloom, Might and Echoes ×1.30."
- Newly lit lights get a toast and a badge on the destination until viewed.
- At 12 lights, Codex page `pane_half`.

### 3. The ending

When all 24 are lit and `S.pane.choice === ''`, show the modal "The Pane, Whole" with the text from `LORE_BIBLE.md` section 9 and two buttons: "Give her the seat" and "Keep the chair". The modal cannot be dismissed, but it can be postponed with a third, quiet button "Not yet", after which a "The pane is whole" button stays on the Pane page.

Each choice asks once more: "This cannot be taken back." Then:

- Set `S.pane.choice` to `'returned'` or `'kept'`.
- Unlock Codex page `end_returned` or `end_kept`.
- Change the subtitle under the title to "The Queen's Shadow" or "The Second Queen".
- Add a body class `ending-returned` or `ending-kept` for the scene tint (used by TDR-053; harmless before it).
- Earn one Omen: "Hers" or "Yours". Only one of the two can ever be earned in a save. The Omens page total should count them as one slot.

Play continues. Nothing is taken away.

### 4. Save and audit

- `S.pane = { seen: {}, choice: '' }`. `choice` adopted only as one of the three values, and forced to `''` unless all 24 conditions hold at load.
- Nothing else to audit: lights are derived.

## Tests

- Each condition lights its light from a hand-built state.
- A save claiming `choice: 'kept'` with 10 lights loads with `choice: ''`.
- The `pane` source factor equals `1.03^n`.
- Lights 23 and 24 exclude ending-only pages and omens, so they are reachable before the choice.
- The ending modal appears once at 24 and not again after a choice.
- Simulator: report the day each light is lit for `casual` and `active`. Target for the 24th: between day 30 and day 120. Report which light is last. If it is always the same one by a wide margin, say so in the PR.

## Acceptance criteria

- [ ] The window and the list always agree.
- [ ] No light can be lit by editing the Pane's own saved fields.
- [ ] Both endings are reachable and each shows its page, title and omen.
- [ ] The choice is confirmed twice and is permanent.
- [ ] The page is usable at 360 px and by keyboard.

## Out of scope

A third ending. New Game Plus. Changing bonuses by ending.
