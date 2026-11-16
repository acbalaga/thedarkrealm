'use strict';
/* The Pane: list of 24, a whole pane asks for an ending, and the choice is confirmed. Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve } = require('./server');
const { engine } = require('../helpers');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';

test('the Pane page lists 24 lights and shows a count', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const f = engine();
    const S = f.e.S;
    S.played = 1e6; S.unlightings = 3; S.glassTotal = 3; S.glass = 0; S.totalGloom = 5e9; S.runGloom = 5e9; S.gloom = 1e6; S.den = { gleaner: 40 };
    S.unlocked.shafts = true; S.unlocked.rites = true; S.unlocked.unlight = true; S.unlocked.pane = true; S.seen = Date.now();
    S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1 };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: f.e.KEY, t: f.e.exportText() });
    const page = await ctx.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForTimeout(500);
    await page.locator('#tabs button', { hasText: 'Deep' }).click();
    await page.locator('#subnav button', { hasText: 'The Pane' }).click();
    assert.equal(await page.locator('.pane-item').count(), 24);
    assert.match(await page.textContent('.pane-count'), /^\d+ of 24 lights\. Gloom, Might and Echoes ×1\.\d\d\.$/);
    assert.equal(JSON.stringify(problems), '[]');
  } finally { await browser.close(); srv.close(); }
});
