# The Dark Realm

An offline, browser-based idle game. Original setting, no purchases, no network calls, no dependencies.

You are a shadow that woke without an owner, sitting on an empty throne in Vesperdeep, the place shadows sink to when the living die. Above, the Auric Concord is drilling Sunshafts into the realm to burn shadow for lamp-fuel. Keep the dark quiet.

## Play

Open `index.html` in any modern browser. That is the whole install. It runs from `file://` with no server.

If you host the folder over http(s) (GitHub Pages works), a service worker caches it so it can be installed and played offline as an app.

## How it works

- **Gloom** is the main resource. Touch the Stillwell to gather it, then bind **Denizens** that gather it for you.
- **Workings** are one-time upgrades bought with Gloom.
- **Sunshafts** open early on. Your Host fights on its own, sealing shafts for **Echoes**. Every tenth shaft is a timed Lampwarden.
- **Rites** spend Echoes on Might, Gloom, Echo gain, offline pace and more.
- **The Unlighting** is the prestige reset. It trades the current realm for **Nightglass**, which gives a permanent bonus and buys permanent perks.
- **Stray Lanterns** drift through now and then. Snuff them for a boon.
- **Omens** (achievements) each add 1% Gloom. The **Codex** fills in the story as you go.
- The realm keeps working while the tab is closed: 50% pace for up to 8 hours, both improvable.
- Sealing Sunshaft 150 reaches the ending. Play continues after it.

Saves live in the browser's localStorage. Use Realm > Export save to back up or move a save.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell |
| `css/style.css` | All styling |
| `js/data.js` | Denizens, upgrades, rites, perks, bosses, codex text |
| `js/game.js` | Game loop, save/load, interface |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Optional offline install when hosted |

Balance numbers sit at the top of `js/game.js` and in `js/data.js`.
