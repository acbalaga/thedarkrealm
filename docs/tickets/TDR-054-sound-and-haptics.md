# TDR-054: Procedural sound and haptics

**Epic:** UI/UX · **Size:** M · **Depends on:** none · **Blocks:** none

## Why

The game is silent. A low drone and a few soft cues do a lot for a setting like this, and a short vibration on gather makes a phone tap feel like it landed. All of it can be synthesised, so the no-assets and no-remote-hosts rules hold. (REVIEW U-9, GDD P5.)

## Constraints

- No audio files. WebAudio oscillators, noise buffers and gain envelopes only.
- The CSP needs no change (no `media-src` is used). Confirm in the browser.
- Browsers block audio until a user gesture. Create the `AudioContext` on the first trusted pointer or key event, never at load.
- Suspend the context when the page is hidden. Resume on return.
- Quiet by design. Master gain default 0.4. No cue louder than −12 dBFS at full volume.

## Spec

### 1. Module

`public/js/sound.js`, same hand-off pattern (`window.TDR_SOUND`, captured and deleted by `game.js`). Add to `index.html`, to `FILES` in `sw.js`, and stamp or bump the cache. API:

- `init()` on first gesture. `setVolume(0..1)`, `setMuted(bool)`, `setAmbience(bool)`.
- `play(name, opts)` where `name` is one of the cues below. Unknown names do nothing. If the context is missing or suspended, do nothing.
- A limiter: at most 12 cues per second overall, and each cue has its own minimum interval.

### 2. Ambience

A drone: two detuned sine oscillators (55 Hz and 55.4 Hz) plus low-passed brown noise at very low gain, through a slow tremolo (0.07 Hz). Depth of the low-pass opens slightly with fathom number (cap at fathom 12). During Deep Hush, duck the noise by 6 dB for the duration. Fade in over 3 s on start, out over 1 s on mute or hide.

### 3. Cues

| Name | When | Sound |
| --- | --- | --- |
| `gather` | hand gather | Soft low pluck, 110 to 140 Hz sine, 80 ms decay, pitch randomised ±4%. Minimum interval 60 ms. |
| `bind` | denizen bought | Two-note fall, a fifth apart, 160 ms |
| `working` | Working or perk bought | Single bell-like tone (sine plus quiet octave), 400 ms decay |
| `rite` | Rite performed | Low hum swell, 300 ms |
| `lantern` | lantern appears | Thin high chime, 1,200 Hz region, very quiet, 500 ms. This is the one bright sound and it marks the enemy. |
| `snuff` | lantern snuffed | Short filtered-noise puff, then a low thud |
| `seal` | Lampwarden undone | Three descending notes |
| `fail` | Lampwarden held | One flat low note |
| `omen` | Omen earned | Two soft rising notes |
| `page` | Codex page | Paper-like noise burst, 120 ms |
| `unlight` | Unlighting | A 4 s falling glide of the drone by an octave, then silence for 1 s, then the drone returns |
| `litany` | Litany spoken | Stacked fifths, 600 ms |
| `toast` | any other toast | Very soft tick |

Ordinary shaft seals make no sound (they can happen several times a second).

### 4. Haptics

- `navigator.vibrate` where available. `gather`: 8 ms. `snuff`: 20 ms. `seal`: `[15, 40, 15]`. `unlight`: 120 ms.
- Only from trusted input handlers or events the player caused. Never from timers alone, except `seal`.
- iOS Safari does not support `navigator.vibrate`. Fail silently.

### 5. Settings

In Keeping, a "Sound" block: master volume slider (0 to 100, step 5), "Ambience" toggle, "Cues" toggle, "Vibration" toggle (hidden where unsupported). Stored as `S.opts.vol` (default 40), `S.opts.amb`, `S.opts.sfx`, `S.opts.haptic` (all default true). Adopted with clamps.

A mute button in the header on desktop and in Keeping on mobile. Muted state is `vol === 0` plus a remembered previous volume in memory.

### 6. Respect

- If `prefers-reduced-motion` is set on a fresh save, default `haptic` to false.
- Never play anything while a required-choice modal is open except `unlight`.
- Sound state changes nothing in the game.

## Tests

- Unit with a stub `AudioContext`: no context is created before `init()`. `play` before `init` is a no-op. The limiter drops cues over the cap. Volume and mute set master gain. Hidden page suspends.
- Settings round-trip in the schema test.
- Playwright: after one click on the well, `AudioContext.state` is `running`. With volume 0, master gain is 0.
- Manual listening on phone speaker and headphones at full device volume. Nothing harsh, nothing clipping. Write two lines in the PR on what was checked.

## Acceptance criteria

- [ ] No sound before the first gesture, and none when muted.
- [ ] The drone is steady with no clicks on start, stop, hide or show.
- [ ] Rapid gathering at 14 per second does not distort or stack.
- [ ] No asset files and no CSP change.
- [ ] All settings persist.

## Out of scope

Music. Recorded samples. Per-denizen sounds.
