# TDR-002: CI, static guards and dependency hygiene

**Epic:** Foundations · **Size:** M · **Depends on:** 001 · **Blocks:** none (but run it early)

## Why

There is no CI. Wrangler is declared as `^4`, nothing updates or audits it, and nothing stops a future change from adding an HTML sink, forgetting a file in the service worker list, or letting the two CSP declarations drift. (REVIEW S-9, S-1, B-5.)

## Spec

### 1. `tools/check.js` (Node, no dependencies), run as `npm run check`

Fails with a clear message when any of these is true:

- A file under `public/js/` or `public/sw.js` contains `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(`, `new Function`, `setTimeout(` or `setInterval(` with a string first argument, or `javascript:`. Until TDR-010 lands, allow an explicit list of existing `innerHTML` lines in `tools/check-allow.json` so the check can ship first. TDR-010 empties that list.
- `public/index.html` or `public/404.html` contains an inline `<script>` body, an `on*=` attribute, or a `style=` attribute.
- Any URL in `public/` source starts with `http://`, `https://` or `//` (remote host). Comments and the README are exempt.
- The CSP in the `<meta>` tag of `index.html` and the CSP in `public/_headers` differ, ignoring `frame-ancestors`.
- A file exists under `public/` that is neither in `FILES` in `sw.js` nor in a short ignore list (`_headers`, `404.html`, `sw.js`, `icons/icon-maskable.svg`).
- `FILES` names a file that does not exist.

### 2. GitHub Actions: `.github/workflows/ci.yml`

- Triggers: `pull_request`, and `push` to the default branch.
- `permissions: contents: read` at the top level.
- Steps: checkout, setup-node with the version from a new `.nvmrc` (22), `npm ci`, `npm test`, `npm run check`, `npm audit --audit-level=high`.
- Pin every action to a full commit SHA with the version in a trailing comment.
- No secrets are used in this workflow.

### 3. Dependencies

- Pin `wrangler` to an exact version in `package.json` (no caret). Keep `package-lock.json` committed.
- Add `"engines": { "node": ">=22" }`.
- `.github/dependabot.yml`: weekly for `npm` and for `github-actions`, grouped, limit 3 open PRs.

### 4. Deploy path (document, do not automate)

Add a "Deploying safely" section to the README:

- The Cloudflare dashboard integration should build with `npm ci` and deploy with `npx wrangler deploy`. Set that in the dashboard build settings.
- If deployment is ever moved to Actions, use a Cloudflare API token scoped to Workers Scripts edit on this single account, stored as an Actions secret, in a separate workflow that runs only on the default branch after CI passes. Do not add that workflow in this ticket.

### 5. `SECURITY.md`

Short. No personal data is stored or sent. Report vulnerabilities through GitHub private vulnerability reporting. Cheating is not a vulnerability; link `docs/design/SECURITY_MODEL.md` section 3.

## Acceptance criteria

- [ ] `npm run check` passes on the branch and fails when each rule is broken in turn (prove with a test file `tests/check.test.js` that runs the checker against small fixture trees).
- [ ] CI runs on the PR and is green.
- [ ] No workflow has write permissions or secrets.
- [ ] `wrangler` is pinned exactly and `npm ci` succeeds from a clean clone.

## Out of scope

Automated deploys. Linting or formatting rules. Browser end-to-end tests.
