'use strict';
/* The service worker update flow in a real browser. Run with `npm run e2e`.
   Works on a temporary copy of public/ so the repo is never touched. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { serve, PUB, openKeeping } = require('./server');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((n) => {
    const a = path.join(from, n), b = path.join(to, n);
    if (fs.statSync(a).isDirectory()) copyTree(a, b); else fs.copyFileSync(a, b);
  });
}

test('a new version waits, is offered, and applies on request', { skip: !chromium && 'playwright is not installed' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdr-update-'));
  copyTree(PUB, dir);
  const srv = await serve(dir);
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext()).newPage();
    const url = 'http://127.0.0.1:' + srv.address().port + '/';
    await page.goto(url);
    await page.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.getRegistration().then((r) => r && r.active));
    await page.reload();                                   // now controlled by the worker
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await openKeeping(page);
    const v1 = (await page.locator('text=/^Version tdr-/').textContent()).trim();
    assert.equal(await page.locator('button', { hasText: 'Apply update' }).isVisible(), false);

    // Ship a "new version": change a listed file and its cache name.
    fs.appendFileSync(path.join(dir, 'js', 'data.js'), '\n/* v2 */\n');
    fs.writeFileSync(path.join(dir, 'js', 'version.js'), "window.TDR_VERSION = 'tdr-second0000';\n");
    const sw = path.join(dir, 'sw.js');
    fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/var CACHE = '[^']*';/, "var CACHE = 'tdr-second0000';"));

    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
    await openKeeping(page);
    await page.locator('button', { hasText: 'Apply update' }).waitFor({ state: 'visible', timeout: 10000 });
    assert.equal((await page.locator('text=/^Version tdr-/').textContent()).trim(), v1, 'the running page keeps its version until applied');

    await Promise.all([page.waitForNavigation(), page.locator('button', { hasText: 'Apply update' }).click()]);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await openKeeping(page);
    assert.equal((await page.locator('text=/^Version tdr-/').textContent()).trim(), 'Version tdr-second0000');

    // Offline still loads from the new cache.
    await page.context().setOffline(true);
    await page.reload();
    assert.match(await page.textContent('body'), /Vesperdeep/);
  } finally { await browser.close(); srv.close(); }
});
