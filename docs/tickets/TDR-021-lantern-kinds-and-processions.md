# TDR-021: Lantern kinds, Processions and snuff streaks

**Epic:** Mechanics · **Size:** M · **Depends on:** 020, 004 · **Blocks:** none

## Why

One lantern, four outcomes, click once. It is the only moment of attention the game asks for and it has no depth. (REVIEW M-3, GDD P2.)

## Spec

### 1. Kinds

Unlock: after `S.lanterns >= 10`. Before that only Stray Lanterns appear.

| Kind | Chance | Look | Life | On snuff |
| --- | --- | --- | --- | --- |
| Stray | 80% | Gold, as now | 14 s | Existing outcome table |
| Votive | 14% | Smaller, paler, steady (no sway), always on the `drop` path | 9 s | Two outcomes rolled from the existing table, both applied |
| Warden's Lamp | 6%, only when the frontier shaft is a Lampwarden | Larger, with a hooded top, `ltr` or `rtl` at half speed | 20 s | Removes 20% of the current Lampwarden's maximum radiance and adds 10 s to its timer (not above the maximum) |

Kinds, chances and lives live in `data.js` as `LANTERNS`. The Warden's Lamp slot falls back to Stray when no Lampwarden is at the frontier.

### 2. Processions

Every eighth lantern spawn (counter `S.lanternSpawns`, saved) is a Procession instead: five Stray Lanterns, 1.6 s apart, alternating `ltr` and `rtl` at different heights, each alive for 8 s.

- Needs up to five lantern elements. Replace the single `#lantern` button with a small pool of five created at boot inside `#scene-box`. The engine's `lantern` becomes `lanterns` (array of `{ id, kind, path, life }`).
- Each snuff in a Procession pays 40% of a normal Stray outcome's amount or duration.
- Snuffing all five pays a bonus: a guaranteed Deep Hush of full duration, plus the Whisper "The whole procession, dark. The Scribes are counting chains."
- With motion off, the five appear in a row and stand still.
- Processions are skipped (the counter still advances, a single Stray spawns) while a modal is open.

### 3. Snuff streak

- `S.streak`: consecutive lanterns snuffed without one expiring unsnuffed. A lantern withdrawn because the tab was hidden does not break it. Processions count each lamp.
- Each streak step adds 4% to lantern yields and durations, capped at +40% (10 in a row).
- Show the streak as an effect chip when 2 or more: "Unbroken ×N".
- `S.bestStreak` is kept for omens.

### 4. Modifiers

All amounts pass through the `lanternLife` channel (lifetime) and a new local multiplier from streak and the Lantern-Hunger perk. Register the streak as a source only if it needs to feed other systems. Otherwise keep it local to the lantern code.

### 5. Omens (add to the lantern omen set, all `mono`)

- "A Line of Small Nights": snuff a whole Procession. Needs `S.processions` counter.
- "Unbroken": reach a streak of 10. Reads `bestStreak`.
- "Borrowed Light": snuff a Warden's Lamp. Needs `S.wardenLamps` counter.

### 6. Save and audit

New fields: `lanternSpawns`, `streak`, `bestStreak`, `processions`, `wardenLamps`. All integers, clamped. Audit: `bestStreak <= lanterns`, `processions <= lanterns / 5`, `wardenLamps <= lanterns`. Raise the `lanterns` ceiling to `played / 20 + 5` to allow for Processions.

## Tests

- Kind roll at boundaries, including the fallback when no Lampwarden is at the frontier.
- Every eighth spawn is a Procession. All five snuffed grants the bonus once.
- Streak increments, caps at 10, resets on an unsnuffed expiry, and does not reset on a hidden-tab withdrawal.
- Warden's Lamp reduces boss radiance by 20% of maximum and never below zero; a shaft cleared this way pays out normally.
- Schema round-trip test passes with the new fields.
- Simulator: rerun the three policies and record the change. Expect `active` to speed up and `idle` not to move.

## Acceptance criteria

- [ ] Three kinds are visually distinct without relying on colour alone (size and shape differ).
- [ ] A Procession is completable by touch on a 360 px screen.
- [ ] All lantern actions still require a trusted event.
- [ ] Baseline delta recorded in the PR description.
- [ ] No Codex text is added or changed. A new page needs `LORE_BIBLE.md` updated in the same PR.

## Out of scope

Sound. Lantern skins tied to sky events.
