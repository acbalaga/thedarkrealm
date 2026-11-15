'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, load } = require('./helpers');

function spawn(f) {
  f.e.S.totalGloom = 1000; f.e.S.runGloom = 1000; f.e.S.gloom = 1000;
  f.e.S.lanternIn = 0.1;
  f.e.step(1);
}
function lamps(f) { return f.e.lanterns.slice(); }
function clear(f) { while (f.e.lanterns.length) { f.e.lanterns.pop(); } }

test('kind roll holds at its boundaries, with the Warden fallback', () => {
  const { e } = engine();
  assert.equal(e.lanternKind(0, true), 'stray');
  assert.equal(e.lanternKind(0.799, true), 'stray');
  assert.equal(e.lanternKind(0.8, true), 'votive');
  assert.equal(e.lanternKind(0.939, true), 'votive');
  assert.equal(e.lanternKind(0.94, true), 'warden');
  assert.equal(e.lanternKind(0.999, true), 'warden');
  assert.equal(e.lanternKind(0.94, false), 'stray', 'no Lampwarden at the front, so a Stray');
});

test('only Stray Lanterns appear before ten have been snuffed', () => {
  const f = engine();
  const kinds = new Set();
  for (let i = 0; i < 7; i++) {          // spawns 1 to 7: no Procession yet
    spawn(f);
    kinds.add(f.e.lanterns[0].kind);
    f.e.snuffLantern(true);
  }
  assert.equal(JSON.stringify([...kinds]), '["stray"]');
});

test('every eighth spawn is a Procession of five, one and a half seconds or so apart', () => {
  const f = engine();
  for (let i = 0; i < 7; i++) { spawn(f); f.e.snuffLantern(true); }
  spawn(f);
  const ls = lamps(f);
  assert.equal(ls.length, 5);
  assert.equal(ls.map((l) => l.path).join(), 'ltr,rtl,ltr,rtl,ltr');
  assert.equal(ls.map((l) => l.wait.toFixed(1)).join(), '0.0,1.6,3.2,4.8,6.4');
  ls.forEach((l) => assert.equal(l.total, 8));
  assert.equal(f.e.S.lanternSpawns, 8);
});

test('a Procession is skipped while a dialog is open, and the counter still advances', () => {
  const f = engine();
  f.env.modalOpen = () => true;
  for (let i = 0; i < 7; i++) { spawn(f); f.e.snuffLantern(true); }
  spawn(f);
  assert.equal(f.e.lanterns.length, 1);
  assert.equal(f.e.S.lanternSpawns, 8);
});

test('snuffing all five of a Procession pays the bonus once; each lamp pays 40 percent', () => {
  const f = engine();
  f.e.S.gloom = 0;
  for (let i = 0; i < 7; i++) { spawn(f); f.e.snuffLantern(true); }
  spawn(f);
  f.e.S.buffs.hush = 0;
  for (let i = 0; i < 5; i++) {
    // let the next lamp's turn come
    f.e.lanterns.forEach((l) => { l.wait = 0; });
    const r = f.e.snuffLantern(true);
    assert.ok(r, 'lamp ' + i);
  }
  assert.equal(f.e.S.processions, 1);
  assert.ok(f.e.S.buffs.hush >= 40, 'a full-length Deep Hush');
  assert.equal(f.said.filter((m) => /The whole procession, dark/.test(m)).length, 1);
  assert.equal(f.e.lanterns.length, 0);
});

test('a Procession lamp that drifts past unsnuffed takes the bonus away', () => {
  const f = engine();
  for (let i = 0; i < 7; i++) { spawn(f); f.e.snuffLantern(true); }
  spawn(f);
  f.e.lanterns.forEach((l) => { l.wait = 0; });
  f.e.snuffLantern(true); f.e.snuffLantern(true); f.e.snuffLantern(true); f.e.snuffLantern(true);
  f.e.step(9);                                        // the last lamp expires
  assert.equal(f.e.S.processions, 0);
  assert.equal(f.said.some((m) => /The whole procession/.test(m)), false);
});

test('the streak counts, caps its bonus at 10, resets on an unsnuffed expiry, and survives a hidden tab', () => {
  const f = engine();
  for (let i = 0; i < 3; i++) { spawn(f); f.e.snuffLantern(true); }
  assert.equal(f.e.S.streak, 3);
  assert.equal(f.e.S.bestStreak, 3);
  f.e.S.streak = 15; f.e.S.bestStreak = 15; f.e.S.lanterns = 15;
  spawn(f);
  f.clock.hidden = true;
  f.e.step(1);                                        // withdrawn, not lost
  assert.equal(f.e.lanterns.length, 0);
  assert.equal(f.e.S.streak, 15, 'a hidden-tab withdrawal does not break it');
  f.clock.hidden = false;
  f.e.S.lanternIn = 0.1; f.e.step(1);
  assert.equal(f.e.lanterns.length, 1);
  f.e.step(15);                                       // ignored until it expires
  assert.equal(f.e.S.streak, 0);
  assert.equal(f.e.S.bestStreak, 15, 'the best is kept');
});

