# TDR-053: A throne room that fills in

**Epic:** UI/UX · **Size:** M · **Depends on:** 050 (soft), 030 (soft) · **Blocks:** none

## Why

The scene is the same picture at fathom 1 with nothing and at fathom 12 with two thousand denizens. Visible, cumulative change is one of the cheapest reasons to keep playing: the player should be able to look at the Seat and see what they built. (REVIEW U-8.)

## Constraints

- No image assets. Everything is drawn on the existing `#motes` canvas or with CSS.
- Purely decorative. No game state depends on it. `aria-hidden`.
- With motion off: draw one static frame on state change and stop the animation loop.
- Budget: under 2 ms per frame on a mid-range phone. Skip frames when `document.hidden`.

## Spec

Draw in layers, back to front. Each layer is a small function taking `(ctx, w, h, t, view)` where `view` is a plain snapshot the UI builds twice a second from engine state (so drawing never reads live state mid-frame).

| Layer | Driven by | What it shows |
| --- | --- | --- |
| Depth tint | `unlightings` | The background gradient shifts from violet toward blue-black over the first 12 fathoms. Interpolate two colour stops. Set as CSS custom properties on `#scene-box`. |
| Sky band | Surface Clock phase (TDR-030) | The thin gold band at the top edge. Already specified there. Skip if absent. |
| Shaft of light | A Lampwarden at the frontier and `autoAdvance` on | A narrow, soft gold wedge from the top edge toward the well, 6% to 14% opacity, narrowing as the Lampwarden's radiance falls. Gone when sealed. |
| Throne | always | A simple silhouette behind the well: a tall back, two arms, drawn as three dark shapes slightly lighter than the background. After the First Lamp (`ended`), a small warm point at its foot and a faint shadow cast toward the viewer. |
| The court | denizen counts | One silhouette cluster per denizen kind owned, placed at fixed positions around the well (ten slots, back row for later kinds). Each cluster shows 1, 2 or 3 figures for counts of 1, 25, 100. Figures are simple shapes built from the denizen's character: Gleaner a small hooked stroke, Scribe a dot with wings, Warden a tall still bar, Tidewell a low arc, and so on. Keep each under ten path operations. A newly bound kind fades in over 350 ms. |
| Motes | existing | Unchanged. |
| Pane glint | Pane lights lit (TDR-035) | Above the throne, a small rose of dots, one per lit light, in the glass colour. Skip if absent. |
| Ending tint | `pane.choice` | `ending-returned`: the throne silhouette gains a seated figure. `ending-kept`: the throne's shadow lengthens and the warm point brightens slightly. Skip if absent. |

Figure positions are fractions of the box so they scale. Keep them out of the 190 px circle around the well so nothing sits under the tap target.

### Idle life

With motion on, each cluster has one slow idle motion (a 2 px bob, a slow turn of the Warden's bar) on a period of 4 to 9 s, phase-offset per kind. Nothing moves faster than the motes.

### Mobile

On the well strip (non-Seat destinations) nothing is drawn. On the Seat the canvas is the full scene box.

## Tests

- Unit: the `view` snapshot builder maps state to layer inputs (counts to figure tiers, phase to band, Lampwarden to shaft).
- Playwright: screenshots at fathom 1 with no denizens, fathom 1 with five kinds, fathom 8 with all ten at 100, a Lampwarden at the frontier, and the post-ending state. Commit them under `docs/design/scene/` as the visual reference. Compare by eye in review. Do not add pixel-diff tests.
- Performance: in Playwright with CPU throttling ×4, record 5 s of frames with all layers on and assert the average frame time of the draw function is under 4 ms (measure with `performance.now()` inside a test hook that wraps `requestAnimationFrame` from the test, not with code shipped in the game).
- Motion off: `requestAnimationFrame` is not rescheduled after the static frame.

## Acceptance criteria

- [ ] A player can tell fathom 1 from fathom 8, and five denizen kinds from ten, at a glance.
- [ ] The well remains the clearest thing in the scene. Nothing reduces its contrast.
- [ ] Gold appears only for things from above (the band, the shaft, the First Lamp).
- [ ] No asset files added. No change to game state or saves.
- [ ] Works with motion off.

## Out of scope

Sprites, WebGL, per-denizen animation sets, interaction with scene figures.
