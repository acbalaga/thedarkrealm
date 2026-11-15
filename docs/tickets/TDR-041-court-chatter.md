# TDR-041: Court chatter in the Whispers

**Epic:** Lore · **Size:** S · **Depends on:** 001 · **Blocks:** none

## Why

The Whispers log only speaks when the player does something. Between actions the realm is silent, which undersells the denizens, who are the funniest part of the writing. A line every few minutes from whoever has been bound makes the place feel inhabited at almost no cost.

## Spec

### 1. Data

`CHATTER` in `data.js`: a map of denizen id to an array of lines. Use the 30 lines in `LORE_BIBLE.md` section 5 verbatim.

### 2. Timing

- A timer `chatterIn` (not saved), initial value random 60 to 120 s, then random 150 to 360 s after each line.
- Counts down in `step()` only while the page is visible and no modal is open.
- When it fires: collect lines for denizens with `cnt(id) >= 1`. Remove lines already used this session. If none remain, clear the used set and start over. Pick one with `env.random()`.
- No line in the first 3 minutes of a brand-new save (the opening Whispers are doing work there).
- Never fire within 5 s of another Whisper. Push back by 10 s instead.

### 3. Presentation

- Chatter lines enter the log in a dimmer style (`li.chatter`, serif italic, `--dim`).
- They are **not** announced to screen readers. The log is `aria-live="polite"` today, which would read every line aloud. Split it: important lines go to a visually hidden live region (one line at a time), and the visible list is not live. Chatter goes only to the visible list. If TDR-051 has landed, toasts already own the live region. Use that.
- Add a setting under Display: "Court chatter" (default on), stored as `S.opts.chatter`.

### 4. Whispers that survive a reload

While here, keep the last 30 log lines across reloads so a returning player sees context:

- Store them under a **separate** key, `thedarkrealm.log.v1`, as a JSON array of strings, written on the same schedule as the save. Not part of the sealed save.
- On load: parse inside `try`, require an array, keep at most 30 entries, each a string of at most 300 characters, and render with `textContent`. Anything else is discarded. These strings are untrusted input like any other storage and must never reach an HTML sink.
- Restored lines are shown dimmed above a divider line "earlier".

## Tests

- No chatter with zero denizens. Only lines for owned denizens are chosen.
- No repeat until the owned pool is exhausted.
- The timer does not run while hidden or while a modal is open.
- Log restore rejects: non-array, non-string entries, over-long strings, more than 30 entries, malformed JSON.
- A restored line containing markup is rendered as text.
- With the setting off, no chatter is produced.

## Acceptance criteria

- [ ] A realm with five denizen kinds produces a varied line every few minutes.
- [ ] Screen readers hear important events and not chatter.
- [ ] Reloading keeps recent Whispers.
- [ ] No lore line is edited from the bible. Typos are fixed in the bible first.

## Out of scope

Lines that react to specific events. Named individual denizens.
