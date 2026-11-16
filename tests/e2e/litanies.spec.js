'use strict';
/* Litanies in a real browser: pointer, keyboard, and no effect from a synthetic event or a held key.
   Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve } = require('./server');
const { engine } = require('../helpers');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';

test('Litanies work by pointer and key, ignore synthetic events and held keys, and name their state', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const f = engine();
    f.e.S.totalGloom = 5e7; f.e.S.runGloom = 5e7; f.e.S.gloom = 3e6; f.e.S.played = 4e4; f.e.S.den = { gleaner: 12, scribe: 6 };
    f.e.S.echoesTotal = 200; f.e.S.echoes = 90; f.e.S.runEchoes = 200; f.e.S.unlocked.shafts = true; f.e.S.unlocked.rites = true;
    f.e.S.seen = Date.now();
    f.e.S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1 };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: f.e.KEY, t: f.e.exportText() });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForTimeout(600);
    const teeth = page.locator('#litanies .litany').nth(0);
    assert.equal(await teeth.getAttribute('aria-label'), 'Litany of Teeth, ready');
    const box = await teeth.boundingBox();
    assert.ok(box.width >= 48 && box.height >= 48);
    // A synthetic click is not a real input and does nothing.
    await page.evaluate(() => document.querySelector('#litanies .litany').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    assert.equal(await teeth.getAttribute('aria-label'), 'Litany of Teeth, ready');
    // A real click speaks it, and the name carries the cooldown.
    await teeth.click();
    assert.match(await teeth.getAttribute('aria-label'), /^Litany of Teeth, 4 minutes 5\d seconds$|^Litany of Teeth, 5 minutes$/);
    assert.equal(await teeth.isDisabled(), true);
    assert.match(await page.textContent('#buffs'), /Litany of Teeth · \d+s/);
    // Keys 2 and 3 speak the others. Holding a key speaks once.
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    for (let i = 0; i < 5; i++) await page.keyboard.down('2');
    await page.keyboard.up('2');
    assert.match(await page.locator('#litanies .litany').nth(1).getAttribute('aria-label'), /^Litany of the Held Breath, \d/);
    await page.keyboard.press('3');
    assert.match(await page.locator('#litanies .litany').nth(2).getAttribute('aria-label'), /^Litany of the Undertow, \d/);
    // The same three buttons sit under the bars on the Sunshafts page.
    await page.locator('#tabs button', { hasText: 'Host' }).click();
    assert.equal(await page.locator('.page:not([hidden]) .litany').count(), 3);
    assert.equal(await page.locator('.page:not([hidden]) .litany').first().isDisabled(), true);
  } finally { await browser.close(); srv.close(); }
});
