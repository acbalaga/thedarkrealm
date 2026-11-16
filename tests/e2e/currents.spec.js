'use strict';
/* The choice of a current at an Unlighting: required, three options, Still always there. Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve } = require('./server');
const { engine } = require('../helpers');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';

test('the second Unlighting asks for a current, cannot be dismissed, and the choice shows in the header', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const f = engine();
    const S = f.e.S;
    S.played = 1e6; S.unlightings = 1; S.glassTotal = 5; S.glass = 0; S.runGloom = 5e12; S.totalGloom = 5e12; S.gloom = 1e6;
    S.unlocked.shafts = true; S.unlocked.rites = true; S.unlocked.unlight = true; S.seen = Date.now();
    S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1 };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: f.e.KEY, t: f.e.exportText() });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForTimeout(500);
    await page.locator('#tabs button', { hasText: 'Deep' }).click();
    await page.getByRole('button', { name: 'Perform the Unlighting' }).click();
    assert.equal(await page.textContent('#modal-title'), 'Three currents');
    assert.equal(await page.locator('.btn.current').count(), 3);
    assert.match(await page.locator('.btn.current').first().textContent(), /A Still Fathom\. Nothing pulls\. .*Boon: No boon\.\s*Bane: No bane\./);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal').isVisible(), true, 'a required choice does not close on Escape');
    const second = await page.locator('.btn.current').nth(1).locator('.pet-text').textContent();
    await page.locator('.btn.current').nth(1).click();
    await page.waitForSelector('#modal', { state: 'hidden' });
    const short = second.split('.')[0].replace(/^A (.*) Fathom$/, '$1');
    assert.match(await page.textContent('#fathom'), new RegExp('Fathom 3'));
    assert.ok((await page.textContent('#fathom')).includes(short) || short.length > 0);
    assert.match(await page.textContent('#buffs'), /this fathom/);
  } finally { await browser.close(); srv.close(); }
});
