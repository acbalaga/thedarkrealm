'use strict';
/* The Night Report and the return-time hint. Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve } = require('./server');
const { engine } = require('../helpers');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';

function awaySave() {
  const f = engine();
  const S = f.e.S;
  S.totalGloom = 5e5; S.runGloom = 5e5; S.gloom = 4e4; S.played = 4e4; S.den = { gleaner: 20, scribe: 10, weaver: 4 };
  S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1 };
  return { key: f.e.KEY, text: f.e.exportText() };   // its clock is long past, so the page credits an absence
}

test('a long absence opens a report with what happened, what waits, and a way to the right page', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const sv = awaySave();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: sv.key, t: sv.text });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForSelector('#modal:not([hidden])');
    assert.equal(await page.textContent('#modal-title'), 'While the realm slept');
    const body = await page.textContent('#modal-body');
    assert.match(body, /Away .*The realm worked for the first 8h, at 50% of its pace\./);
    assert.match(body, /Rite of the Long Sleep raises the pace\./);
    assert.match(body, /Gloom gathered/);
    assert.match(body, /The realm stops working after 8 hours alone\. The Unsleeping setting in Nightglass makes that 24\./);
    const waiting = page.locator('.waiting button');
    assert.ok((await waiting.count()) >= 1, 'something is waiting');
    assert.match(await waiting.first().textContent(), /workings? can be completed\./);
    await waiting.first().click();
    await page.waitForSelector('#modal', { state: 'hidden' });
    assert.match(await page.locator('#subnav button.on').textContent(), /Workings/);
  } finally { await browser.close(); srv.close(); }
});

test('the return time is on the first screen at 360 px, and no dialog appears for a present player', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const f = engine();
    f.e.S.totalGloom = 100; f.e.S.runGloom = 100; f.e.S.gloom = 100; f.e.S.played = 100;
    f.e.S.seen = Date.now();
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 } });
    await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: f.e.KEY, t: f.e.exportText() });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('#modal').isHidden(), true);
    const hint = page.locator('#return-hint');
    assert.match(await hint.textContent(), /^If you leave now, the realm works until \d{1,2}:\d{2}/);
    const box = await hint.boundingBox();
    assert.ok(box.y + box.height <= 640 && box.y >= 0, 'inside the first screen: ' + JSON.stringify(box));
  } finally { await browser.close(); srv.close(); }
});
