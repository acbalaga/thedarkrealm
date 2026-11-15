# TDR-052: Accessibility baseline

**Epic:** UI/UX · **Size:** M · **Depends on:** none (rebase onto 050 if it has landed) · **Blocks:** none

## Why

The basics are partly there (labels on the well and lantern, focus-visible styles, a live log) but the dialog and tabs are not operable to standard, motion ignores the system setting, and several states fail contrast or target size. (REVIEW U-6, B-4.) The baseline is `UI_UX_GUIDE.md` section 7.

## Spec

### 1. Modal

- `#modal .modal-card` gets `aria-labelledby="modal-title"` and `tabindex="-1"`.
- Focus trap: Tab and Shift+Tab cycle within the card.
- Escape closes when the modal is not a required choice. Add `required: true` to the modal options for the halted-tab modal, the ending choice, and the Current and Vow choice.
- Backdrop click follows the same rule. (Today it closes only when the queue is empty. Keep that guard.)
- On open, remember `document.activeElement`. On close, return focus to it if it is still in the document.
- While open, set `inert` on `header`, `main` and the bottom bar (fall back to `aria-hidden="true"` where `inert` is unsupported).

### 2. Tabs

Follow the WAI-ARIA tabs pattern for the destination row and for segmented sub-page controls:

- `role="tablist"` on the container, `role="tab"` on buttons with `aria-selected` and `aria-controls`, `role="tabpanel"` on pages with `aria-labelledby`.
- Roving `tabindex`: only the selected tab is in the tab order. Left and Right move and activate. Home and End jump.
- Buy-mode segments (×1, ×10, ×25, Max) are a radio group: `role="radiogroup"`, `role="radio"`, `aria-checked`, arrow keys.

### 3. Motion

- `fresh()` sets `opts.motion` from the system: `!matchMedia('(prefers-reduced-motion: reduce)').matches`. Core cannot read `matchMedia`, so pass it in through `env.prefersReducedMotion`.
- Existing saves keep their stored choice.
- With motion off: no motes, no lantern travel, no ring animation, no floater rise, no bar width transitions, no toast slide.
- Extend the CSS `prefers-reduced-motion` block to match, as a safety net for the moment before the script applies the class.

### 4. Lantern without chasing

- When a lantern is present, show a "Snuff" button in the effect area (top-left chips) that performs the same trusted action. It exists for keyboard and switch users and for anyone who cannot hit a moving target. It gives no advantage: same reward, same window.
- The moving lantern button stays focusable. Announce arrival once through the live region: "A lantern is passing."

### 5. Targets and contrast

- Minimum 44 by 44 px: `.seg-btn`, `.tab`, checkbox labels (make the whole label the target with padding), modal buttons, the lantern, Shallower and Deeper.
- Unearned omens: remove `opacity: .38`. Use `--dim` text on the normal card background with a lock glyph. Earned state is carried by a check glyph and border.
- Disabled buttons: replace `opacity: .42` with explicit colours that keep the label at 4.5:1 against the button (`color: var(--dim)`, a flatter background), and keep `disabled` for semantics.
- Check `.well-hint`, `.row-info`, `.card-cost` and `.res-sub` against 4.5:1 and adjust tokens, not individual rules.
- Focus ring: 2 px `--gloom` with 2 px offset on every interactive element, including the well strip button and bottom bar.

### 6. Keys

- `G`, `R`, `H`, `D`, `L` switch destination (letters match the labels). `Esc` closes modals and popovers. `1` to `3` Litanies when present.
- Ignored while focus is in a `textarea` or `input`, and when Ctrl, Alt or Meta is held.
- A "Keys" list in Keeping, with a toggle "Keyboard shortcuts" (default on), stored in `S.opts.keys`.
- Enter and Space on the well gather once per press (key repeat is already blocked by TDR-011; if that has not landed, add the guard here).

### 7. Text and zoom

- Remove `user-select: none` from `body` and apply it only to controls (`button`, `.tab`, the well). Prose should be selectable everywhere.
- At 200% zoom on a 1280 px wide window (equivalent to 640 px), nothing is clipped and no horizontal scroll appears.
- `document.title` currently changes twice a second, which some screen readers announce. Update it at most once every 10 s.

## Tests

- Playwright with `@axe-core/playwright` as a **devDependency**. Check the package is the one published by Deque before adding it, pin it exactly, and never ship it to `public/`. Run axe on each destination and on an open modal. Zero serious or critical violations.
- Keyboard walk: Tab reaches every control on each page in a sensible order. Arrow keys move between tabs. Escape closes a normal modal and does not close a required one. Focus returns to the opener.
- With `prefers-reduced-motion: reduce` emulated on a fresh save, `opts.motion` is false and no CSS animation is running (`document.getAnimations().length === 0` after 1 s).
- Target size check from TDR-050 passes on all listed controls.

## Acceptance criteria

- [ ] The game can be played from first gather to first Unlighting with a keyboard only.
- [ ] axe reports no serious or critical issues.
- [ ] Reduced motion is honoured by default.
- [ ] No state is conveyed by colour or opacity alone.

## Out of scope

Full screen-reader narration of numeric changes. Localisation. High-contrast theme.
