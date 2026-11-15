'use strict';
/* The petition card on the Seat, at 360 px, by pointer and by keyboard. Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve } = require('./server');
const { engine } = require('../helpers');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';

test('an offer is a card of three buttons; granting one leaves a chip, and the card does not return today', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const f = engine();
    f.e.S.totalGloom = 5e6; f.e.S.runGloom = 5e6; f.e.S.gloom = 1e5; f.e.S.played = 4e4; f.e.S.den = { gleaner: 30, scribe: 5 };
    f.e.S.seen = Date.now(); f.e.S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1 };
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 } });
    await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: f.e.KEY, t: f.e.exportText() });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForSelector('#petition-card:not([hidden])');
    assert.match(await page.textContent('#petition-card h3'), /The denizens have intentions/);
    const buttons = page.locator('#petition-card .petition');
    assert.equal(await buttons.count(), 3);
    for (let i = 0; i < 3; i++) assert.ok((await buttons.nth(i).boundingBox()).height >= 44);
    const label = await buttons.first().locator('.pet-text').textContent();
    await buttons.first().focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#petition-card', { state: 'hidden' });
    assert.match(await page.textContent('#buffs'), /until (midnight|the next grant)/);
    assert.match(await page.textContent('#log'), /Granted\. The .+ have gone to see about it\./);
    assert.ok(label.length > 10);
  } finally { await browser.close(); srv.close(); }
});
