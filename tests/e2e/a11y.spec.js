'use strict';
/* Accessibility checks in a real browser: axe-core on every destination and an open dialog, keyboard
   operation, focus handling, reduced motion, and target sizes. Run with `npm run e2e`.
   axe-core (Deque's engine) is a devDependency and is only ever run from here, never shipped. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { serve, openKeeping } = require('./server');
const { engine } = require('../helpers');

let chromium = null, axeSource = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
try { axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); } catch (e) { /* skipped below */ }
const skip = (!chromium && 'playwright is not installed') || (!axeSource && 'axe-core is not installed');

function save(mutate) {
  const f = engine();
  const S = f.e.S;
  S.totalGloom = 5e7; S.runGloom = 5e7; S.gloom = 3e6; S.played = 4e4; S.den = { gleaner: 12, scribe: 6, weaver: 2 };
  S.echoesTotal = 200; S.echoes = 90; S.bestShaft = 12; S.shaftTop = 13; S.shaft = 13;
  S.unlocked.shafts = true; S.unlocked.rites = true; S.unlocked.unlight = true;
  if (mutate) mutate(S);
  return { key: f.e.KEY, text: f.e.exportText() };
}

async function open(browser, srv, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 800 }, reducedMotion: opts.reducedMotion });
  if (opts.save !== false) {
    const sv = save();
    await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: sv.key, t: sv.text });
  }
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('http://127.0.0.1:' + srv.address().port + '/');
  await page.waitForTimeout(500);
  const dismiss = await page.$('#modal:not([hidden]) #modal-btns button');
  if (dismiss) await dismiss.click();
  return { page, ctx, problems };
}

async function runAxe(page) {
  await page.evaluate(axeSource);
  const res = await page.evaluate(() => axe.run(document, { resultTypes: ['violations'] }));
  return res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => v.id + ' (' + v.impact + '): ' + v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | '));
}

async function destinations(page, narrow) {
  const out = [];
  const labels = ['Seat', 'Realm', 'Host', 'Deep', 'Ledger'].filter((l) => narrow || l !== 'Seat');
  for (const label of labels) {
    await (narrow ? page.locator('#bar button', { hasText: label }) : page.locator('#tabs button', { hasText: label })).click();
    const n = (await page.$$('#subnav:not([hidden]) button')).length || 1;
    for (let i = 0; i < n; i++) {
      const subs = await page.$$('#subnav:not([hidden]) button');
      if (subs.length) await subs[i].click();
      await page.waitForTimeout(120);
      out.push(label + ' page ' + i + ': ' + JSON.stringify(await runAxe(page)));
    }
  }
  return out;
}

test('axe finds no serious or critical issue on any destination, at desktop and phone size', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    for (const [viewport, narrow] of [[{ width: 1280, height: 800 }, false], [{ width: 390, height: 844 }, true]]) {
      const { page } = await open(browser, srv, { viewport });
      const rows = await destinations(page, narrow);
      rows.forEach((r) => assert.ok(/: \[\]$/.test(r), (narrow ? 'phone ' : 'desktop ') + r));
    }
  } finally { await browser.close(); srv.close(); }
});

test('axe finds no serious or critical issue in an open dialog', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const { page } = await open(browser, srv);
    await openKeeping(page);
    await page.getByRole('button', { name: 'Import save' }).click();
    assert.equal(JSON.stringify(await runAxe(page)), '[]');
  } finally { await browser.close(); srv.close(); }
});

test('a dialog traps focus, closes on Escape, and returns focus to what opened it', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const { page } = await open(browser, srv);
    await openKeeping(page);
    const opener = page.getByRole('button', { name: 'Import save' });
    await opener.focus();
    await opener.press('Enter');
    await page.waitForSelector('#modal:not([hidden])');
    assert.equal(await page.evaluate(() => !!document.querySelector('.modal-card').contains(document.activeElement)), true, 'focus moved into the dialog');
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.querySelector('.modal-card').contains(document.activeElement)), true, 'Tab stays inside, press ' + i);
    }
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.querySelector('.modal-card').contains(document.activeElement)), true, 'Shift+Tab stays inside, press ' + i);
    }
    assert.equal(await page.evaluate(() => document.querySelector('main').inert === true), true, 'the page behind is inert');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#modal', { state: 'hidden' });
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.textContent), 'Import save', 'focus came back');
    assert.equal(await page.evaluate(() => document.querySelector('main').inert === true), false);
  } finally { await browser.close(); srv.close(); }
});

