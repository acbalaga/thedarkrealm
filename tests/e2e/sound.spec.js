'use strict';
/* Sound under the real header CSP: the context starts only after a gesture, nothing is blocked, and the settings are there.
   Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve, openKeeping } = require('./server');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';

test('audio needs no CSP change, starts on a real gesture, and the Sound settings work', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await (await browser.newContext()).newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.addInitScript(() => {
      window.__csp = []; window.__ctx = 0;
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective));
      const Orig = window.AudioContext;
      window.AudioContext = function () { window.__ctx++; return new Orig(); };
    });
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => window.__ctx), 0, 'no audio before a gesture');
    await page.click('#well');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__ctx), 1, 'one context after the first gesture');
    await page.click('#well');
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__ctx), 1);
    await openKeeping(page);
    assert.equal(await page.getByLabel('Master volume').inputValue(), '40');
    await page.getByLabel('Master volume').fill('70');
    await page.getByLabel('Ambience').uncheck();
    await page.getByLabel('Cues').uncheck();
    assert.equal(JSON.stringify(await page.evaluate(() => window.__csp)), '[]');
    assert.equal(JSON.stringify(problems), '[]');
  } finally { await browser.close(); srv.close(); }
});