test('each step of streak adds 4 percent to a Stray outcome, up to 10 steps', () => {
  function gainAt(streak) {
    const f = engine();
    f.e.S.den = { gleaner: 50 }; f.e.S.unlocked.shafts = false;
    f.e.recalc();
    spawn(f);
    f.e.S.streak = streak; f.e.S.lanterns = streak;
    // force the spill outcome: pick roll 0 -> 'spill'
    f.env.random = () => 0;
    const before = f.e.S.gloom;
    const r = f.e.snuffLantern(true);
    return { r, delta: f.e.S.gloom - before };
  }
  const base = gainAt(0), ten = gainAt(10), many = gainAt(25);
  assert.equal(base.r.kind, 'spill');
  assert.ok(Math.abs(ten.delta / base.delta - 1.4) < 0.02, 'ten steps is +40 percent: ' + ten.delta / base.delta);
  assert.ok(Math.abs(many.delta / base.delta - 1.4) < 0.02, 'and no more');
});

test('a Votive Lantern pays two outcomes and lives 9 seconds', () => {
  const f = engine();
  f.e.S.lanterns = 20; f.e.S.lanternSpawns = 20;
  f.env.random = () => 0.85;
  spawn(f);
  const l = f.e.lanterns[0];
  assert.equal(l.kind, 'votive');
  assert.equal(l.total, 9);
  assert.equal(l.path, 'drop');
  const r = f.e.snuffLantern(true);
  assert.equal(r.outcomes.length, 2);
});

test("a Warden's Lamp takes 20 percent of the Lampwarden's radiance and ten seconds are added, never past the maximum", () => {
  const f = engine();
  f.e.S.den = { gleaner: 1 };
  f.e.S.unlocked.shafts = true; f.e.S.shaftTop = 10; f.e.S.shaft = 10; f.e.S.bestShaft = 9;
  f.e.S.shaftHp = f.e.shaftMaxHp(10); f.e.S.bossTime = 30;
  f.e.S.lanterns = 20; f.e.S.lanternSpawns = 20;
  f.e.recalc();
  f.env.random = () => 0.97;
  spawn(f);
  assert.equal(f.e.lanterns[0].kind, 'warden');
  assert.equal(f.e.lanterns[0].total, 20);
  const max = f.e.shaftMaxHp(10), hp0 = f.e.S.shaftHp, t0 = f.e.S.bossTime;
  f.e.snuffLantern(true);
  assert.ok(Math.abs(f.e.S.shaftHp - (hp0 - 0.2 * max)) < 1e-6);
  assert.ok(Math.abs(f.e.S.bossTime - Math.min(45, t0 + 10)) < 1e-6);
  assert.equal(f.e.S.wardenLamps, 1);
  // Near the maximum the timer stops there.
  f.e.S.bossTime = 40; f.e.S.shaftHp = f.e.shaftMaxHp(10);
  spawn(f); f.e.snuffLantern(true);
  assert.equal(f.e.S.bossTime, 45);
});

test("a Warden's Lamp never takes radiance below zero, and a shaft cleared that way pays out", () => {
  const f = engine();
  f.e.S.unlocked.shafts = true; f.e.S.shaftTop = 10; f.e.S.shaft = 10; f.e.S.bestShaft = 9;
  f.e.S.shaftHp = 0.05 * f.e.shaftMaxHp(10);
  f.e.S.lanterns = 20; f.e.S.lanternSpawns = 20;
  f.env.random = () => 0.97;
  spawn(f);
  const echoes0 = f.e.S.echoesTotal;
  f.e.snuffLantern(true);
  assert.ok(f.e.S.shaftHp >= 0);
  assert.ok(f.e.S.echoesTotal > echoes0, 'the seal paid its Echoes');
  assert.ok(f.e.S.bestShaft >= 10);
});

test('every lantern action needs a trusted caller', () => {
  const f = engine();
  spawn(f);
  assert.equal(f.e.snuffLantern(false), null);
  assert.equal(f.e.snuffLantern('yes'), null);
  assert.equal(f.e.lanterns.length, 1);
});

test('audit repairs impossible lantern counters', () => {
  const { e } = engine();
  const s = e.adopt({ lanterns: 10, bestStreak: 50, streak: 40, processions: 9, wardenLamps: 99, played: 1e6 });
  assert.equal(s.bestStreak, 10);
  assert.equal(s.streak, 10);
  assert.equal(s.processions, 2);
  assert.equal(s.wardenLamps, 10);
  assert.ok(s.marks >= 1);
});

test('the three new omens sit in the lantern set, after every earlier omen', () => {
  const f = engine();
  const names = f.e.OMENS.filter((o) => o.set === 'Stray Lanterns snuffed').map((o) => o.name);
  assert.equal(names.join(), 'Snuffer,Wick-Thief,The Moths\' Revenge,A Line of Small Nights,Unbroken,Borrowed Light');
  const lastTwo = f.e.OMENS.slice(-3).map((o) => o.name).join();
  assert.equal(lastTwo, 'A Line of Small Nights,Unbroken,Borrowed Light');
  assert.equal(f.e.OMENS.find((o) => o.name === 'Unbroken').cond(), false);
  f.e.S.bestStreak = 10;
  assert.equal(f.e.OMENS.find((o) => o.name === 'Unbroken').cond(), true);
});
