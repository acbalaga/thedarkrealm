'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./helpers');

function ready() {
  const f = engine();
  f.e.S.unlocked.rites = true; f.e.S.unlocked.shafts = true;
  f.e.S.den = { gleaner: 20 };
  f.e.recalc();
  return f;
}

test('Litanies are not available until Rites are', () => {
  const f = engine();
  assert.equal(f.e.speakLitany('teeth', true), false);
});

test('speaking needs a trusted caller, and does nothing while cooling', () => {
  const f = ready();
  assert.equal(f.e.speakLitany('teeth', false), false);
  assert.equal(f.e.speakLitany('teeth', true), true);
  assert.equal(f.e.S.lit.teeth.on, 15);
  assert.equal(f.e.S.lit.teeth.cd, 300);
  assert.equal(f.e.speakLitany('teeth', true), false, 'cooling');
  assert.equal(f.e.S.litanyUses, 1);
  assert.equal(f.e.speakLitany('nonsense', true), false);
});

test('Teeth multiplies Might by 3 for exactly fifteen seconds, and stacks with Bared Teeth', () => {
  const f = ready();
  const base = f.e.C.might;
  f.e.speakLitany('teeth', true);
  assert.ok(Math.abs(f.e.C.might - 3 * base) < 1e-9);
  f.e.step(14.9); f.e.recalc();
  assert.ok(Math.abs(f.e.C.might - 3 * base) < 1e-9, 'still on at 14.9 s');
  f.e.step(0.2); f.e.recalc();
  assert.ok(Math.abs(f.e.C.might - base) < 1e-9, 'off after 15 s');
  const g = ready();
  g.e.S.buffs.teeth = 40; g.e.speakLitany('teeth', true); g.e.recalc();
  assert.ok(Math.abs(g.e.C.might - 15 * base) < 1e-6, 'x3 and x5 together');
});

test('a single long step splits at the end of the effect', () => {
  const f = ready();
  f.e.S.unlocked.shafts = true;
  f.e.recalc();
  const echoes0 = f.e.S.echoesTotal;
  const g = ready();
  g.e.speakLitany('teeth', true);
  f.e.step(60);
  g.e.step(60);
  assert.ok(g.e.S.echoesTotal > f.e.S.echoesTotal, 'Teeth for 15 of the 60 seconds paid more');
  const h = ready();
  h.e.speakLitany('teeth', true);
  for (let i = 0; i < 60; i++) h.e.step(1);
  assert.ok(Math.abs(h.e.S.echoesTotal - g.e.S.echoesTotal) / Math.max(1, g.e.S.echoesTotal) < 0.05, 'one long step and sixty short ones agree');
  assert.ok(echoes0 >= 0);
});

/* Puts the Host on Lampwarden Orrin Vale with n Wisp-Gleaners, so its Might is 1 + n and the fight needs
   about 536 / (1 + n) seconds. n = 10 needs 49 s (fails at 45 s), n = 5 needs 89 s. */
function lampwardenFight(f, n) {
  const S = f.e.S;
  S.den = { gleaner: n };
  S.unlocked.shafts = true; S.shaftTop = 10; S.shaft = 10; S.bestShaft = 9; S.autoAdvance = true; S.march = 0;
  S.shaftHp = f.e.shaftMaxHp(10); S.bossTime = 45;
  f.e.recalc();
}

test('without a Litany that fight fails, which is what the next tests rely on', () => {
  const f = ready();
  lampwardenFight(f, 10);
  f.e.step(60);
  assert.equal(f.e.S.regroup, true);
});

test('Held Breath: a Lampwarden that would fail at 45 s is sealed when it is spoken early enough', () => {
  [0, 5, 20, 30].forEach((at) => {
    const f = ready();
    lampwardenFight(f, 10);
    f.e.step(at);
    f.e.speakLitany('breath', true);
    for (let t = at; t < 70 && f.e.S.bestShaft < 10; t++) f.e.step(1);
    assert.ok(f.e.S.bestShaft >= 10, 'sealed when spoken at ' + at + ' s');
  });
});

