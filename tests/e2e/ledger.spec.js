'use strict';
/* The Fathoms page and the realm card in a real browser. Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve, openKeeping } = require('./server');
const { engine } = require('../helpers');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';

test('the realm card is 1200 by 630, not blank, saves as a file and holds no save data; the Fathoms page lists history', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const f = engine();
    const S = f.e.S;
    S.unlightings = 3; S.glassTotal = 40; S.played = 1e5; S.bestShaft = 60; S.unlocked.unlight = true; S.unlocked.shafts = true; S.seen = Date.now();
    S.fathoms = [{ n: 1, current: 'still', vow: '', kept: false, sec: 3600, glass: 5, best: 20 }, { n: 2, current: 'silted', vow: '', kept: false, sec: 7200, glass: 30, best: 45 }];
    S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1 };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: f.e.KEY, t: f.e.exportText() });
    const page = await ctx.newPage();
    let requests = 0;
    page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1')) requests++; });
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForTimeout(500);
    await page.locator('#tabs button', { hasText: 'Ledger' }).click();
    await page.locator('#subnav button', { hasText: 'Fathoms' }).click();
    assert.equal(await page.locator('.ftable tbody tr').count(), 2);
    assert.match(await page.textContent('.ftable tbody tr'), /Fathom|2|Silted/);
    await page.locator('#subnav button', { hasText: 'Keeping' }).click();
    await page.getByRole('button', { name: 'Realm card' }).click();
    const dims = await page.locator('canvas.realm-card').evaluate((c) => [c.width, c.height]);
    assert.deepEqual(dims, [1200, 630]);
    const lit = await page.locator('canvas.realm-card').evaluate((c) => { const d = c.getContext('2d').getImageData(0, 0, 1200, 630).data; let n = 0; for (let i = 0; i < d.length; i += 4000) if (d[i] > 120 || d[i + 1] > 120) n++; return n; });
    assert.ok(lit > 0, 'the card has drawn text');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save image' }).click()]);
    assert.equal(dl.suggestedFilename(), 'dark-realm-card.png');
    assert.ok(!(await page.locator('canvas.realm-card').getAttribute('aria-label')).includes('TDR2'));
    assert.equal(requests, 0, 'nothing leaves the page');
    assert.ok(openKeeping);
  } finally { await browser.close(); srv.close(); }
});
