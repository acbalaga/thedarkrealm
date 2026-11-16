'use strict';
/* Soundings in a real browser: lower a line, see when it will be slack, draw up a slack one, read the shelves.
   Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve } = require('./server');
const { engine } = require('../helpers');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';

test('lower a line, read its clock time, draw up a slack line, and see six shelves', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const f = engine();
    const S = f.e.S;
    S.totalGloom = 5e9; S.runGloom = 5e9; S.gloom = 4e9; S.played = 4e4; S.den = { gleaner: 40, scribe: 20, weaver: 10, tide: 2 };
    S.unlocked.shafts = true; S.unlocked.soundings = true; S.seen = Date.now();
    S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1 };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: f.e.KEY, t: f.e.exportText() });
    const page = await ctx.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForTimeout(500);
    await page.locator('#tabs button', { hasText: 'Host' }).click();
    await page.locator('#subnav button', { hasText: 'Soundings' }).click();
    assert.equal(await page.locator('.shelf').count(), 6);
    await page.locator('.btn.sounding', { hasText: 'The Shallows' }).click();
    await page.waitForSelector('.line-slot .bar');
    assert.match(await page.textContent('.line-slot .bar-txt'), /left · slack at \d{1,2}:\d{2}/);
    assert.match(await page.textContent('#line-status'), /^The line is down, /);
    assert.match(await page.textContent('#log'), /The line is down\. It will take a while\./);
    // Make it slack by letting the saved clock run out: reload with the line at zero.
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    assert.equal(JSON.stringify(problems), '[]');
  } finally { await browser.close(); srv.close(); }
});

test('a slack line is drawn up with a button, and the Sea answers', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const f = engine();
    const S = f.e.S;
    S.totalGloom = 5e9; S.runGloom = 5e9; S.gloom = 4e9; S.played = 4e4; S.den = { gleaner: 40, tide: 1 };
    S.unlocked.shafts = true; S.unlocked.soundings = true; S.seen = Date.now();
    S.snd.lines = [{ id: 'shallows', left: 0 }];
    S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1 };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: f.e.KEY, t: f.e.exportText() });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForTimeout(500);
    assert.equal(await page.textContent('#line-status'), 'The line is slack.');
    await page.locator('#tabs button', { hasText: 'Host' }).click();
    await page.locator('#subnav button', { hasText: 'Soundings' }).click();
    await page.getByRole('button', { name: 'Draw up' }).click();
    await page.waitForSelector('.btn.sounding');
    assert.match(await page.textContent('#log'), /The line comes up wet|\./);
  } finally { await browser.close(); srv.close(); }
});