test('Held Breath does not stop the timer on an ordinary shaft, and one long step handles the boundary', () => {
  const f = ready();
  const S = f.e.S;
  S.shaftTop = 5; S.shaft = 5; S.shaftHp = f.e.shaftMaxHp(5);
  f.e.speakLitany('breath', true);
  f.e.step(1);
  assert.equal(S.bossTime, 45);
  const g = ready();
  lampwardenFight(g, 10);
  g.e.speakLitany('breath', true);
  g.e.step(60);                                       // frozen for 10 s, 39 s more to seal: inside the 45 s
  assert.ok(g.e.S.bestShaft >= 10);
  const h = ready();
  lampwardenFight(h, 5);
  h.e.speakLitany('breath', true);
  h.e.step(60);                                       // frozen 10 s, then 45 s of a fight that needs 89: fails
  assert.equal(h.e.S.regroup, true);
});

test('Undertow pays 90 seconds of Gloom, and the unbuffed rate during Deep Hush', () => {
  const f = ready();
  f.e.recalc();
  const gps = f.e.C.gps, g0 = f.e.S.gloom;
  f.e.speakLitany('undertow', true);
  assert.ok(Math.abs((f.e.S.gloom - g0) - 90 * gps) < 1e-6);
  const h = ready();
  h.e.recalc();
  const plain = h.e.C.gps;
  h.e.S.buffs.hush = 30; h.e.recalc();
  const g1 = h.e.S.gloom;
  h.e.speakLitany('undertow', true);
  assert.ok(Math.abs((h.e.S.gloom - g1) - 90 * plain) < 1e-6, 'the Hush does not inflate it');
});

test('an away credit ends effects and takes the full time off cooldowns, never below zero', () => {
  const f = ready();
  f.e.speakLitany('teeth', true); f.e.speakLitany('breath', true); f.e.speakLitany('undertow', true);
  f.e.away(1000);
  assert.equal(f.e.S.lit.teeth.on, 0);
  assert.equal(f.e.S.lit.breath.on, 0);
  assert.equal(f.e.S.lit.teeth.cd, 0);
  assert.equal(f.e.S.lit.breath.cd, 0);
  assert.equal(f.e.S.lit.undertow.cd, 0);
  const g = ready();
  g.e.speakLitany('teeth', true);
  g.e.away(100);
  assert.equal(g.e.S.lit.teeth.cd, 200);
});

test('a Litany does nothing for Might or the timer during away time', () => {
  const f = ready();
  lampwardenFight(f, 10);
  f.e.speakLitany('breath', true);
  f.e.speakLitany('teeth', true);
  const r = f.e.away(30);
  assert.equal(f.e.S.lit.breath.on, 0);
  assert.ok(r);
});

test('the Rite of the Long Breath shortens cooldowns by 5 percent a level', () => {
  const f = ready();
  f.e.S.rites = { breathing: 2 };
  f.e.recalc();
  f.e.speakLitany('teeth', true);
  assert.ok(Math.abs(f.e.S.lit.teeth.cd - 300 * 0.95 * 0.95) < 1e-9);
});

test('an Unlighting resets Litanies', () => {
  const f = ready();
  f.e.speakLitany('teeth', true);
  f.e.S.played = 1e5; f.e.S.runGloom = 1e10; f.e.S.totalGloom = 1e10;
  assert.equal(f.e.unlight(), true);
  assert.equal(f.e.S.lit.teeth.cd, 0);
  assert.equal(f.e.S.lit.teeth.on, 0);
});

test('the first spoken Litany unlocks its Codex page', () => {
  const f = ready();
  f.e.S.codex = {};
  f.e.speakLitany('teeth', true);
  f.e.slowChecks();
  assert.ok(f.e.S.codex.litanies, 'litanies');
});
