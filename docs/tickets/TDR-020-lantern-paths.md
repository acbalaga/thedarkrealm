# TDR-020: Lanterns from both sides and down the chain

**Epic:** Mechanics · **Size:** S · **Depends on:** none (can ship first) · **Blocks:** 021

## Why

Stray Lanterns always enter from the left and cross on the same line. After a few the player waits at the left edge. The Codex says a lantern is "a lamp on a long chain, lowered through some crack", so a lantern that only slides sideways also contradicts the fiction. Lanterns also spawn and expire while the tab is hidden, so background play silently loses every one. (REVIEW M-1, M-2.)

## Current behaviour

- `spawnLantern()` `game.js:560`: random `top` 12% to 67%, adds class `drift`.
- `style.css:120-131`: `#lantern { left: -50px }`, `@keyframes drift { from { left: -50px } to { left: 100% } }`, 14 s linear.
- `step()` `game.js:607-608`: lantern timers tick whether or not the page is visible.

## Spec

### 1. Three paths

On spawn pick one path. Weights: `ltr` 35, `rtl` 35, `drop` 30.

| Path | Motion | Start |
| --- | --- | --- |
| `ltr` | Left edge to right edge, as today | random `top` 12% to 67% |
| `rtl` | Right edge to left edge | random `top` 12% to 67% |
| `drop` | Lowered from above the box to a hang point, holds, then is drawn back up | random `left` 12% to 80%; hang point random 30% to 62% of box height |

Implementation, CSS only for the motion:

- Replace the single `drift` class with `path-ltr`, `path-rtl`, `path-drop`. Remove all three before adding one, with the existing reflow trick.
- Animate `transform`, not `left`, so the browser can composite it. Base position: `left: 0; top: 0`. Keyframes translate in `%` of the scene box using a wrapper sized to the box, or use CSS custom properties set from JS (`el.style.setProperty('--y', '40%')`), which the CSP allows.
- `drop` timing over the 14 s life: 0 to 20% descend with ease-out, 20% to 80% hang with the existing sway, 80% to 100% ascend with ease-in. The chain (`#lantern::before`) is already drawn above the lamp and needs no change.
- `ltr` and `rtl` gain a gentle vertical bob (8 px) so the line is not perfectly straight.
- The lantern's `life` stays 14 s on every path. Travel time equals life.

### 2. Motion off

With `S.opts.motion` false (or `body.still`), no travel. The lantern appears at a random point (15% to 80% left, 12% to 67% top) for 14 s. Keep the current behaviour but set the position through the same custom properties. Do not leave a stale inline `left` from one mode when switching to the other.

### 3. Fair timing

- Do not count `S.lanternIn` down while `document.hidden` is true. A lantern that is already on screen when the tab hides is withdrawn (hide it, set `lanternIn` to 5 s) instead of expiring unseen.
- After any away period of 10 minutes or more, set `S.lanternIn = Math.min(S.lanternIn, 8)` so a lantern arrives within 8 s of returning. Whisper when it appears: "A lantern was waiting for someone to come back."
- The audit ceiling for `lanterns` (`played / 35 + 5`) still holds, since spawns only get rarer in wall time. Leave it.

### 4. Hit area

Keep the 44 by 54 px button. Ensure the hit area moves with the transform (it does when the transform is on the button itself, not on the inner span).

### 5. Text

No Codex change. The existing "Stray Lanterns" page already describes a lamp lowered on a chain. The only new line is the welcome-back Whisper in section 3.

## Tests

- If TDR-001 has landed: unit test that `lanternIn` does not decrease when the engine is told the page is hidden (`env.hidden()` or a `present` flag on `step`), and that an away of 600 s or more clamps `lanternIn` to 8 or less.
- Path choice is a pure function of a random number. Test the weights at the boundaries (0, 0.349, 0.35, 0.699, 0.7, 0.999).
- Playwright visual check at 1280 by 800 and 390 by 844: force each path in turn (a test-only query flag is **not** allowed in production code; instead stub `Math.random` from the test before boot), take a screenshot at 1 s, 7 s and 13 s, and assert the lantern's bounding box is inside or entering the scene box and is clickable at 7 s.

## Acceptance criteria

- [ ] Over 30 spawns all three paths occur.
- [ ] A lantern entering from the right is clickable for its whole crossing on a 360 px wide screen.
- [ ] `drop` lanterns hang still enough to tap (sway only) for about 8 s.
- [ ] With motion off, behaviour is unchanged from today apart from positioning code.
- [ ] No lantern is spent while the tab is hidden.
- [ ] `CACHE` bumped.

## Out of scope

New lantern kinds, Processions, streaks (TDR-021). Sound (TDR-054).
