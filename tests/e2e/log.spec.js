'use strict';
/* Whispers kept across a reload, and what happens to hostile text in storage. Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve } = require('./server');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';

test('earlier Whispers return dimmed under a divider, and markup in them stays text', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      try {
        if (!localStorage.getItem('thedarkrealm.log.v1')) {
          localStorage.setItem('thedarkrealm.log.v1', JSON.stringify(['<img src=x onerror=window.__pwned=1>', 'The seat was warm.', 5, 'x'.repeat(400)]));
        }
      } catch (e) {}
    });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#log li.divider').textContent(), 'earlier');
    const lines = await page.locator('#log li.earlier-line').allTextContents();
    assert.deepEqual(lines, ['<img src=x onerror=window.__pwned=1>', 'The seat was warm.']);
    assert.equal(await page.locator('#log img').count(), 0);
    assert.equal(await page.evaluate(() => window.__pwned), undefined);
    // New lines sit above the divider, and a reload keeps this session's lines.
    assert.equal(await page.locator('#log li').first().getAttribute('class'), null);
    await page.click('#well');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.reload();
    await page.waitForTimeout(400);
    const kept = JSON.parse(await page.evaluate(() => localStorage.getItem('thedarkrealm.log.v1')));
    assert.ok(kept.includes('The seat was warm.'));
    assert.ok(kept.length <= 30);
  } finally { await browser.close(); srv.close(); }
});
