# Review: mechanics, code, security, UX

Reviewed at commit `1003666`. Files: `public/js/game.js` (1323 lines), `public/js/data.js`, `public/css/style.css`, `public/index.html`, `public/sw.js`, `public/_headers`, `wrangler.jsonc`, `package.json`. Line numbers below refer to that commit.

Nothing here was found by running the game under test. There are no tests. Findings come from reading the code. Where a claim depends on play time or balance it is marked **unverified** and assigned to the simulator ticket.

## 1. Summary

The build is clean for its size. State sits in a closure, saves are schema-copied and audited, the CSP is strict, timing uses the monotonic clock, and the writing has a voice. Those are the hard parts and they are done.

The gaps are in four places:

1. **The loop is a known template.** Buildings, one-time upgrades, a golden-cookie analogue, stage combat with a boss timer, one prestige layer. The theme is strong but nothing in the mechanics could only exist in this game. See `design/GDD.md`.
2. **There is no reason to return at a particular time.** The only return hook is the away cap. No daily, weekly or calendar rhythm, no timed goals, no content after Sunshaft 150 and the last perk.
3. **Nothing protects the code from regressions.** One 1300-line IIFE, no tests, no CI. Every feature ticket touches `fresh()`, `adopt()`, `audit()`, `recalc()` and the render loop at once.
4. **Mobile play is awkward.** On a phone the Stillwell and the buy buttons are never on screen together, and eight tabs scroll sideways.

## 2. Mechanics

| ID | Finding | Evidence | Ticket |
| --- | --- | --- | --- |
| M-1 | Stray Lanterns enter only from the left, always on the same 14 s linear path. Predictable after the third one. | `style.css:131` `@keyframes drift { from { left: -50px } to { left: 100% } }` | TDR-020 |
| M-2 | Lanterns spawn and expire while the tab is hidden. A player who leaves the tab in the background loses every lantern without seeing one. | `step()` at `game.js:607` runs the lantern timer regardless of `document.hidden` | TDR-020 |
| M-3 | One lantern kind, four outcomes, no skill or streak. | `snuffLantern()` `game.js:571` | TDR-021 |
| M-4 | Sunshafts are fully passive. The only decision is the auto-advance checkbox. A Lampwarden is a wait, not a fight. | `fight()` `game.js:534` | TDR-022 |
| M-5 | Every Unlighting is the same run with bigger numbers. No choice at the reset, no variation between fathoms. | `unlight()` `game.js:478` | TDR-023, TDR-024 |
| M-6 | Content ends at Sunshaft 150 and 3,612 total Nightglass (sum of all perk costs). After that there is no goal. Time to reach it is **unverified**. | `data.js` PERKS, `FINAL_SHAFT` | TDR-003, TDR-035, TDR-036 |
| M-7 | Away progress is a number in a modal. It is capped and correct, but it tells the player nothing about when to come back or what happened. | `away()` `game.js:613` | TDR-034 |
| M-8 | Omens give a flat +1% each, additive. 35 omens is +35% at the very end, which is less than one Realm working (×1.5). They do not feel like a reward. | `recalc()` `game.js:396` | TDR-051 (presentation), ECONOMY.md section 4 |
| M-9 | Late game is click-heavy in the wrong places. Rites are bought one level at a time. Denizens have no auto-buy. The Steward perk (70 Nightglass) only covers Workings. | `buildRites()`, PERKS | TDR-025 |
| M-10 | A lantern "spill" during Deep Hush pays 300 s of the buffed rate. This is a fine combo and should be kept on purpose. Noted so nobody "fixes" it. | `game.js:580` | none |

## 3. Bugs and correctness

| ID | Finding | Evidence | Ticket |
| --- | --- | --- | --- |
| B-1 | The Codex page says entries appear "in the order you learned it". They render in `data.js` order. No learned order is stored. | `buildCodex()` `game.js:1084`, `S.codex[id] = 1` | TDR-040 |
| B-2 | Erasing the realm in one tab does not stop a second tab. The `storage` handler ignores `newValue === null`, so the other tab keeps running and its next autosave restores the erased realm. | `game.js:1310` | TDR-011 |
| B-3 | In Max buy mode an unaffordable denizen button reads "Bind ×1" with the ×1 price. It reads as if the mode changed. | `game.js:868` | TDR-051 |
| B-4 | `prefers-reduced-motion` stops the ring animations in CSS but not the lantern drift or the canvas motes. The in-game motion option defaults to on regardless of the system setting. | `style.css:260`, `fresh()` `opts.motion: true` | TDR-052 |
| B-5 | The service worker caches with stale-while-revalidate per file. If one refresh succeeds and another fails, the next launch can pair a new `game.js` with an old `data.js`. A missing table entry would then throw at boot. | `sw.js:27` | TDR-012 |
| B-6 | `away()` clears both lantern buffs even on the short path (a tab throttled for more than 90 s), and the modal for it can interrupt play. | `game.js:622`, `game.js:656` | TDR-034 |
| B-7 | Importing a save replaces the current realm with no backup. A mis-paste of an old export is unrecoverable. | `game.js:1154` | TDR-013 |
| B-8 | Whispers are held in memory only. Forty lines, gone on reload, and on a phone the log is 62 px tall, so an Omen earned while looking at another tab is effectively invisible. | `say()` `game.js:723`, `style.css:270` | TDR-051 |

## 4. Security and integrity

The existing model is documented honestly in the README: there is no server, so anyone who edits the source wins. Within that limit these gaps are real and cheap to close.

