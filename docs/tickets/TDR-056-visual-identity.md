# TDR-056: Visual identity pass

**Epic:** UI/UX · **Size:** S · **Depends on:** none (rebase onto 050 if it has landed) · **Blocks:** none

## Why

The palette has a meaning the interface does not follow. Gold is the enemy's colour in the scene (lanterns, radiance, Lampwardens) and the reward colour in the panel (earned omens, unread dots). Sizes, radii and spacing are set per rule with no scale. A short pass makes the look deliberate and gives later tickets tokens to use. (REVIEW U-7, `UI_UX_GUIDE.md` sections 2 and 3.)

## Spec

All in `public/css/style.css` unless noted. No layout changes.

### 1. Tokens

Add to `:root` and replace literals across the file:

```css
--t-xs: 12px; --t-sm: 13.5px; --t-md: 15px; --t-lg: 17px; --t-xl: 22px;
--s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px;
--r-ctl: 8px; --r-row: 10px; --r-panel: 14px;
--badge: var(--gloom);
--ink: #efeaff;            /* headings, names */
--surface-0: var(--bg); --surface-1: var(--panel); --surface-2: var(--panel2);
--above: var(--light);     /* anything from the surface */
```

Font sizes of 12.5, 13, 14, 15.5, 16, 19, 20, 21 and 24 px collapse to the nearest token. Check each screen after.

### 2. The gold rule

| Element | Now | Change to |
| --- | --- | --- |
| `.omen.got` border and name | `--light` | `--gloom` border, `--ink` name, plus a check glyph before the name |
| `.tab .dot` (unread and affordable badges) | `--light` | `--badge` |
| `.shaft-box.boss`, radiance bar, lantern, Surface Clock strip | `--light` | keep, but reference `--above` |
| Lantern-on-screen dot on the Seat nav item (TDR-050) | n/a | `--above` (the one gold badge) |

Search the file for `--light` after the change. Every remaining use must be something from above.

### 3. Currency consistency

Wherever a number is a currency, colour it by currency: Gloom `--gloom`, Echoes `--echo`, Nightglass `--glass`. Audit: denizen and Working prices (Gloom), Rite prices (Echoes, already done), perk prices (Nightglass, already done), the shaft "Seal yields" figure (wrap the number in a span coloured `--echo`), the Unlighting yield (`--glass`, already done).

Add a small currency mark before prices so colour is not the only cue: Gloom `●`, Echoes `◆`, Nightglass `◇`. Marks are text, added in the render functions, with `aria-hidden` and the unit word kept after the number.

### 4. Rows and cards

- One elevation rule: panels `--surface-1`, rows and cards `--surface-2`, inputs `#0a0815`. Remove one-off backgrounds (`#211b3d`, `#1b1d3a`, `#0b0916`) by mapping them to tokens or adding `--surface-3` if a third level is truly needed.
- Buy buttons: fixed width 132 px on desktop, full width on mobile (already so). Align price baselines across rows.
- Hover and pressed states on rows that are fully clickable (cards) and none on rows that are not.
- Section headings (`.sub-head`) get a 1 px rule in `--line` beneath them.

### 5. Header

- The fathom subtitle uses small caps tracking as now. Add the Current name after it when TDR-023 exists ("Fathom 6 · Silted").
- Resource tiles: label, value, sub-value on a consistent three-line grid so tiles do not change height when the sub-value changes length.

### 6. Icon and theme colour

Leave the logo. Confirm `theme-color` in `index.html` and `manifest.webmanifest` both equal `--bg`.

### 7. Focus and selection

- `::selection` in `--gloom-deep` with white text.
- Scrollbars inside the log and the tab row: `scrollbar-color: var(--line) transparent`.

## Tests

- A small script test (`tests/css.test.js`): parse `style.css` as text and assert every `var(--light)` occurrence is inside a rule whose selector matches an allowlist of "from above" selectors. This keeps the rule from eroding.
- Playwright screenshots of every page at 1280 by 800 and 390 by 844 before and after, attached to the PR for review. No pixel assertions.

## Acceptance criteria

- [ ] Gold appears only on things from above.
- [ ] No raw hex colour outside `:root` except inside gradients that are built from tokens where possible.
- [ ] No font size outside the scale.
- [ ] Nothing moved: every page has the same structure as before.
- [ ] Contrast for all text is at least 4.5:1 (check `--dim` on `--surface-2`).
- [ ] Cache stamped or bumped.

## Out of scope

Layout changes (TDR-050). New components (TDR-051). A light theme.
