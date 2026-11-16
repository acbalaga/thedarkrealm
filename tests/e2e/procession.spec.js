'use strict';
/* A Procession on a 360 px screen: five lamps, all tappable, and the bonus line when all are snuffed.
   Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve } = require('./server');
const { engine } = require('../helpers');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';

test('the eighth lantern is a Procession that can be snuffed by touch at 360 px', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const f = engine();
    f.e.S.totalGloom = 1000; f.e.S.runGloom = 1000; f.e.S.gloom = 1000; f.e.S.played = 600;
    f.e.S.lanterns = 7; f.e.S.lanternSpawns = 7; f.e.S.lanternIn = 0.5;
    f.e.S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1 };
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true });
    await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: f.e.KEY, t: f.e.exportText() });
    const page = await ctx.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForSelector('.lantern:not([hidden])', { timeout: 25000 });
    let tapped = 0, sizes = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 14000) {
      if ((await page.textContent('#log')).includes('The whole procession, dark.')) break;
      const boxes = await page.$$eval('.lantern:not([hidden])', (els) => els.map((e) => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height }; }));
      for (const b of boxes) {
        sizes.push(Math.min(b.w, b.h));
        await page.touchscreen.tap(b.x, b.y + 8);
        tapped++;
      }
      await page.waitForTimeout(120);
    }
    assert.match(await page.textContent('#log'), /The whole procession, dark\. The Scribes are counting chains\./);
    assert.ok(Math.min(...sizes) >= 43.5, 'every lamp is a 44 px target: ' + Math.min(...sizes));
    assert.equal(JSON.stringify(problems), '[]');
    assert.match(await page.textContent('#streak-chip'), /^Unbroken ×\d/);
  } finally { await browser.close(); srv.close(); }
});
