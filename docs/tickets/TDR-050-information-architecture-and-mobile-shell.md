# TDR-050: Five destinations and a mobile shell

**Epic:** UI/UX · **Size:** L · **Depends on:** 010 · **Blocks:** 053 (soft), eases 031, 033, 035

## Why

On a phone the Stillwell and the buy buttons are never on screen together, and the tab strip already scrolls sideways with eight tabs. This plan adds at least five more surfaces. The structure has to change before they arrive. (REVIEW U-1, U-2.)

## Read first

`docs/design/UI_UX_GUIDE.md` sections 4 and 5. They are the spec. This ticket implements them.

## Spec

### 1. Destinations

Replace the flat `TABS` list with destinations that have sub-pages:

```js
var NAV = [
  { id: 'seat',   label: 'Seat',   glyph: '◉', pages: ['seat'] },                         // mobile only
  { id: 'realm',  label: 'Realm',  glyph: '✦', pages: ['den', 'work'] },
  { id: 'host',   label: 'Host',   glyph: '☗', pages: ['shaft', 'rite'], lock: 'shafts' },
  { id: 'deep',   label: 'Deep',   glyph: '◈', pages: ['unl'], lock: 'unlight' },
  { id: 'ledger', label: 'Ledger', glyph: '✎', pages: ['omen', 'codex', 'set'] }
];
```

- Existing page builders are reused unchanged. Only how they are mounted changes.
- Sub-pages are a segmented control at the top of the destination. Hidden when there is one page. Locked sub-pages are hidden (`rite` until Rites unlock).
- Later tickets register pages into a destination: Soundings into `host`, Vows and Pane into `deep`, Almanac and Fathoms into `ledger`. Provide `addPage(destId, pageDef)`.
- The settings page is retitled "Keeping". The word "Realm" now names the destination with denizens and workings.
- `S.tab` becomes `S.nav = { dest, page: { realm: 'den', ... } }` so each destination remembers its last sub-page. `adopt()` maps an old `tab` value to the right destination and page.

### 2. Desktop, 861 px and wider

- Two columns as now. The left column is the Seat and is always visible. The Seat destination is not shown in the tab row.
- The right column shows the four other destinations as tabs, with the segmented control beneath.

### 3. Mobile, 860 px and narrower

- One column. A fixed bottom bar with the five destinations: glyph above label, each at least 56 px tall and one fifth of the width, plus `env(safe-area-inset-bottom)` padding. The active one is marked with the gloom colour and `aria-current="page"`.
- `main` gets bottom padding equal to the bar height so nothing hides behind it.
- **Seat destination**: the scene box (taller than today: `min(52vh, 420px)`), effect chips, the next-objective strip when TDR-051 exists, then Whispers at a usable height (five lines).
- **Other destinations**: the scene is not shown. A **well strip** is pinned under the header: 56 px tall, a 44 px round Stillwell button on the left that gathers (same handler, same trust and rate checks, same floater but smaller), the latest Whisper in one line with ellipsis on the right. Tapping the Whisper goes to the Seat.
- Lanterns only appear on the Seat. When one is present and the player is elsewhere, the Seat item in the bottom bar shows a small gold dot. This is the one allowed gold badge: it marks a thing from above.
- The header is one row: logo mark, Gloom with rate under it, then Echoes and Nightglass as compact chips. The title text is hidden on mobile.

### 4. Badges

A destination shows a dot when any of its sub-pages has something for the player. Rules as in the guide's table. Dots use `--gloom` (see TDR-056 for the colour change if it has not landed: use the token `--badge` and define it as `--gloom`).

### 5. Behaviour to preserve

- Locked destinations are hidden until unlocked.
- The render loop still only updates the visible page.
- Keyboard: the destination row is a `tablist` on desktop and a `nav` with links or buttons on mobile. Arrow-key handling comes with TDR-052. Do not break focus order.
- Orientation change and resize across the 860 px line must not lose state. Use CSS for layout and a single `matchMedia` listener to decide whether the Seat is a destination.

## Tests

- `adopt()` maps each old `tab` value to the right `nav`.
- `addPage` registers and the page appears only when its lock is open.
- Playwright at 390 by 844, 360 by 640, 768 by 1024 and 1280 by 800: screenshot each destination. Assert: no horizontal scroll, the bottom bar is fully visible and does not cover the last row, the well strip is visible on Realm and gathering from it increases Gloom, and every interactive element is at least 44 px in its smaller dimension.
- Resize from 1280 to 390 and back: active destination and sub-page survive.

## Acceptance criteria

- [ ] On a 390 by 844 viewport, the first Bind button and a gather control are visible together without scrolling.
- [ ] Every existing page is reachable in at most two taps.
- [ ] No page content hides behind the bottom bar or the notch.
- [ ] Old saves open on the equivalent page.
- [ ] `CACHE` bumped. README screenshots, if any, are refreshed.

## Out of scope

Restyling components (TDR-056). Toasts and the objective strip (TDR-051). Swipe gestures between destinations.