| ID | Sev | Finding | Evidence | Ticket |
| --- | --- | --- | --- | --- |
| S-1 | Med | HTML is still assembled as strings in six places and written with `innerHTML` (modal body, buff chips, list clears). Every string is fixed text plus formatted numbers today, so there is no live XSS. The risk is the next feature: the first ticket that puts a relic name or imported text into a modal makes it exploitable. | `game.js:743`, `1209`, `629`, `761`, `1136`, `1149` | TDR-010 |
| S-2 | Med | The CSP does not enforce Trusted Types, so S-1 is guarded by convention only. With `require-trusted-types-for 'script'` the browser rejects any future string sink. `navigator.serviceWorker.register` is a TrustedScriptURL sink and needs a one-line policy. | `index.html:7`, `_headers:5` | TDR-010 |
| S-3 | Low | Response headers lack `Strict-Transport-Security`, `Cross-Origin-Resource-Policy` and `Cross-Origin-Embedder-Policy`. The Permissions-Policy lists eight features and omits several that default to allowed. | `_headers` | TDR-010 |
| S-4 | Med | The seal can be bypassed through the v1 path. If the v2 key is absent, `load()` adopts raw unsealed JSON from `thedarkrealm.save.v1` with no size cap and no irregularity mark. Deleting one key and writing another is easier than computing the checksum. | `game.js:261` | TDR-011 |
| S-5 | Low | After the first Unlighting, Rite levels are not audited at all. A forged save can carry 400 levels of every rite. | `audit()` `game.js:183` | TDR-011 |
| S-6 | Low | All audit ceilings scale with `played`, and `played` is read from the save, clamped only to 1e300. A forger who sets it high passes every ceiling. This cannot be closed without a trusted clock. It should be documented, not chased. | `game.js:91`, `132` | SECURITY_MODEL.md section 3 |
| S-7 | Low | Holding Enter or Space on the focused Stillwell fires trusted click events on key repeat, which is a free 14 per second autoclicker with a paperweight. | `clickAllowed()` `game.js:1220` | TDR-011 |
| S-8 | Low | The service worker stores any same-origin 200 GET. Distinct query strings create distinct cache entries, so the cache can be grown without bound by anything that can make the page request URLs. | `sw.js:34` | TDR-012 |
| S-9 | Med | No CI, no dependency updates, no lockfile install in the deploy path. Wrangler is declared as `^4`. A compromised or broken release is picked up on the next deploy from the dashboard integration. | `package.json`, no `.github/` | TDR-002 |
| S-10 | Med | Durability, not attack: Safari deletes script-writable storage for sites not used in seven days unless installed to the Home Screen. `navigator.storage.persist()` is requested but rarely granted on iOS. A returning player can find an empty realm. | `game.js:1316` | TDR-013 |

Things checked and found sound: prototype pollution through saves (blocked by field-by-field `adopt()`), console access to state (closure), clock manipulation while running (monotonic clock), clock rollback (debt), synthetic clicks (`isTrusted`), framing (`frame-ancestors` and `X-Frame-Options`), cross-origin caching in the service worker (origin and `res.type` checks).

## 5. UI and UX

| ID | Finding | Ticket |
| --- | --- | --- |
| U-1 | Below 860 px the layout stacks header, scene, whispers, then the panel. On a 390 by 844 phone the first buy button starts roughly 440 px down. The well and the shop are never visible together, so the opening minutes are scroll, tap, scroll. | TDR-050 |
| U-2 | Eight flat tabs today, and this plan adds at least four more surfaces. A flat scrolling strip will not hold them. | TDR-050 |
| U-3 | No feedback for the important moments. An Omen, a new Codex page, a sealed Lampwarden all arrive as one line in a log. | TDR-051 |
| U-4 | No guidance. A new player gets one hint under the well. After that nothing says what to aim for next. | TDR-051 |
| U-5 | Buttons show cost but not distance. No progress toward affordability, no "in 40 s". | TDR-051 |
| U-6 | The modal has no focus trap, no Escape, no `aria-labelledby`. Tabs have `role="tab"` but no `tabpanel`, `aria-controls`, or arrow-key movement. Touch targets for the buy-mode segment and checkboxes are under 44 px. Unearned omens are drawn at 38% opacity, which fails contrast. | TDR-052 |
| U-7 | Gold marks both the enemy (lanterns, Lampwardens, the radiance bar) and good news (earned omens, unread dots). The palette has a meaning and the UI contradicts it. | TDR-056 |
| U-8 | The scene never changes. The same well at fathom 1 and fathom 12, with 0 denizens or 2,000. Visible progress is one of the cheapest retention tools and it is unused. | TDR-053 |
| U-9 | Silent. No sound, no haptics. | TDR-054 |
| U-10 | The Unlighting screen gives the Nightglass yield but no rate, no history, and no sense of whether now is a good time. | TDR-055 |

## 6. Architecture

- `game.js` mixes state, rules, save, time and DOM in one closure. None of it can be executed outside a browser. This blocks tests, the balance simulator, and safe parallel work on features. TDR-001 extracts the rules into `public/js/core.js` behind the same hand-off pattern `data.js` already uses (a `window` property the UI captures and deletes), which keeps `file://` working and keeps state out of console reach.
- Multipliers are computed inline in `recalc()` with a chain of `if (perk(...))`. Twelve of the tickets add modifiers. Without one place to register them, `recalc()` and `audit()` will drift apart. TDR-004 adds a modifier registry.
- Randomness is `Math.random()`. Daily and per-fathom content needs to be deterministic per save so it cannot be rerolled by reloading. TDR-004 adds a seeded generator.

## 7. What not to change

- The closure, the frozen tables, the field-by-field `adopt()`, the audit, the monotonic clock and the debt rule. They work.
- The tone. The Codex is the best thing in the build.
- The promise in the Realm tab: nothing is sent anywhere and there is nothing to buy.
