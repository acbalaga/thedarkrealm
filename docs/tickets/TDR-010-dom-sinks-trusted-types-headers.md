# TDR-010: Remove HTML string sinks, enforce Trusted Types, harden headers

**Epic:** Security · **Size:** M · **Depends on:** none (easier after 001) · **Blocks:** none

## Why

Six places build HTML as strings and assign `innerHTML`. Today the strings are fixed text plus formatted numbers, so nothing is exploitable. The next feature that interpolates a name changes that, and nothing would catch it. Trusted Types lets the browser refuse string sinks outright. (REVIEW S-1, S-2, S-3.)

## Current sinks (commit `1003666`)

| Line | What |
| --- | --- |
| `game.js:743` | `$('modal-body').innerHTML = m.html` |
| `game.js:745`, `891`, `1092` | `innerHTML = ''` to clear a container |
| `game.js:1209` | buff chips |
| callers of `modal(title, html, ...)` at `629`, `761`, `1023`, `1136`, `1149`, `1162`, `1313` | pass HTML strings |

## Spec

### 1. No string HTML

- Change `modal(title, body, btns)` so `body` is a DOM node or an array of nodes. Add a tiny builder: `h(tag, props, children)` where `props` may set `className`, `id`, `rows`, `readOnly`, and `children` is a string (becomes a text node), a node, or an array. Bold spans use `h('b', null, text)`.
- Rewrite every caller to pass nodes. The away list becomes real `ul` and `li` nodes.
- Buff chips: keep a small keyed set of `span` nodes and update `textContent`. Do not rebuild the container every tick.
- Clearing: replace `x.innerHTML = ''` with `x.replaceChildren()`.

### 2. Trusted Types

- Add to **both** CSP declarations: `require-trusted-types-for 'script'; trusted-types tdr`.
- `navigator.serviceWorker.register(url)` is a script-URL sink. In `game.js`, create one policy and use it only there:

```js
var swUrl = 'sw.js';
if (window.trustedTypes && trustedTypes.createPolicy) {
  swUrl = trustedTypes.createPolicy('tdr', {
    createScriptURL: function (u) { if (u === 'sw.js') return u; throw new TypeError('blocked'); }
  }).createScriptURL('sw.js');
}
```

- No `createHTML` or `createScript` in the policy. That makes every HTML sink fail closed.

### 3. Headers (`public/_headers`)

Add under `/*`:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
X-Permitted-Cross-Domain-Policies: none
```

Do not add `preload` to HSTS. Extend `Permissions-Policy` with: `autoplay=(self), bluetooth=(), browsing-topics=(), clipboard-read=(), display-capture=(), encrypted-media=(), fullscreen=(self), hid=(), idle-detection=(), midi=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), xr-spatial-tracking=()`. Keep `clipboard-write` at its default so Export, Copy still works.

Add a comment in `_headers` noting that the `<meta>` CSP must match except for `frame-ancestors`.

### 4. Guard

Empty `tools/check-allow.json` (from TDR-002) so any `innerHTML` fails CI. If TDR-002 has not landed, add a test that greps `public/js` for the banned sinks.

## Tests and verification

- Unit: `h()` with a string containing `<img src=x onerror=alert(1)>` produces a text node whose `textContent` equals the input (run under a minimal DOM stub or in Playwright).
- Playwright smoke test `tests/e2e/csp.spec.js` (skipped when Playwright is absent): serve `public/` with `npx wrangler dev` or a static server that sends the `_headers` CSP, load the page, collect console errors and `securitypolicyviolation` events for 5 seconds while opening every tab and the export, import and erase modals. Expect none. Then run `document.body.innerHTML = '<b>x</b>'` in the page and expect a TypeError.
- Manual: open from `file://` in Chrome, Firefox and Safari. Export, Copy, Import, the away modal and the ending modal all render correctly.

## Acceptance criteria

- [ ] `grep -rn "innerHTML\|insertAdjacentHTML\|outerHTML" public/js` returns nothing.
- [ ] Both CSPs carry the Trusted Types directives and are otherwise identical apart from `frame-ancestors`.
- [ ] The service worker still registers on https. Verify in DevTools, Application.
- [ ] No CSP violation in the console during a full click-through.
- [ ] README Security section updated: mentions Trusted Types, drops the sentence about "the few HTML strings".
- [ ] `CACHE` bumped.

## Out of scope

Reporting endpoints (`report-to`). There is no server to receive reports.
