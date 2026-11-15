# TDR-013: Save durability, backups and file export

**Epic:** Security · **Size:** M · **Depends on:** 001, 010 (modal takes nodes) · **Blocks:** none

## Why

The save is one `localStorage` key. Three ways to lose it today: Safari evicts script-writable storage for sites unused for seven days unless the site is on the Home Screen; importing an old export overwrites the realm with no way back; and a save that fails its seal is set aside with no way for the player to see or recover it. Losing a month of progress is the most reliable way to lose a player. (REVIEW S-10, B-7.)

## Spec

### 1. Backup slots

Three extra keys, each holding one packed save string:

| Key | Written when |
| --- | --- |
| `thedarkrealm.save.v2.bak.daily` | On the first successful autosave of each local calendar day, copy the **previous** stored value here before overwriting |
| `thedarkrealm.save.v2.bak.unlight` | Immediately before `unlight()` resets the run |
| `thedarkrealm.save.v2.bak.import` | Immediately before an import or an erase replaces the realm |

Each write is wrapped in `try`. A quota error on a backup must not block the main save. Backups are sealed strings and go through the normal `unpack` and `adopt` path when restored.

### 2. Restore UI

In the settings page under Keeping add a "Backups" block listing each slot that exists: label, age ("3 hours ago"), fathom number and Gloom total read from the backup (unpack and adopt into a temporary state, never into `S`). Each has "Restore", which confirms, writes the current realm to the `import` slot first, then loads the backup and reloads.

Also list the set-aside copies (`.rejected`, `.unreadable`) when present, with "Export" (shows the raw text so the player can keep it) and "Discard". Do not offer to restore a rejected save.

### 3. Export and import as a file

- Export gains "Download file": build a `Blob` of the packed string, create an object URL, click a temporary `<a download="dark-realm-fathom-N-YYYY-MM-DD.tdr.txt">`, revoke the URL. No CSP change is needed for a download navigation. Verify under the meta CSP on `file://` and under the header CSP on https. If a browser blocks it, hide the button there and keep the copy path.
- Import gains "Choose file": an `<input type="file" accept=".txt,.tdr.txt,text/plain">`, read with `FileReader.readAsText`, reject files over `MAX_SAVE` bytes before reading, then feed the same `importText` path.
- Record `S.exportedAt` (wall ms) on any successful export. Field goes through `fresh()` and `adopt()`.

### 4. Backup reminder

Show one Whisper and a small notice on the settings page when all are true: `played` is over 2 hours, the realm is not running as an installed app (`matchMedia('(display-mode: standalone)')` is false and `navigator.standalone` is not true), and `exportedAt` is unset or more than 14 days old. Text: "This realm lives only in this browser. Browsers clear unused sites. Export a copy from Keeping." Show at most once per 7 days (`S.remindedAt`). Never a modal.

When the game is not installed and the browser is Safari on iOS, add one line: "Adding the game to the Home Screen keeps the save for longer."

### 5. Storage status

On the settings page show: "Storage: persistent" or "Storage: may be cleared by the browser", from `navigator.storage.persisted()` when available. Keep the existing `persist()` request.

## Tests

- Backup rotation with a fake clock and fake storage: the daily slot is written once per day and contains yesterday's last save; the unlight slot holds the pre-reset state; import writes the import slot first.
- A quota error thrown by the fake storage on a backup key does not prevent the main save.
- Restoring a backup round-trips to an identical state.
- A file over the size limit is refused before parsing.
- Reminder logic is a pure function of `(played, installed, exportedAt, remindedAt, now)`. Test the truth table.

## Acceptance criteria

- [ ] A mistaken import can be undone from the settings page.
- [ ] A save can be downloaded as a file and imported from a file on desktop Chrome, Firefox, Safari, and on iOS Safari and Android Chrome.
- [ ] The reminder appears under the stated conditions and not otherwise.
- [ ] README updated: Keeping section, and the Fair play table notes backups are sealed and audited like any save.

## Out of scope

Cloud sync. IndexedDB migration. Automatic periodic downloads.
