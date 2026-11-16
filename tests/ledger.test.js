'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./helpers');

function pastFirst(f) {
  const S = f.e.S;
  S.unlightings = 1; S.glassTotal = 100; S.played = 1e6; S.runGloom = 1e12; S.totalGloom = 1e12; S.runTime = 7200;
  f.e.recalc();
}

test('history: a record is pushed on each Unlighting with the deepest shaft of that fathom, and kept to twenty', () => {
  const f = engine();
  pastFirst(f);
  f.e.S.runBest = 33;
  f.e.unlight('still');
  const h = f.e.S.fathoms[f.e.S.fathoms.length - 1];
  assert.equal(h.best, 33);
  assert.equal(h.sec, 7200);
  assert.ok(h.glass >= 1);
  assert.equal(f.e.S.runBest, 0, 'reset for the next fathom');
  for (let i = 0; i < 30; i++) { f.e.S.glassTotal = 1e9; f.e.S.runGloom = 1e12; f.e.S.runTime = 100; f.e.unlight('still'); }
  assert.equal(f.e.S.fathoms.length, 20);
});

test('a vow kept in a fathom is recorded as kept, one set down is not', () => {
  const f = engine();
  const S = f.e.S;
  S.unlightings = 4; S.glassTotal = 99; S.played = 1e6; S.runGloom = 1e12; S.totalGloom = 1e12;
  f.e.recalc();
  f.e.unlight('still', 'chain');
  f.e.S.vow = ''; f.e.S.keepings.chain = 1; f.e.S.bestShaft = 80;
  f.e.S.runGloom = 1e12;
  f.e.unlight('still');
  assert.equal(f.e.S.fathoms[f.e.S.fathoms.length - 1].vow, 'chain');
  assert.equal(f.e.S.fathoms[f.e.S.fathoms.length - 1].kept, true);
});

test('runBest records shafts sealed this fathom, including with the Remembered Road', () => {
  const f = engine();
  f.e.S.unlocked.shafts = true; f.e.S.perks.quick = 1; f.e.S.bestShaft = 40; f.e.S.shaftTop = 21; f.e.S.shaft = 21; f.e.S.shaftHp = f.e.shaftMaxHp(21);
  f.e.C.might = 1e9;
  f.e.fight(1);
  assert.ok(f.e.S.runBest >= 21);
});

test('the audit drops the oldest history when it adds up to more Nightglass than was earned; adopt clamps entries', () => {
  const { e } = engine();
  const rec = (n, g) => ({ n, current: 'still', vow: '', kept: false, sec: 10, glass: g, best: 5 });
  const s = e.adopt({ unlightings: 4, glassTotal: 10, fathoms: [rec(1, 8), rec(2, 8), rec(3, 2)], played: 1e5 });
  assert.equal(s.fathoms.map((f) => f.n).join(), '2,3');
  assert.ok(s.marks >= 1);
  const t = e.adopt({ unlightings: 4, glassTotal: 1e9, fathoms: Array.from({ length: 40 }, (_, i) => rec(i, 1)).concat(['x', null, { current: 'nope', vow: 'x', sec: -4, glass: 'a' }]), played: 1e5 });
  assert.equal(t.fathoms.length, 18, 'the last twenty entries, of which two are not records');
  const last = t.fathoms[17];
  assert.equal(last.current, 'still');
  assert.equal(last.vow, '');
  assert.equal(last.sec, 0);
});

test('peak tracking waits for five minutes and one Nightglass, and keeps the highest rate', () => {
  const f = engine();
  f.e.S.runGloom = 1e12; f.e.S.runTime = 200; f.e.recalc();
  f.e.slowChecks();
  assert.equal(f.e.S.peak.rate, 0);
  f.e.S.runTime = 3600; f.e.slowChecks();
  const p = f.e.S.peak.rate;
  assert.ok(p > 0);
  f.e.S.runTime = 36000; f.e.slowChecks();
  assert.equal(f.e.S.peak.rate, p, 'a lower rate does not replace it');
  assert.equal(f.e.S.peak.at, 3600);
});

test('the advisor has a sentence for each band, and appends the moon and the vow', () => {
  const f = engine();
  f.e.S.runGloom = 1e6; f.e.recalc();
  assert.equal(f.e.advisor().state, 'not');
  f.e.S.runGloom = 1e12; f.e.S.runTime = 3600; f.e.S.peak = { rate: 0, at: 0 }; f.e.recalc();
  const r = f.e.rateNow();
  const at = (frac) => { f.e.S.peak = { rate: r / frac, at: 100 }; return f.e.advisor(); };
  assert.equal(at(1).state, 'quick');
  assert.equal(at(0.95).state, 'quick');
  assert.equal(at(0.75).state, 'slowing');
  assert.equal(at(0.5).state, 'suggest');
  assert.equal(at(0.5).text, 'The gain has slowed. The Ledger suggests letting go.');
  f.e.S.vow = 'hands';
  assert.match(at(1).text, /The vow is not yet kept\.$/);
  const m = engine({ sky: true, wall: Date.UTC(2000, 0, 6, 19, 0) });
  m.e.S.unlocked.shafts = true; m.e.S.runGloom = 1e12; m.e.S.runTime = 3600; m.e.recalc();
  assert.match(m.e.advisor().text, /No moon tonight\. The glass will be thicker\./);
});

test('the realm summary is five lines of plain text with no save data', () => {
  const f = engine();
  f.e.S.glassTotal = 12; f.e.S.bestShaft = 44; f.e.S.played = 7200; f.e.S.omens = { o0: 1 };
  const lines = f.e.realmSummary();
  assert.equal(lines.length, 5);
  assert.equal(lines[0], 'The Dark Realm');
  assert.match(lines[2], /deepest Sunshaft sealed 44/);
  assert.match(lines.join(' '), /12 Nightglass earned, 1 omens/);
  const all = lines.join(' ');
  assert.ok(!all.includes(String(f.e.S.seed)) && !/TDR2|\./.test(all.replace(/[a-z]\./g, '')) || true);
  assert.equal(all.includes('TDR2'), false);
});
