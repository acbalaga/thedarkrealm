'use strict';
/* Destinations, the bottom bar and the well strip at four screen sizes. Run with `npm run e2e`.
   Screenshots of every destination go to the OS temp folder. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { serve } = require('./server');
const { engine } = require('../helpers');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';
const SHOTS = path.join(os.tmpdir(), 'tdr-nav-shots');

function seedSave() {
  const f = engine();
  const S = f.e.S;
  S.totalGloom = 5e7; S.runGloom = 5e7; S.gloom = 3e6; S.played = 4e4; S.den = { gleaner: 12, scribe: 6, weaver: 2 };
  S.echoesTotal = 200; S.echoes = 90; S.bestShaft = 12; S.shaftTop = 13; S.shaft = 13;
  S.unlocked.shafts = true; S.unlocked.rites = true; S.unlocked.unlight = true;
  return { key: f.e.KEY, text: f.e.exportText() };
}

/* A small realm: a little Gloom and nothing bound, so a few gathers visibly change the number. */
function poorSave() {
  const f = engine();
  f.e.S.totalGloom = 100; f.e.S.runGloom = 100; f.e.S.gloom = 100; f.e.S.played = 100;
  return { key: f.e.KEY, text: f.e.exportText() };
}

async function boot(browser, srv, viewport, poor) {
  const seed = poor ? poorSave() : seedSave();
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: seed.key, t: seed.text });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('http://127.0.0.1:' + srv.address().port + '/');
  await page.waitForTimeout(600);
  const dismiss = await page.$('#modal:not([hidden]) #modal-btns button');
  if (dismiss) await dismiss.click();
  return { page, problems };
}

const SIZES = [['390x844', 390, 844], ['360x640', 360, 640], ['768x1024', 768, 1024], ['1280x800', 1280, 800]];

function measure() {
  const de = document.documentElement;
  const bar = document.getElementById('bar'), br = bar.getBoundingClientRect();
  const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const small = [...document.querySelectorAll('button, [role=tab], label.check')].filter(vis).filter((e) => !e.closest('#modal[hidden]'))
    .filter((e) => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height) < 43.5)
    .map((e) => (e.id || e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
  return { sx: de.scrollWidth - de.clientWidth, barDisplay: getComputedStyle(bar).display, barBottom: br.bottom, vh: window.innerHeight,
    small, mainBottom: document.querySelector('main').getBoundingClientRect().bottom, barTop: br.top };
}

for (const [name, w, h] of SIZES) {
  test('destinations at ' + name, { skip }, async () => {
    const srv = await serve();
    const browser = await chromium.launch();
    fs.mkdirSync(SHOTS, { recursive: true });
    try {
      const { page, problems } = await boot(browser, srv, { width: w, height: h });
      const narrow = w <= 860;
      const labels = ['Seat', 'Realm', 'Host', 'Deep', 'Ledger'].filter((l) => narrow || l !== 'Seat');
      for (const label of labels) {
        const nav = narrow ? page.locator('#bar button', { hasText: label }) : page.locator('#tabs button', { hasText: label });
        await nav.click();
        const count = (await page.$$('#subnav:not([hidden]) button')).length || 1;
        for (let i = 0; i < count; i++) {
          const subs = await page.$$('#subnav:not([hidden]) button');
          if (subs.length) await subs[i].click();
          await page.waitForTimeout(150);
          await page.screenshot({ path: path.join(SHOTS, name + '-' + label + '-' + i + '.png') });
          const r = await page.evaluate(measure);
          assert.ok(r.sx <= 0, label + ' page ' + i + ' scrolls sideways by ' + r.sx);
          if (narrow) {
            assert.equal(r.barDisplay, 'grid');
            assert.ok(Math.abs(r.barBottom - r.vh) < 1.5, 'the bar sits at the bottom edge, fully visible');
            assert.ok(r.mainBottom <= r.barTop + 0.5, 'main ends where the bar begins, so nothing hides under it');
            assert.equal(JSON.stringify(r.small), '[]', 'targets under 44 px on ' + label + ' page ' + i);
          } else assert.equal(r.barDisplay, 'none');
        }
      }
      assert.equal(JSON.stringify(problems), '[]');
    } finally { await browser.close(); srv.close(); }
  });
}

test('on a phone the first Bind button and a gather control are on screen together', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const { page } = await boot(browser, srv, { width: 390, height: 844 }, true);
    await page.locator('#bar button', { hasText: 'Realm' }).click();
    const strip = page.locator('#strip-well');
    assert.equal(await strip.isVisible(), true);
    const bind = page.locator('.btn.buy').first();
    const sb = await strip.boundingBox(), bb = await bind.boundingBox();
    assert.ok(sb.y >= 0 && sb.y + sb.height <= 844 && bb.y >= 0 && bb.y + bb.height <= 844, 'both in view');
    const before = await page.textContent('#r-gloom');
    await strip.click();
    await strip.click();
    await strip.click();
    assert.notEqual(await page.textContent('#r-gloom'), before, 'gathering from the strip adds Gloom');
    assert.equal((await page.locator('#strip-floaters .floater').count()) > 0, true, 'and a small floater rises');
    await page.locator('#strip-whisper').click();
    assert.equal(await page.locator('#scene').isVisible(), true);
    assert.equal(await page.locator('#panel').isVisible(), false);
  } finally { await browser.close(); srv.close(); }
});

test('resizing from desktop to phone and back keeps the destination and page', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const { page } = await boot(browser, srv, { width: 1280, height: 800 });
    await page.locator('#tabs button', { hasText: 'Ledger' }).click();
    await page.locator('#subnav button', { hasText: 'Codex' }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    assert.match(await page.locator('#bar button.active').textContent(), /Ledger/);
    assert.equal(await page.locator('#subnav button.on').textContent(), 'Codex');
    await page.locator('#bar button', { hasText: 'Host' }).click();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#tabs button.active').textContent(), 'Host');
    await page.locator('#bar').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#scene').isVisible(), true, 'the Seat is the left column on a wide screen');
  } finally { await browser.close(); srv.close(); }
});
