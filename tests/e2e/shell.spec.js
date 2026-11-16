'use strict';
/* The app shell: the document never scrolls, only <main> does, so the header (resources) and the
   phone bottom bar stay put however far a page is scrolled. Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve, openKeeping } = require('./server');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }

for (const vp of [{ width: 390, height: 640 }, { width: 1280, height: 640 }]) {
  test('header and bar hold still while a long page scrolls at ' + vp.width + ' px', { skip: !chromium && 'playwright is not installed' }, async () => {
    const srv = await serve();
    const browser = await chromium.launch();
    try {
      const page = await (await browser.newContext({ viewport: vp })).newPage();
      await page.goto('http://127.0.0.1:' + srv.address().port + '/');
      await openKeeping(page);
      await page.locator('main').hover();
      await page.mouse.wheel(0, 4000);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => {
        const m = document.querySelector('main');
        return { doc: document.documentElement.scrollHeight - innerHeight, win: scrollY, main: m.scrollTop,
          top: document.getElementById('top').getBoundingClientRect().top,
          bar: document.getElementById('bar').getBoundingClientRect(), shown: getComputedStyle(document.getElementById('bar')).display !== 'none' };
      });
      assert.ok(r.doc <= 0 && r.win === 0, 'the document itself does not scroll');
      assert.ok(r.main > 0, 'main scrolls');
      assert.equal(r.top, 0, 'the header stays at the top');
      if (r.shown) assert.equal(Math.round(r.bar.bottom), vp.height, 'the bar stays on the bottom edge');
    } finally { await browser.close(); srv.close(); }
  });
}
