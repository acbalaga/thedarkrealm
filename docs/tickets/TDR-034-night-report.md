# TDR-034: The Night Report

**Epic:** Retention · **Size:** S · **Depends on:** 001, 010 · **Blocks:** none

## Why

The return moment is the most important screen in an idle game and here it is a bulleted list of two numbers. It should tell the player what happened, what is waiting, and when it is next worth coming back. It also interrupts play when it should not. (REVIEW M-7, B-6.)

## Spec

### 1. When it shows

- Only after an absence of 5 minutes or more. Shorter gaps are credited silently with one Whisper ("The realm kept working. 3m 10s.").
- The short path (a throttled tab, `dm > 90` in `tick()`) never opens a modal and never clears lantern buffs. Only a true absence (the page was not running, the `gap > 60` path) clears them.
- If several away credits arrive before the player dismisses the report, merge them into one report. Do not queue modals.

### 2. Content

`away()` already returns a report object after TDR-001. Extend it and render with nodes.

Title: "While the realm slept".

1. **Summary line**: "Away 7h 42m. The realm worked at 60% of its pace." When the cap cut it short: "Away 11h 05m. The realm worked for the first 8h, at 60% of its pace."
2. **What was gathered**: Gloom, Echoes, shafts sealed ("Sunshafts sealed down to 64"), and if a Lampwarden held: "Lampwarden Orrin Vale held Sunshaft 10. The Host is regrouping."
3. **What is waiting** (only lines that apply; each is a button that closes the report and goes there):
   - "The denizens have intentions." (Petition offer, TDR-032)
   - "The line is slack." (Sounding, TDR-033)
   - "N workings can be completed."
   - "The realm is heavy enough to let go." (first Unlighting available, or the advisor from TDR-055 says so)
   - "The sky changed: Night above." (phase differs from when the player left, TDR-030)
   Systems that have not landed simply contribute no line. Build this as a list of provider functions so later tickets append to it.
4. **One line of colour**: a court-chatter line from the lore bible, drawn from owned denizens (TDR-041 pool if present; otherwise omit).
5. **Cap notice**, only when the cap was hit: "The realm stops working after 8 hours alone. The Unsleeping setting in Nightglass makes that 24."

Button: "Take the seat".

### 3. Return-time hint

On the Seat (in the scene box footer, or the stats list until TDR-050 lands) show, at all times: "If you leave now, the realm works until 03:40." Computed as now plus the cap hours, formatted with `toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`. If a Sounding is out, add "The line goes slack at 01:15."

This is the stand-in for notifications. It must be visible without opening anything.

### 4. Welcome-back lantern

If TDR-020 has landed this already exists. If not, add the rule here: after an absence of 10 minutes or more, a lantern arrives within 8 seconds.

### 5. Efficiency explained

Under the summary, in dim text, when pace is under 100%: "Rite of the Long Sleep raises the pace." Only until the Rite is maxed.

## Tests

- A gap of 4 minutes produces no report. A gap of 6 minutes produces one.
- The throttled-tab path produces no modal and leaves buffs untouched.
- Two away credits before dismissal merge: totals add, durations add.
- Providers: each "waiting" line appears only when its condition holds.
- The return-time hint equals now plus cap, and uses 24 with the perk.
- The report object is plain data (no DOM), and the renderer builds nodes only.

## Acceptance criteria

- [ ] No modal ever appears while the player is actively present.
- [ ] Every "waiting" line navigates to the right page.
- [ ] The return time is visible on the first screen at 360 px.
- [ ] No HTML strings.

## Out of scope

Notifications, badges on the app icon, away-time events that change state (random events while away).
