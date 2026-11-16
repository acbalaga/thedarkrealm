'use strict';
/* The throne room picture: reference screenshots, a frame budget under CPU throttling, and no animation loop with
   motion off. Screenshots are written to docs/design/scene/ only when TDR_SHOTS=1. Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { serve } = require('./server');
const { engine } = require('../helpers');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const skip = !chromium && 'playwright is not installed';
const OUT = path.join(__dirname, '..', '..', 'docs', 'design', 'scene');
const ALL = { gleaner: 100, scribe: 100, weaver: 100, warden: 100, cantor: 100, forge: 100, tide: 100, choir: 100, orchard: 100, sleeper: 100 };

const STATES = {
  'fathom1-empty': (S) => { S.den = {}; },
  'fathom1-five-kinds': (S) => { S.den = { gleaner: 30, scribe: 8, weaver: 3, warden: 1, cantor: 1 }; },
  'fathom8-all-ten': (S) => { S.unlightings = 7; S.glassTotal = 99; S.den = Object.assign({}, ALL); },
  'lampwarden-at-the-frontier': (S) => { S.den = { gleaner: 30, scribe: 8, weaver: 3 }; S.unlocked.shafts = true; S.shaftTop = 20; S.shaft = 20; S.shaftHp = 1e30; S.autoAdvance = true; },
  'after-the-ending': (S) => { S.unlightings = 14; S.glassTotal = 999; S.den = Object.assign({}, ALL); S.ended = true; S.bestShaft = 150; }
};

function saveFor(name, motion) {
  const f = engine();
  const S = f.e.S;
  S.played = 1e6; S.totalGloom = 1e15; S.runGloom = 1e15; S.gloom = 1e12; S.seen = Date.now();
  S.codex = { waking: 1, gloom: 1, seat: 1, ledger: 1 };
  STATES[name](S);
  if (S.unlocked.shafts && S.shaft === 20) S.shaftHp = f.e.shaftMaxHp(20);
  S.opts.motion = motion;
  return { key: f.e.KEY, text: f.e.exportText() };
}

async function page(browser, srv, sv, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1280, height: 800 } });
  await ctx.addInitScript((a) => { try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {} }, { k: sv.key, t: sv.text });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:' + srv.address().port + '/');
  await p.waitForTimeout(900);
  const d = await p.$('#modal:not([hidden]) #modal-btns button');
  if (d) await d.click();
  return { p, ctx };
}

for (const name of Object.keys(STATES)) {
  test('reference scene: ' + name, { skip }, async () => {
    const srv = await serve();
    const browser = await chromium.launch();
    try {
      const { p } = await page(browser, srv, saveFor(name, false));
      await p.waitForTimeout(300);
      const lit = await p.locator('#motes').evaluate((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
      if (name === 'fathom1-empty') assert.ok(lit >= 0); else assert.ok(lit > 500, 'the scene drew something: ' + lit);
      if (process.env.TDR_SHOTS === '1') {
        fs.mkdirSync(OUT, { recursive: true });
        await p.locator('#scene-box').screenshot({ path: path.join(OUT, name + '.png') });
      }
    } finally { await browser.close(); srv.close(); }
  });
}

test('with every layer on and the CPU slowed four times, a frame costs under 4 ms on average', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const sv = saveFor('after-the-ending', true);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript((a) => {
      try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {}
      window.__frames = [];
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => raf((t) => { const s = performance.now(); cb(t); window.__frames.push(performance.now() - s); });
    }, { k: sv.key, t: sv.text });
    const p = await ctx.newPage();
    const client = await ctx.newCDPSession(p);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.goto('http://127.0.0.1:' + srv.address().port + '/');
    await p.waitForTimeout(6000);
    const frames = await p.evaluate(() => window.__frames);
    assert.ok(frames.length > 20, 'frames were drawn: ' + frames.length);
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    assert.ok(avg < 4, 'average draw ' + avg.toFixed(2) + ' ms over ' + frames.length + ' frames');
  } finally { await browser.close(); srv.close(); }
});

test('with motion off one static frame is drawn and the animation loop is not scheduled again', { skip }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const sv = saveFor('fathom1-five-kinds', false);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript((a) => {
      try { if (!localStorage.getItem(a.k)) localStorage.setItem(a.k, a.t); } catch (e) {}
      window.__raf = 0;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => { window.__raf++; return raf(cb); };
    }, { k: sv.key, t: sv.text });
    const p = await ctx.newPage();
    await p.goto('http://127.0.0.1:' + srv.address().port + '/');
    await p.waitForTimeout(800);
    const a = await p.evaluate(() => window.__raf);
    await p.waitForTimeout(1500);
    assert.equal(await p.evaluate(() => window.__raf), a, 'no frames are scheduled');
    const lit = await p.locator('#motes').evaluate((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
    assert.ok(lit > 200, 'but the static frame is there');
  } finally { await browser.close(); srv.close(); }
});