test('a required dialog does not close on Escape or on the backdrop', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const { page, ctx } = await open(browser, srv);
    const other = await ctx.newPage();
    await other.goto(page.url());
    await other.waitForTimeout(300);
    await other.evaluate(() => localStorage.removeItem('thedarkrealm.save.v2'));
    await page.waitForSelector('#modal:not([hidden])');
    assert.match(await page.textContent('#modal-title'), /erased in another window/);
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#modal').isVisible(), true);
  } finally { await browser.close(); srv.close(); }
});

test('arrow keys move between tabs, and only the selected tab is in the tab order', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const { page } = await open(browser, srv);
    await page.locator('#tabs button', { hasText: 'Realm' }).click();
    await page.locator('#tabs button.active').focus();
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('#tabs button')].filter((b) => b.tabIndex === 0).length), 1);
    await page.keyboard.press('ArrowRight');
    assert.match(await page.locator('#tabs button.active').textContent(), /Host/);
    await page.keyboard.press('End');
    assert.match(await page.locator('#tabs button.active').textContent(), /Ledger/);
    await page.keyboard.press('Home');
    assert.match(await page.locator('#tabs button.active').textContent(), /Realm/);
    // Buy amounts are a radio group.
    await page.locator('#tabs button', { hasText: 'Realm' }).click();
    const first = page.locator('.page:not([hidden]) [role=radio]').first();
    assert.equal(await first.getAttribute('aria-checked'), 'true');
    await first.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.page:not([hidden]) [role=radio][aria-checked=true]').textContent(), '×10');
  } finally { await browser.close(); srv.close(); }
});

test('shortcut keys switch destination and are ignored while typing or when turned off', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const { page } = await open(browser, srv);
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('h');
    assert.match(await page.locator('#tabs button.active').textContent(), /Host/);
    await page.keyboard.press('l');
    assert.match(await page.locator('#tabs button.active').textContent(), /Ledger/);
    await openKeeping(page);
    await page.getByRole('button', { name: 'Import save' }).click();
    await page.locator('#io').focus();
    await page.keyboard.type('hrd');
    assert.equal(await page.inputValue('#io'), 'hrd', 'typing in a text field is left alone');
    await page.keyboard.press('Escape');
    await page.getByLabel('Keyboard shortcuts').uncheck();
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('r');
    assert.match(await page.locator('#tabs button.active').textContent(), /Ledger/, 'shortcuts off');
  } finally { await browser.close(); srv.close(); }
});

test('with reduced motion requested, a new realm starts with motion off and nothing animates', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const { page, problems } = await open(browser, srv, { save: false, reducedMotion: 'reduce' });
    await page.waitForTimeout(1000);
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    await openKeeping(page);
    assert.equal(await page.getByLabel('Drifting motes and motion').isChecked(), false);
    assert.equal(JSON.stringify(problems), '[]');
  } finally { await browser.close(); srv.close(); }
});

test('a Snuff button stands in for the moving lantern, and the arrival is announced once', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const f = engine();
    f.e.S.totalGloom = 100; f.e.S.runGloom = 100; f.e.S.gloom = 100; f.e.S.played = 100;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: f.e.KEY, t: f.e.exportText() });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForSelector('#snuff:not([hidden])', { timeout: 25000 });
    assert.equal(await page.textContent('#live'), 'A lantern is passing.');
    await page.locator('#snuff').click();
    await page.locator('#snuff').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#lantern').isHidden(), true);
  } finally { await browser.close(); srv.close(); }
});
