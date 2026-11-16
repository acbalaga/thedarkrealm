'use strict';
/* The feedback layer in a real browser: toasts and the live region, the next objective, buy-control
   distance, the Why popover and the grouped Omens page. Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { serve } = require('./server');
const { engine } = require('../helpers');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';

function save(mutate) {
  const f = engine();
  mutate(f.e.S);
  return { key: f.e.KEY, text: f.e.exportText() };
}
const rich = (S) => {
  S.totalGloom = 5e7; S.runGloom = 5e7; S.gloom = 3e6; S.played = 4e4; S.den = { gleaner: 12, scribe: 6, weaver: 2 };
  S.echoesTotal = 200; S.echoes = 90; S.runEchoes = 200; S.bestShaft = 12; S.shaftTop = 13; S.shaft = 13; S.glassTotal = 0;
  S.unlocked.shafts = true; S.unlocked.rites = true; S.unlocked.unlight = true;
  S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1, lantern: 1, concord: 1, echo: 1 };
  S.omens = { o0: 1, o1: 1, o2: 1 };
};

async function open(browser, srv, mutate, viewport) {
  const sv = save(mutate);
  const ctx = await browser.newContext({ viewport: viewport || { width: 1280, height: 800 } });
  await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: sv.key, t: sv.text });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('http://127.0.0.1:' + srv.address().port + '/');
  await page.waitForTimeout(500);
  const dismiss = await page.$('#modal:not([hidden]) #modal-btns button');
  if (dismiss) await dismiss.click();
  return { page, problems };
}

async function run(fn) {
  const srv = await serve();
  const browser = await chromium.launch();
  try { await fn(browser, srv); } finally { await browser.close(); srv.close(); }
}

test('earning the first Omen shows a toast, announces it once, and writes the Whisper', { skip }, () => run(async (browser, srv) => {
  const { page, problems } = await open(browser, srv, (S) => {
    S.totalGloom = 995; S.runGloom = 995; S.gloom = 995; S.played = 600;
    S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1 };
  });
  // The click is worth more than the 5 Gloom left to the first Omen at 1,000.
  for (let i = 0; i < 6; i++) await page.click('#well');
  await page.waitForSelector('#toasts .toast-title');
  assert.equal(await page.textContent('#toasts .toast-title'), 'Omen');
  assert.match(await page.textContent('#toasts .toast-text'), /A Puddle of Night/);
  assert.match(await page.textContent('#live'), /^Omen\. A Puddle of Night/);
  assert.match(await page.textContent('#log'), /Omen: A Puddle of Night\./);
  assert.equal(await page.getAttribute('#log', 'aria-live'), null, 'routine Whispers are not announced');
  // Tapping the body goes to the source.
  await page.locator('#toasts .toast-body').click();
  assert.match(await page.locator('#subnav button.on').textContent(), /Omens/);
  assert.equal(JSON.stringify(problems), '[]');
}));

test('a toast goes away by itself, and can be dismissed', { skip }, () => run(async (browser, srv) => {
  const { page } = await open(browser, srv, (S) => { S.totalGloom = 995; S.runGloom = 995; S.gloom = 995; S.played = 600; S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1 }; });
  for (let i = 0; i < 6; i++) await page.click('#well');
  await page.waitForSelector('#toasts .toast');
  await page.locator('#toasts .toast-x').click();
  await page.waitForSelector('#toasts .toast', { state: 'detached', timeout: 2000 });
}));

test('the Seat names a next objective once the player has found the well', { skip }, () => run(async (browser, srv) => {
  const { page } = await open(browser, srv, (S) => { S.totalGloom = 5; S.runGloom = 5; S.gloom = 5; S.played = 100; });
  assert.equal(await page.locator('#objective').isHidden(), true);
  assert.equal(await page.locator('#well-hint').isVisible(), true);
  for (let i = 0; i < 40 && await page.locator('#objective').isHidden(); i++) { await page.click('#well'); await page.waitForTimeout(110); }   // the well accepts 14 a second
  await page.waitForSelector('#objective:not([hidden])');
  assert.equal(await page.locator('#well-hint').isHidden(), true);
  await page.waitForFunction(() => document.querySelector('#objective').textContent.length > 0);
  assert.match(await page.textContent('#objective'), /bind a Wisp-Gleaner/);
  await page.locator('#objective').click();
  assert.match(await page.locator('#tabs button.active').textContent(), /Realm/);
}));

test('buy controls show distance: an underline, a time to afford, and Bind for Max with nothing affordable', { skip }, () => run(async (browser, srv) => {
  const { page } = await open(browser, srv, (S) => { rich(S); S.den = { gleaner: 60, scribe: 40, weaver: 25, warden: 10 }; S.gloom = 3e6; S.seen = Date.now(); });
  await page.locator('#tabs button', { hasText: 'Realm' }).click();
  await page.waitForTimeout(700);
  const forge = page.locator('.row', { hasText: 'Shade-Forge' });
  assert.match(await forge.locator('.eta').textContent(), /^in /);
  const w = await forge.locator('.prog').evaluate((n) => parseFloat(n.style.width));
  assert.ok(w > 0 && w < 100, 'a partial underline: ' + w);
  await page.getByRole('radio', { name: 'Max' }).click();
  await page.waitForTimeout(700);
  assert.equal(await forge.locator('.buy-label').textContent(), 'Bind', 'nothing affordable in Max mode reads Bind');
  // An affordable row still reads its count.
  assert.match(await page.locator('.row', { hasText: 'Wisp-Gleaner' }).locator('.buy-label').textContent(), /^Bind ×\d+/);
}));

test('the Why popover lists the sources of Gloom per second and closes on Escape', { skip }, () => run(async (browser, srv) => {
  const { page } = await open(browser, srv, (S) => { rich(S); S.glassTotal = 4; S.unlightings = 1; S.perks = { absence: 1 }; });
  await page.locator('#why-gloom').click();
  await page.waitForSelector('#popover:not([hidden])');
  const text = await page.textContent('#popover');
  assert.match(text, /Nightglass ×/);
  assert.match(text, /Omens ×/);
  assert.match(text, /Together ×/);
  await page.keyboard.press('Escape');
  await page.waitForSelector('#popover', { state: 'hidden' });
  // And the same for Might on the Sunshafts page.
  await page.locator('#tabs button', { hasText: 'Host' }).click();
  await page.getByRole('button', { name: 'Why this Might' }).click();
  assert.match(await page.textContent('#popover'), /Denizens, the base/);
}));

test('the Omens page groups omens by set with a count and a progress bar', { skip }, () => run(async (browser, srv) => {
  const { page } = await open(browser, srv, rich);
  await page.locator('#tabs button', { hasText: 'Ledger' }).click();
  await page.locator('#subnav button', { hasText: 'Omens' }).click();
  const heads = await page.locator('.page:not([hidden]) .sub-head').allTextContents();
  assert.ok(heads.includes('Gloom gathered · 2 of 8'), JSON.stringify(heads));
  assert.ok(heads.some((h) => /^Sunshafts sealed · \d of 7$/.test(h)));
  assert.equal(await page.locator('.page:not([hidden]) .omen-bar').first().getAttribute('role'), 'progressbar');
  assert.equal(await page.locator('.page:not([hidden]) .omen.got .omen-mark').first().textContent(), '✓ ');
}));
