'use strict';
/* Browser check of the CSP and Trusted Types. Run with `npm run e2e`. It is not part of
   `npm test` because it needs Playwright, and it skips itself when Playwright is missing.
   A small static server sends the headers from public/_headers, so the real header CSP is tested. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const path = require('path');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }

const PUB = path.join(__dirname, '..', '..', 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

function headersFor() {
  const out = {};
  let inAll = false;
  fs.readFileSync(path.join(PUB, '_headers'), 'utf8').split('\n').forEach((line) => {
    if (/^\S/.test(line) && !line.startsWith('#')) inAll = line.trim() === '/*';
    else if (inAll && /^\s+\S+:/.test(line)) { const i = line.indexOf(':'); out[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  });
  return out;
}

function serve() {
  const hdr = headersFor();
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(PUB, p);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, hdr); res.end('no'); return; }
    res.writeHead(200, Object.assign({ 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }, hdr));
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

test('no CSP violations through a click-through, and string HTML sinks are refused', { skip: !chromium && 'playwright is not installed' }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));
    });
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForTimeout(500);
    for (let i = 0; i < 40; i++) { await page.click('#well'); }
    // Open every tab that is visible, then the Realm tab's modals.
    const tabs = await page.$$('#tabs button');
    for (const t of tabs) { if (await t.isVisible()) { await t.click().catch(() => {}); await page.waitForTimeout(100); } }
    await page.locator('#tabs button', { hasText: 'Realm' }).click();
    await page.getByRole('button', { name: 'Export save' }).click();
    assert.match(await page.inputValue('#io'), /^TDR2\./);
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Import save' }).click();
    await page.fill('#io', '<img src=x onerror=alert(1)>');
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    assert.equal(await page.$$eval('#io-err img', (n) => n.length), 0, 'text from the player is never parsed as HTML');
    assert.ok((await page.textContent('#io-err')).length > 0);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Erase everything' }).click();
    await page.getByRole('button', { name: 'Keep it' }).click();
    await page.waitForTimeout(5000);

    assert.deepEqual(await page.evaluate(() => window.__csp), [], 'securitypolicyviolation events');
    assert.deepEqual(problems, [], 'console errors before the deliberate sink probe');
    const msg = await page.evaluate(() => { try { document.body.innerHTML = '<b>x</b>'; return 'allowed'; } catch (e) { return e.name; } });
    assert.equal(msg, 'TypeError', 'innerHTML with a string must be refused by Trusted Types');
  } finally {
    await browser.close();
    srv.close();
  }
});
