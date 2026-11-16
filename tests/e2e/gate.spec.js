'use strict';
/* The threshold: the screen before the seat. Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { serve, openKeeping } = require('./server');
const { engine } = require('../helpers');

let chromium = null, axeSource = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
try { axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); } catch (e) { /* skipped below */ }
const skip = (!chromium && 'playwright is not installed') || (!axeSource && 'axe-core is not installed');

function returning(mutate) {
  const f = engine();
  const S = f.e.S;
  S.totalGloom = 5e5; S.runGloom = 5e5; S.gloom = 1e4; S.clicks = 40; S.played = 4e3; S.den = { gleaner: 8 };
  S.unlocked.shafts = true;
  if (mutate) mutate(S);
  return { k: f.e.KEY, t: f.e.exportText() };
}

async function open(browser, srv, sv) {
  const ctx = await browser.newContext({ tdrGate: true, viewport: { width: 390, height: 780 } });
  if (sv) await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, sv);
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('http://127.0.0.1:' + srv.address().port + '/');
  return { ctx, page, problems, url: 'http://127.0.0.1:' + srv.address().port + '/' };
}

test('a new realm opens on the threshold, which is accessible and closes into the seat', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const { page, problems } = await open(browser, srv, null);
    await page.locator('#gate').waitFor({ state: 'visible' });
    assert.match(await page.textContent('#gate-lines'), /shadows sink/);
    assert.equal((await page.textContent('#gate-go')).trim(), 'Sink down');
    assert.match(await page.textContent('#gate-ed'), /^Edition \d+\.\d+ · /);
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'gate-go');
    assert.equal(await page.evaluate(() => document.querySelector('main').hasAttribute('inert')), true, 'the seat is inert behind it');

    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'gate-go', 'Tab stays on the threshold');
    await page.keyboard.press('g');                        // shortcuts do nothing while it is open
    assert.equal(await page.locator('#gate').isVisible(), true);

    await page.evaluate(axeSource);
    const res = await page.evaluate(() => axe.run(document, { resultTypes: ['violations'] }));
    assert.deepEqual(res.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(', ')), []);

    await page.keyboard.press('Enter');
    await page.locator('#gate').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.querySelector('main').hasAttribute('inert')), false);
    await page.locator('#well').click();
    assert.deepEqual(problems, []);

    await page.reload();                                   // once per tab: a reload goes straight to the seat
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#gate').isVisible(), false);
  } finally { await browser.close(); srv.close(); }
});

test('a returning realm is greeted by state, the Night Report waits behind it, and it can be turned off', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const sv = returning((S) => { S.seen = Date.now() - 3 * 3600e3; });
    const { page } = await open(browser, srv, sv);
    await page.locator('#gate').waitFor({ state: 'visible' });
    assert.equal((await page.textContent('#gate-go')).trim(), 'Take the seat');
    assert.match(await page.textContent('#gate-lines'), /Auric Concord has filed another report/);
    await page.locator('#gate-go').click();
    await page.locator('#gate').waitFor({ state: 'hidden' });
    await page.locator('#modal').waitFor({ state: 'visible' });
    assert.match(await page.textContent('#modal-title'), /While the realm slept/);
    assert.equal(await page.evaluate(() => document.querySelector('#modal').contains(document.activeElement)), true, 'focus moves to the report');
    await page.locator('#modal-btns button').first().click();

    await openKeeping(page);
    const box = page.locator('label.check', { hasText: 'The threshold before the seat' }).locator('input');
    assert.equal(await box.isChecked(), true);
    await box.uncheck();
    await page.locator('button', { hasText: 'Save now' }).click();
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#gate').isVisible(), false, 'turned off in Keeping, it stays closed');
  } finally { await browser.close(); srv.close(); }
});

test('the edition is written at the foot of the Realm and in Keeping', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    const col = page.locator('#page-den .colophon');
    await col.waitFor({ state: 'visible' });
    assert.match(await col.textContent(), /^Edition \d+\.\d+ · \S/);
    await openKeeping(page);
    assert.equal(await page.locator('text=/^Build tdr-/').isVisible(), true);
    assert.equal(await page.locator('#page-set p', { hasText: /^Edition \d+\.\d+ · / }).isVisible(), true);
  } finally { await browser.close(); srv.close(); }
});
