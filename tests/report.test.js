'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./helpers');

function running() {
  const f = engine();
  f.e.S.den = { gleaner: 10 };
  f.e.recalc();
  return f;
}
function leave(f, absentSec, monoSec) {
  f.clock.wall += absentSec * 1000 + (monoSec || 1) * 1000;
  f.clock.mono += (monoSec || 1) * 1000;
  return f.e.tick();
}

test('an absence of 4 minutes is credited with one Whisper and no report', () => {
  const f = running();
  const r = leave(f, 240);
  assert.equal(r.away, null);
  assert.equal(f.said.filter((m) => /^The realm kept working\. 4m 0s\.$/.test(m)).length, 1);
});

test('an absence of 6 minutes produces a report', () => {
  const f = running();
  const r = leave(f, 360);
  assert.notEqual(r.away, null);
  assert.equal(r.away.sec, 360);
  assert.equal(r.away.capped, false);
  assert.equal(f.said.some((m) => /The realm kept working/.test(m)), false);
});

test('the throttled-tab path makes no report and leaves a lantern boon running down, not cleared', () => {
  const f = running();
  f.e.S.buffs.hush = 80; f.e.S.buffs.teeth = 5;
  f.clock.mono += 100 * 1000; f.clock.wall += 100 * 1000;       // the page ran 100 s slowly: no wall gap
  const r = f.e.tick();
  assert.equal(r.away, null);
  assert.equal(f.e.S.buffs.hush, 0, '80 s boon has run out over 100 s');
  const g = running();
  g.e.S.buffs.hush = 80;
  g.clock.mono += 91 * 1000; g.clock.wall += 91 * 1000;
  g.e.tick();
  assert.ok(g.e.S.buffs.hush === 0);
  const h = running();
  h.e.S.buffs.teeth = 200;
  h.e.S.buffs.hush = 0;
  h.clock.mono += 100 * 1000; h.clock.wall += 100 * 1000;
  h.e.tick();
  assert.ok(h.e.S.buffs.teeth > 0, 'a boon that outlasts the throttle is kept');
});

test('a true absence clears lantern boons', () => {
  const f = running();
  f.e.S.buffs.hush = 80;
  leave(f, 3600);
  assert.equal(f.e.S.buffs.hush, 0);
});

test('two away credits merge: totals and durations add', () => {
  const f = running();
  const a = leave(f, 400).away;
  const b = leave(f, 500).away;
  const m = f.e.mergeAway(a, b);
  assert.equal(m.sec, a.sec + b.sec);
  assert.equal(m.credited, a.credited + b.credited);
  assert.ok(Math.abs(m.gloom - (a.gloom + b.gloom)) < 1e-6);
  assert.equal(m.echoes, a.echoes + b.echoes);
});

test('the report says when the cap cut an absence short, and when a Lampwarden held', () => {
  const f = running();
  const r = leave(f, 11 * 3600).away;
  assert.equal(r.capped, true);
  assert.equal(r.credited, 8 * 3600);
  const g = running();
  g.e.S.den = { gleaner: 1 };
  g.e.S.unlocked.shafts = true; g.e.S.shaftTop = 10; g.e.S.shaft = 10; g.e.S.bestShaft = 9; g.e.S.shaftHp = g.e.shaftMaxHp(10);
  g.e.recalc();
  const rr = leave(g, 3600).away;
  assert.ok(rr.held, 'the Host could not beat Lampwarden Orrin Vale');
  assert.equal(rr.held.n, 10);
  assert.equal(rr.held.name, 'Lampwarden Orrin Vale');
});

test('the report is plain data', () => {
  const f = running();
  const r = leave(f, 3600).away;
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(r))), JSON.stringify(r));
});

test('waiting lines appear only when their condition holds', () => {
  const f = running();
  f.e.S.gloom = 0;
  assert.equal(f.e.waiting().length, 0);
  f.e.S.gloom = 1e5; f.e.S.runGloom = 1e5; f.e.S.totalGloom = 1e5;
  const w = f.e.waiting();
  assert.equal(w[0].id, 'working');
  assert.match(w[0].text, /workings? can be completed\.$/);
  assert.equal(JSON.stringify(w[0].go), JSON.stringify({ dest: 'realm', page: 'work' }));
  f.e.S.unlocked.unlight = true; f.e.S.runGloom = 2e9; f.e.S.totalGloom = 2e9; f.e.S.gloom = 0;
  const u = f.e.waiting().find((x) => x.id === 'unlight');
  assert.equal(JSON.stringify(u.go), JSON.stringify({ dest: 'deep', page: 'unl' }));
});

test('the return time is now plus the cap, 24 hours with the perk', () => {
  const f = running();
  assert.equal(f.e.returnAt(1000), 1000 + 8 * 3600000);
  f.e.S.perks.unsleeping = 1;
  assert.equal(f.e.returnAt(1000), 1000 + 24 * 3600000);
});
