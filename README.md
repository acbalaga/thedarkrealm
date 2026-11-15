# The Dark Realm

An offline, browser-based idle game. Original setting, no purchases, no network calls, no dependencies.

You are a shadow that woke without an owner, sitting on an empty throne in Vesperdeep, the place shadows sink to when the living die. Above, the Auric Concord is drilling Sunshafts into the realm to burn shadow for lamp-fuel. Keep the dark quiet.

## Play

Open `public/index.html` in any modern browser. That is the whole install. It runs from `file://` with no server.

### Add to Home Screen

Installing as an app needs the game served over https (a browser rule, not a game rule). The repo is set up for Cloudflare Workers, see Deploy below. Once it is live:

- **iPhone / iPad (Safari):** Share, Add to Home Screen.
- **Android (Chrome):** menu, Install app (or Add to Home screen).
- **Desktop Chrome / Edge:** install icon in the address bar.

After the first visit the service worker has every file cached, so the installed app launches and plays with no connection. It opens full screen, respects the notch and home-indicator areas, and saves when it is sent to the background. An installed app keeps its own save, separate from the browser tab, so use Realm > Export save to carry progress across.

Updates load in the background and apply on the next launch. Bump `CACHE` in `public/sw.js` when shipping changes.

## Deploy to Cloudflare Workers

The game deploys as a static-assets Worker. There is no Worker script and nothing runs server-side. Only the contents of `public/` are published.

One-off, from a terminal:

```
npm install
npx wrangler login
npm run deploy
```

Wrangler prints the live URL (`https://thedarkrealm.<your-subdomain>.workers.dev`). `npm run dev` serves the same build locally at `http://localhost:8787`.

Or deploy on every push: in the Cloudflare dashboard go to Workers & Pages, Create, Import a repository, and pick this repo. The defaults work (deploy command `npx wrangler deploy`), because `wrangler.jsonc` carries the settings.

### Deploying safely

- In the Cloudflare dashboard build settings, build with `npm ci` and deploy with `npx wrangler deploy`.
- If deployment ever moves to GitHub Actions, use a Cloudflare API token scoped to Workers Scripts edit on this single account, stored as an Actions secret, in a separate workflow that runs only on the default branch after CI passes. No such workflow exists yet.
- CI (`.github/workflows/ci.yml`) runs `npm test`, `npm run check` and `npm audit --audit-level=high` with read-only permissions and no secrets. `wrangler` is pinned to an exact version.

| File | Purpose |
| --- | --- |
| `wrangler.jsonc` | Worker name, compatibility date, assets folder, 404 handling |
| `public/_headers` | Security headers: CSP (with `frame-ancestors`), `nosniff`, no framing, no referrer, HSTS, cross-origin isolation headers, a narrowed Permissions-Policy, and `no-cache` on the service worker |
| `public/404.html` | Not-found page |
| `package.json` | Pins Wrangler and provides `dev` and `deploy` scripts. The game itself has no dependencies. |

To use a custom domain, add it under the Worker's Settings, Domains & Routes. To rename the Worker, change `name` in `wrangler.jsonc`.

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

## Fair play

There are no purchases, accounts or leaderboards, and no server. Everything runs on the player's device, which sets a hard limit: anyone willing to edit the source can do what they like. Within that limit the game resists the easy routes.

| Route | What stops it |
| --- | --- |
| Console access to game state or tables | State lives in a closure. No globals. Data tables are frozen and removed from `window`. |
| Editing the save in localStorage or an export | Saves carry a keyed checksum. A save that fails it is refused on import and set aside on load (kept under `thedarkrealm.save.v2.rejected`, never deleted). |
| Forging a save with a valid checksum | Every load is audited against the game's own bookkeeping: denizens, workings and rites must be affordable from Gloom and Echoes actually earned this fathom (Rites carried in by Rites Remembered are tracked separately), Nightglass must come from Unlightings, perks from Nightglass, and lifetime totals must be reachable in the time played. Impossible values are removed and the Realm tab records an irregularity. |
| Scripted clicking | The Stillwell and Stray Lanterns only accept real input events, at most 14 gathers a second. |
| Changing the device clock | Running time uses the monotonic clock, so the system clock cannot speed play. Time away is capped (8h, 24h with a perk) and paid at the away pace. Winding the clock back forfeits an equal amount of future away time. |
| Two tabs on one save | The older tab stops and says so, also when the other window erases the realm. |
| Holding a key on the Stillwell or a Lantern | Only a fresh press of Enter or Space acts. Key repeat is ignored. |
| The old unsealed v1 save | Read once, size-limited, marked as irregular, and rewritten as a sealed save at once. It is no longer read after 30 June 2027. |
| Re-enabling a disabled button | Every purchase re-checks cost and unlock conditions in code. |

Known limit: winding the device clock forward and leaving it there still earns one capped away credit per jump. With no server there is no trusted clock to compare against.

## Security

- A Content-Security-Policy allows scripts, styles and images from the game's own folder only. No inline script, no `eval`, no remote hosts, no forms. It is set in the page itself, and again as a response header on Cloudflare, where it also forbids embedding the game in another site.
- Imported saves are size-limited, format-checked, and copied field by field against a fixed schema. Nothing is merged, so crafted keys such as `__proto__` are never touched.
- All dynamic text is written with `textContent` or text nodes. The game never parses a string as HTML, and Trusted Types (`require-trusted-types-for 'script'`) makes the browser refuse it if a future change tries. The only policy, `tdr`, allows one fixed service worker URL.
- The service worker handles same-origin GET requests only and stores only complete, successful, same-origin responses.
- No network requests, analytics, cookies or third-party code.

## Files

| File | Purpose |
| --- | --- |
| `public/index.html` | Page shell |
| `public/css/style.css` | All styling |
| `public/js/data.js` | Denizens, upgrades, rites, perks, bosses, codex text |
| `public/js/core.js` | Game rules: state, save integrity, economy, Sunshafts, lanterns, time. No browser access |
| `public/js/game.js` | Interface: pages, rendering, input, boot |
| `tests/` | `npm test`. Save, rules and time tests, with real saves in `tests/fixtures/` |
| `public/sw.js`, `public/manifest.webmanifest` | Offline cache and install metadata when hosted |
| `public/icon.svg`, `public/favicon.ico`, `public/icons/` | Logo, favicon, Home Screen and maskable icons |

Balance numbers sit at the top of `public/js/core.js` and in `public/js/data.js`.
