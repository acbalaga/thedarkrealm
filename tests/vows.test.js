'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, load } = require('./helpers');

function fathom(vow, unl) {
  const f = engine();
  const S = f.e.S;
  S.unlightings = unl || 4; S.glassTotal = 60; S.glass = 0; S.played = 1e6; S.bestShaft = 80;
  S.runGloom = 1e12; S.totalGloom = 1e12; S.gloom = 5e11; S.unlocked.shafts = true; S.unlocked.rites = true;
  f.e.recalc();
  if (vow) { f.e.unlight('still', vow); f.e.S.gloom = 1e11; f.e.S.runGloom = 1e12; f.e.S.totalGloom = 1e12; f.e.S.echoes = 1e6; f.e.S.echoesTotal = 1e6; f.e.S.runEchoes = 1e6; f.e.recalc(); }
  return f;
}

test('vows unlock at three Unlightings and are taken only at an Unlighting', () => {
  const f = engine();
  f.e.S.unlightings = 2; f.e.S.glassTotal = 9; f.e.S.runGloom = 1e12; f.e.S.totalGloom = 1e12; f.e.S.played = 1e6;
  assert.equal(f.e.unlight('still', 'hands'), false, 'not yet unlocked');
  f.e.S.unlightings = 3;
  assert.equal(f.e.unlight('still', 'nonsense'), false);
  assert.equal(f.e.unlight('still', 'hands'), true);
  assert.equal(f.e.S.vow, 'hands');
  assert.equal(f.e.S.vowGoal, 40);
  assert.equal(f.e.S.unlocked.vows || (f.e.slowChecks(), f.e.S.unlocked.vows), true);
});

test('hands: gathering yields nothing, Bound Hands is inert, and nothing else changes', () => {
  const f = fathom('hands');
  f.e.S.perks.bound = 1; f.e.S.den = { gleaner: 10 }; f.e.recalc();
  assert.equal(f.e.C.click, 0);
  assert.equal(f.e.gather(true), 0);
  f.e.recalc();
  assert.ok(Math.abs(f.e.C.gps - f.e.C.denGps) < 1e-9, 'the shadows at the Stillwell do nothing');
  const denGps = f.e.C.denGps;
  f.e.S.vow = ''; f.e.recalc();
  assert.ok(Math.abs(f.e.C.denGps - denGps) < 1e-9, 'denizens are unaffected');
  assert.ok(f.e.C.click > 0 && f.e.C.gps > f.e.C.denGps, 'without the vow the hands and the shadows work');
  f.e.S.vow = 'hands'; f.e.recalc();
  assert.equal(f.e.buyRite('edge', 1), true, 'Rites still work');
});

test('silence: no Rite can be performed, carried Rites still apply, other things work', () => {
  const f = fathom('silence');
  assert.equal(f.e.buyRite('edge', 1), false);
  f.e.S.rites = { edge: 5 }; f.e.recalc();
  assert.ok(f.e.C.might >= 1.2 ** 5 - 1e-9 * 0);
  assert.equal(f.e.buyDenizen('gleaner'), true);
});

test('door: lanterns cannot be snuffed, and they neither break nor build the streak', () => {
  const f = fathom('door');
  f.e.S.streak = 4; f.e.S.bestStreak = 4; f.e.S.lanterns = 4;
  f.e.S.totalGloom = 1e6; f.e.S.lanternIn = 0.1;
  f.e.step(1);
  assert.equal(f.e.lanterns.length, 1);
  assert.equal(f.e.snuffLantern(true), null);
  f.e.step(20);
  assert.equal(f.e.S.streak, 4);
});

test('chain: the Lampwarden timer is 20 seconds, replacing every other source', () => {
  const f = fathom('chain');
  assert.equal(f.e.bossMax(), 20);
  f.e.addSource('long', () => ({ bossTime: 100 })); f.e.recalc();
  assert.equal(f.e.bossMax(), 20);
});

test('few: no more than 50 of any denizen, in every buy mode and for auto-bind', () => {
  const f = fathom('few');
  f.e.S.den = { gleaner: 45 }; f.e.S.opts.buy = 25; f.e.recalc();
  assert.equal(f.e.buyDenizen('gleaner'), true);
  assert.equal(f.e.cnt('gleaner'), 50);
  assert.equal(f.e.buyDenizen('gleaner'), false);
  f.e.S.opts.buy = 'max';
  assert.equal(f.e.maxBuy(f.e.D_ ? null : load().D.DENIZENS[0], 50), 0);
  f.e.S.perks.usher = 1; f.e.S.auto.den = { gleaner: true };
  for (let i = 0; i < 20; i++) f.e.slowChecks();
  assert.equal(f.e.cnt('gleaner'), 50);
  assert.equal(f.e.buyDenizen('scribe'), true, 'other kinds are free');
});

test('unlit: the Nightglass bonus is ignored, and only that', () => {
  const f = fathom('unlit');
  f.e.S.glassTotal = 100; f.e.recalc();
  const withVow = f.e.C.mods.gloom, might = f.e.C.mods.might;
  f.e.S.vow = ''; f.e.recalc();
  assert.ok(Math.abs(f.e.C.mods.gloom / withVow - 6) < 1e-9, '1 + 0.05 x 100 = 6');
  assert.ok(Math.abs(f.e.C.mods.might / might - 6) < 1e-9);
});

