# UI and UX guide

Rules every interface ticket follows. Where this file and a ticket disagree, the ticket wins and this file gets updated in the same PR.

## 1. Principles

1. **The seat is home.** The Stillwell, the sky, active effects and the one next thing to do are on the first screen at every size.
2. **Show distance, not only price.** Every purchasable thing shows how far away it is.
3. **Important things interrupt once, quietly.** A toast, then a record in the log. Never a modal for good news except endings and the Night Report.
4. **Nothing moves unless the player allows motion.** Respect `prefers-reduced-motion` by default.
5. **One hand, 360 px.** If it does not work with a thumb on a narrow phone it is not done.

## 2. Colour has meaning

The palette is already in `:root` in `style.css`. The meanings below are binding.

| Token | Hex | Means | Use for | Never for |
| --- | --- | --- | --- | --- |
| `--gloom` | `#a896ff` | The realm, the player | Gloom values, primary actions, focus rings, good news, unread dots, earned omens | Anything from above |
| `--echo` | `#6fd6c4` | The dead, memory | Echo values, Rites, Soundings, the Sea | |
| `--glass` | `#c9d4ff` | Nightglass, the Queen | Unlighting, perks, the Pane, Keepings | |
| `--light` | `#f1c56b` | **The enemy** | Lanterns, Sunshafts, Lampwardens, radiance bars, the Surface Clock, sky events | Rewards, success states, notifications |
| `--danger` | `#e0606e` | Destruction | Erase, irreversible confirms, errors | |
| `--dim` | `#8e87ad` | Secondary text | | Body text smaller than 13 px |

Current violations to fix in TDR-056: earned omens use a gold border, unread tab dots are gold.

Sky events are things from above, so they are gold even though they help the player. That tension is intended: the Concord's working day is the realm's harvest.

## 3. Type and spacing

- Serif (`--serif`) for names, lore, numbers that matter. Sans (`--sans`) for labels, controls, small data.
- Sizes: 12 label, 13.5 secondary, 15 body, 17 sub-head, 21 to 24 title. Add these as tokens in TDR-056 (`--t-xs` to `--t-xl`).
- Spacing scale 4, 8, 12, 16, 24. Radius 8 for controls, 10 for rows and cards, 14 for panels.
- Numbers use `font-variant-numeric: tabular-nums`.
- Minimum touch target 44 by 44 CSS px. Minimum text contrast 4.5:1, including disabled and locked states. Locked items use a lock glyph and `--dim` text at full opacity, not reduced opacity.

## 4. Information architecture (TDR-050)

Five destinations. Sub-pages are a segmented control at the top of the destination.

| Destination | Icon glyph | Sub-pages | Badge when |
| --- | --- | --- | --- |
| **Seat** | ◉ | (single) Stillwell, sky strip, effects, Litanies, next objective, Whispers | A Petition is waiting, a Sounding has returned |
| **Realm** | ✦ | Denizens, Workings | A Working is affordable |
| **Host** | ☗ | Sunshafts, Rites, Soundings | Sounding returned |
| **Deep** | ◈ | Unlighting, Vows, The Pane | First Unlighting available, a new light lit |
| **Ledger** | ✎ | Omens, Codex, Almanac, Fathoms, Keeping (settings) | Unread Codex page |

Locked destinations and sub-pages are hidden until unlocked, as today.

**Desktop (861 px and up).** Two columns as now. Left column is the Seat, always visible. Right column has the other four destinations as top tabs with their segmented sub-pages. The Seat is not a tab on desktop.

**Mobile (860 px and under).** One column. A fixed bottom bar with the five destinations, 56 px tall plus the safe-area inset. The header shrinks to one row: Gloom and rate on the left, Echoes and Nightglass as compact chips on the right. On every destination except Seat, a 56 px **well strip** is pinned under the header: a small Stillwell button on the left (tap to gather), the latest Whisper in one line on the right. This keeps gathering available while shopping, which fixes finding U-1.

## 5. Components

**Buy row and card.** Name, count or level, one line of description, one line of data. The button shows label, price, and a 2 px progress underline filled to `min(1, have / cost)`. When unaffordable and income is positive, the price line alternates with "in 3m 20s". When income is zero it shows the price only. Unaffordable Max mode reads "Bind" with the next single price, not "Bind ×1".

**Toast.** Bottom centre on desktop, above the bottom bar on mobile. One at a time, queue of five, 4 s each, tap to dismiss, tap body to go to the source. Kinds: omen, codex, unlock, sky, sounding, keeping. Colour by meaning from section 2. Toasts are announced through one polite live region. Court chatter and routine Whispers are not announced.

**Next objective strip.** One line on the Seat under the well. Picks the first applicable from an ordered list (see TDR-051). Tapping it goes to the relevant page.

**Sky strip.** One line at the top of the scene: a phase glyph, the phase name, its effect, and time to the next phase. Moon glyph when a moon event is active. Tapping opens the Almanac.

**Effect chips.** Top-left of the scene. Lantern buffs, Litanies in effect, Petition in effect, Current, Vow. Each is a pill with a name and a countdown or "this fathom".

**Modal.** Used for: confirmations of irreversible acts, the Night Report, endings, import and export, the choice of Current and Vow. Focus is trapped. Escape and backdrop close it unless the modal is a required choice. `role="dialog"`, `aria-modal`, `aria-labelledby`. Focus returns to the opener.

**Progress bar.** As today. Radiance is gold. Boss timer is teal. Soundings use teal. The Pane uses glass.

## 6. Motion and sound

- Default `opts.motion` to `!matchMedia('(prefers-reduced-motion: reduce)').matches` on a fresh save.
- With motion off: no canvas motes, lanterns appear in place and fade, toasts appear without sliding, scene layers are static.
- Durations: 80 ms press, 200 ms state change, 350 ms emphasis. No easing longer than 400 ms except lantern travel.
- Sound is off until the first user gesture, then on at 40% by default with a slider and a mute toggle in Keeping. All sound is synthesised with WebAudio. No audio files.

## 7. Accessibility baseline

- Everything reachable and operable by keyboard. Visible focus on every control.
- Tabs follow the WAI-ARIA tabs pattern: `tablist`, `tab`, `tabpanel`, `aria-controls`, `aria-selected`, arrow keys move, Home and End jump.
- Hotkeys (shown in Keeping, all can be turned off): `Space` gather when the well is focused, `1` to `3` Litanies, `G` Seat, `R` Realm, `H` Host, `D` Deep, `L` Ledger, `Esc` close.
- Moving targets have a non-moving alternative: with motion off, lanterns stand still, and a "Snuff" button appears in the effect area for keyboard users while a lantern is present.
- Text can be selected in the Codex, Whispers and modals. Page zoom to 200% does not clip.
- No information by colour alone. Earned omens have a check glyph. Lampwarden shafts have a label.

## 8. Writing in the interface

Follow `LORE_BIBLE.md` section 2. In addition:

- Labels name the thing: "Gloom", "Echoes", "Might". Do not rename existing terms.
- Numbers first, then unit: "4.2M Gloom".
- Durations use `fmtTime`. Clock times use the device locale, 24 h or 12 h as the device prefers.
- Errors say what happened and what to do, in the narrator's voice where it stays clear: "This browser is refusing to store the save. Export it from Keeping."
