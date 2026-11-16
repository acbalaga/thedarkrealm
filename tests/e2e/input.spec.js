'use strict';
/* Browser checks for input handling and the second-window rules. Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve } = require('./server');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';

async function open(srv, ctx) {
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + srv.address().port + '/');
  await page.waitForTimeout(400);
  return page;
}

test('holding Enter on the Stillwell gathers once, not at the key repeat rate', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const page = await open(srv, await browser.newContext());
    await page.focus('#well');
    const t0 = Date.now();
    while (Date.now() - t0 < 2000) { await page.keyboard.down('Enter'); await page.waitForTimeout(30); }
    await page.keyboard.up('Enter');
    // With no denizens the only Gloom is what hands gather, one Gloom per gather.
    assert.equal(await page.textContent('#r-gloom'), '1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    assert.equal(await page.textContent('#r-gloom'), '2', 'a fresh press still gathers');
  } finally { await browser.close(); srv.close(); }
});

test('erasing the realm in one window stops the other', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    const a = await open(srv, ctx), b = await open(srv, ctx);
    await a.click('#well');
    await a.waitForTimeout(300);
    await a.evaluate(() => window.dispatchEvent(new Event('pagehide')));   // make sure a save exists
    await b.evaluate(() => localStorage.removeItem('thedarkrealm.save.v2'));
    await a.waitForSelector('#modal:not([hidden])');
    assert.match(await a.textContent('#modal-title'), /erased in another window/);
    assert.equal(await a.locator('#modal-btns button').first().textContent(), 'Begin again');
  } finally { await browser.close(); srv.close(); }
});