test('the goal counts from the fathom, and from the Remembered Road start when that is further', () => {
  const f = fathom('silence');
  assert.equal(f.e.S.vowGoal, 30);
  const g = engine();
  const S = g.e.S;
  S.unlightings = 4; S.glassTotal = 100; S.glass = 0; S.played = 1e6; S.bestShaft = 100; S.perks.quick = 1;
  S.runGloom = 1e12; S.totalGloom = 1e12; g.e.recalc();
  g.e.unlight('still', 'silence');
  assert.equal(g.e.S.shaftTop, 51);
  assert.equal(g.e.S.vowGoal, 71, 'start 51 plus 20, past the 30 of the vow');
});

test('keeping a vow applies its reward at once, permanently, and it survives an Unlighting', () => {
  const f = fathom('chain');
  const before = f.e.bossMax();
  f.e.S.unlocked.shafts = true;
  f.e.S.bestShaft = 70; f.e.S.shaftTop = 60; f.e.S.shaft = 60; f.e.S.shaftHp = f.e.shaftMaxHp(60);
  f.e.S.vowGoal = 60;
  f.e.C.might = 1e12;
  f.e.fight(5);
  assert.equal(f.e.S.vow, '');
  assert.equal(f.e.S.keepings.chain, 1);
  assert.ok(f.said.includes('The vow is kept. Something heavier was waiting at the bottom.'));
  assert.equal(f.e.bossMax(), 55);
  assert.ok(before === 20);
  f.e.S.runGloom = 1e12; f.e.S.played = 1e6; f.e.unlight('still');
  assert.equal(f.e.S.keepings.chain, 1);
  assert.equal(f.e.bossMax(), 55);
});

test('setting the vow down, and letting go mid-vow, grant nothing', () => {
  const f = fathom('hands');
  assert.equal(f.e.setDownVow(), true);
  assert.equal(f.e.S.vow, '');
  assert.equal(JSON.stringify(f.e.S.keepings), '{}');
  assert.ok(f.said.includes('The vow is set down. Nothing is owed.'));
  const g = fathom('silence');
  g.e.S.runGloom = 1e12; g.e.S.played = 1e6;
  g.e.unlight('still');
  assert.equal(g.e.S.vow, '');
  assert.equal(JSON.stringify(g.e.S.keepings), '{}');
});

test('the audit removes impossible keepings', () => {
  const { e } = engine();
  const s = e.adopt({ unlightings: 3, keepings: { hands: 1 }, bestShaft: 100, played: 1e6, glassTotal: 9 });
  assert.equal(JSON.stringify(s.keepings), '{}', 'three Unlightings unlock vows but cannot have kept one');
  const t = e.adopt({ unlightings: 5, keepings: { hands: 1, silence: 1, door: 1 }, bestShaft: 100, played: 1e6, glassTotal: 9 });
  assert.equal(Object.keys(t.keepings).length, 2, 'no more than Unlightings minus three');
  const u = e.adopt({ unlightings: 9, keepings: { unlit: 1 }, bestShaft: 20, played: 1e6, glassTotal: 9 });
  assert.equal(JSON.stringify(u.keepings), '{}', 'its goal shaft was never sealed');
  assert.ok(u.marks >= 1);
  assert.equal(e.adopt({ vow: 'hands', unlightings: 2 }).vow, '');
});

test('the six Keepings stay inside the budget: Gloom and Might are untouched, the largest factor is x2 on one hand-gathering channel', () => {
  const f = engine();
  f.e.S.unlightings = 10; f.e.S.keepings = { hands: 1, silence: 1, door: 1, chain: 1, few: 1, unlit: 1 };
  f.e.S.bestShaft = 100; f.e.recalc();
  const pane = Math.pow(1.03, f.e.paneCount());          // each Keeping also lights a light of the Pane
  assert.ok(Math.abs(f.e.C.mods.gloom / pane - 1) < 1e-9);
  assert.ok(Math.abs(f.e.C.mods.might / pane - 1) < 1e-9);
  assert.ok(Math.abs(f.e.C.mods.glass - 1.1) < 1e-9);
  assert.ok(Math.abs(f.e.C.mods.cost - 0.95) < 1e-9);
  assert.ok(Math.abs(f.e.C.mods.riteCost - 0.9) < 1e-9);
  assert.equal(f.e.C.mods.hand, 2);
});

test('both omens follow the count of keepings', () => {
  const f = engine();
  const k = (n) => f.e.OMENS.find((o) => o.name === n);
  assert.equal(k('Kept').cond(), false);
  f.e.S.keepings = { hands: 1 };
  assert.equal(k('Kept').cond(), true);
  assert.equal(k('Six Things Set Aside').cond(), false);
  f.e.S.keepings = { hands: 1, silence: 1, door: 1, chain: 1, few: 1, unlit: 1 };
  assert.equal(k('Six Things Set Aside').cond(), true);
});
