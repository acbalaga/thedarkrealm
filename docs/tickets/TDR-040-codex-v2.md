# TDR-040: Codex, learned order, categories and new pages

**Epic:** Lore · **Size:** S · **Depends on:** 001 · **Blocks:** none (later tickets add pages to it)

## Why

The Codex is the best thing in the game and its page says something untrue: "in the order you learned it". Entries render in table order and no order is stored. It is also one long scroll with no sense of what is new or what is missing. (REVIEW B-1.)

## Spec

### 1. Learned order

- Change `S.codex[id]` from `1` to a sequence number: the value of a new counter `S.codexSeq`, incremented on each unlock, starting at 1.
- `adopt()`: `int(o.codex, id, 0, 9999, 0)`. Old saves have `1` for every page. That is fine: ties sort by table order, which is what old saves showed anyway. Set `codexSeq` to the maximum found.
- Track unread per page: `S.codexNew = { id: 1 }`, set on unlock, cleared when the page is expanded or when the player presses "Mark all read". Replace the `codexUnread` counter with the size of this map (keep reading the old field in `adopt()` and ignore it).

### 2. Categories

Add `cat` to every entry in `CODEX`. Six categories, in this order:

| id | Title | Existing pages |
| --- | --- | --- |
| `realm` | The Realm | waking, gloom, seat, ledger, echo, hush, orchard |
| `concord` | The Concord | lantern, concord, tallow, vale, sister, pell, drill, ownshadow, firstlamp |
| `queen` | The Queen | cantors, ysmerel, glass, reflection, queenseat |
| `deep` | The Deep | unlighting, fathom |
| `sea` | The Sea | sea, sleeper |
| `sky` | The Sky | (none yet) |

New pages from `LORE_BIBLE.md` section 4 use the category of their heading there ("The Court" pages go under `realm`).

### 3. Page layout

- Two views, chosen with a segmented control: **By subject** (default) and **As learned**.
- By subject: one collapsible section per category with a count ("The Concord · 5 of 9"). Categories with nothing unlocked are hidden. Unknown pages inside a visible category appear as a single dim line at the end: "3 pages still dark." Do not reveal titles.
- As learned: one list sorted by sequence number, newest first.
- Each page is a `<details>` element with the title as `<summary>`. New pages are marked with a small gloom-coloured dot and the word "new" for screen readers, and are expanded by default.
- A search box is not needed.
- Keep `user-select: text` on entries.

### 4. Add the pages

Add to `CODEX` the pages from the lore bible whose systems exist at the time this ticket is built. Add the rest with their system tickets. To keep that simple, add **all** entries now with a `when` that reads a fact which is simply false until the system exists (for example `f.petitions >= 1`, with `f.petitions` defaulting to 0 in the facts object). Light 23 of the Pane ("The Whole Ledger") counts only pages whose systems are live, so mark each entry with `sys: 'sky' | 'petitions' | ...` and keep a `LIVE_SYSTEMS` list in `data.js` that tickets extend.

"N pages are still dark" counts only pages in live systems.

### 5. Facts object

`slowChecks()` builds the facts object `f`. Extend it with zero defaults for: `skyOpen`, `sky.moonless`, `sky.lidless`, `sky.longestnight`, `sky.longestday`, `sky.balance`, `sky.eclipse`, `petitions`, `vigils`, `litanies`, `soundings`, `sets.<id>`, `currents`, `vowsOpen`, `paneLit`, `end`. Later tickets fill them in.

## Tests

- Unlock order is preserved across save and load.
- An old save (all values 1) loads, shows table order in "As learned", and gets increasing numbers for pages unlocked afterward.
- Category counts are right. A category with nothing unlocked is hidden.
- Entries for systems not in `LIVE_SYSTEMS` never unlock and are not counted as dark.
- Schema round-trip test passes.

## Acceptance criteria

- [ ] "As learned" is true.
- [ ] New pages are findable in one tap from the unread badge.
- [ ] No page title is revealed before it is unlocked.
- [ ] The page works with keyboard only (`details` and `summary` are native).
- [ ] No text in the 25 existing pages is changed.

## Out of scope

Illustrations. Rewriting existing lore.
