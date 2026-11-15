'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, load } = require('./helpers');

function sea(opts) {
  const f = engine(opts);
  const S = f.e.S;
  S.den = { tide: 1, gleaner: 40 }; S.unlocked.soundings = true; S.played = 1e6;
  S.gloom = 1e12; S.runGloom = 1e12; S.totalGloom = 1e12;
  f.e.recalc();
  return f;
}

test('Soundings unlock with the first Tidewell, with their own Codex page', () => {
  const f = engine();
  f.e.S.den = { tide: 1 };
  f.e.slowChecks();
  assert.equal(f.e.S.unlocked.soundings, true);
  assert.ok(f.e.S.codex.soundings === undefined, 'the page waits for the first return');
});

test('lowering deducts the cost, and refuses when unaffordable, locked, or no slot is free', () => {
  const f = sea();
  const cost = f.e.lowerCost({ cost: 60 });
  const g0 = f.e.S.gloom;
  assert.equal(f.e.lowerLine('shallows', false), false, 'untrusted');
  assert.equal(f.e.lowerLine('shallows', true), true);
  assert.ok(Math.abs(g0 - f.e.S.gloom - cost) < 1e-3);
  assert.equal(f.e.lowerLine('shallows', true), false, 'one line at a time');
  assert.equal(f.e.lowerLine('shelf', true), false);
  const poor = sea();
  poor.e.S.gloom = 0;
  assert.equal(poor.e.lowerLine('shallows', true), false);
  assert.equal(sea().e.lowerLine('trench', true), false, 'the Trench needs a fathom let go');
  assert.equal(sea().e.lowerLine('shelf', true), false, 'the Shelf needs 25 Tidewells');
  const two = sea();
  two.e.S.perks.twolines = 1;
  assert.equal(two.e.lowerLine('shallows', true) && two.e.lowerLine('shallows', true), true);
  assert.equal(two.e.lowerLine('shallows', true), false);
});

test('time on the line falls with step and in full away, past the away cap, and debt is respected', () => {
  const f = sea();
  f.e.lowerLine('trench', true) || (f.e.S.unlightings = 1, f.e.lowerLine('trench', true));
  const left0 = f.e.S.snd.lines[0].left;
  assert.equal(left0, 12 * 3600);
  f.e.step(100);
  assert.equal(f.e.S.snd.lines[0].left, left0 - 100);
  f.e.away(11 * 3600);                                  // more than the 8 hour cap
  assert.ok(Math.abs(f.e.S.snd.lines[0].left - (left0 - 100 - 11 * 3600)) < 1e-6);
  const d = sea();
  d.e.lowerLine('shallows', true);
  d.e.S.debt = 3000;
  d.clock.wall += 4000 * 1000 + 1000; d.clock.mono += 1000;
  d.e.tick();
  assert.ok(d.e.S.snd.lines[0].left > 3600 - 1100 && d.e.S.snd.lines[0].left <= 3600 - 900, 'only the time after the debt counted: ' + d.e.S.snd.lines[0].left);
});

test('a slack line waits, across any length of time and across an Unlighting', () => {
  const f = sea();
  f.e.lowerLine('shallows', true);
  f.e.away(3600 * 5);
  assert.equal(f.e.slackLines(), 1);
  assert.ok(f.e.waiting().some((w) => w.id === 'slack'));
  f.e.S.played = 1e6; f.e.S.runGloom = 1e12;
  f.e.unlight();
  assert.equal(f.e.S.snd.lines.length, 1, 'the Sea is under every fathom');
  f.e.step(1e6);
  assert.equal(f.e.slackLines(), 1);
});

test('drawing is deterministic for a seed and the count, and cannot be rerolled by reloading', () => {
  const a = sea(), b = sea();
  b.e.S.seed = a.e.S.seed;
  [a, b].forEach((f) => { f.e.lowerLine('shallows', true); f.e.step(3601); });
  const ra = a.e.drawUp(0, true), rb = b.e.drawUp(0, true);
  assert.equal(JSON.stringify(ra), JSON.stringify(rb));
  const c = sea();
  c.e.lowerLine('shallows', true); c.e.step(3601);
  const text = c.e.exportText();
  const d = engine(); d.e.importText(text);
  const r1 = JSON.stringify(c.e.drawUp(0, true)), r2 = JSON.stringify(d.e.drawUp(0, true));
  assert.equal(r1, r2, 'the same result after a reload');
});

test('bad-luck protection makes a relic certain after five dry draws', () => {
  const f = sea();
  f.e.S.snd.dry.shallows = 5;
  f.e.lowerLine('shallows', true); f.e.step(3601);
  const before = f.e.relicCount();
  f.e.drawUp(0, true);
  assert.equal(f.e.relicCount(), before + 1);
  assert.equal(f.e.S.snd.dry.shallows, 0);
});

test('a duplicate pays Echoes and never adds a second copy', () => {
  const f = sea();
  const { D } = load();
  ['table', 'lamp'].forEach((s) => D.RELICS.filter((r) => r.set === s).slice(0, 3).forEach((r) => { f.e.S.relics[r.id] = 1; }));
  f.e.S.snd.dry.shallows = 5;
  const have = f.e.relicCount(), e0 = f.e.S.echoesTotal;
  let dups = 0;
  for (let i = 0; i < 12; i++) {
    f.e.S.snd.dry.shallows = 5;
    f.e.lowerLine('shallows', true); f.e.step(3601);
    const e1 = f.e.S.echoesTotal, r = f.e.drawUp(0, true);
    if (!r.relic) { dups++; assert.ok(f.e.S.echoesTotal > e1); }
  }
  assert.ok(dups > 0 || f.e.relicCount() <= 8);
  assert.ok(f.e.relicCount() <= 8 && f.e.relicCount() >= have);
  assert.ok(f.e.S.echoesTotal >= e0);
});

test('set completion applies its bonus once, and relics feed their stat', () => {
  const f = sea();
  const { D } = load();
  f.e.S.den = { tide: 1 }; f.e.recalc();
  const pane = () => Math.pow(1.03, f.e.paneCount());
  const echo0 = f.e.C.mods.echo / pane();
  const table = D.RELICS.filter((r) => r.set === 'table');
  table.slice(0, 2).forEach((r) => { f.e.S.relics[r.id] = 1; }); f.e.recalc();
  assert.ok(Math.abs(f.e.C.mods.echo / pane() / echo0 - 1.04) < 1e-9, 'two relics: +4 percent');
  table.slice(2).forEach((r) => { f.e.S.relics[r.id] = 1; }); f.e.recalc();
  assert.ok(Math.abs(f.e.C.mods.echo / pane() / echo0 - 1.08 * 1.25) < 1e-9, 'four relics and the set');
  assert.equal(f.e.setDone('table'), 1);
  assert.equal(f.e.OMENS.find((o) => o.name === 'The Drowned Table').cond(), true);
  const bed = D.RELICS.filter((r) => r.set === 'bed');
  const base = f.e.awayPace();
  bed.forEach((r) => { f.e.S.relics[r.id] = 1; });
  assert.ok(Math.abs(f.e.awayPace() - Math.min(1, base + 0.04 + 0.06)) < 1e-9, 'ten points in all');
});

test('the audit strips relics a save could not have', () => {
  const { e } = engine();
  const s = e.adopt({ relics: { table1: 1, queen1: 1, bed1: 1 }, snd: { done: 1 }, played: 1e5, unlightings: 0 });
  assert.equal(JSON.stringify(Object.keys(s.relics)), '["table1"]');
  assert.ok(s.marks >= 1);
  const t = e.adopt({ snd: { done: 500 }, played: 7200 });
  assert.equal(t.snd.done, 4);
  const u = e.adopt({ relics: { a: 1, table1: 1 }, snd: { done: 2 }, played: 1e5 });
  assert.equal(JSON.stringify(Object.keys(u.relics)), '["table1"]');
});

test('adopt keeps one line without the perk, two with it, known depths only', () => {
  const { e } = engine();
  const o = { snd: { lines: [{ id: 'shallows', left: 9999 }, { id: 'shelf', left: 5 }, { id: 'nope', left: 1 }] } };
  assert.equal(e.adopt(o).snd.lines.length, 1);
  assert.equal(e.adopt(o).snd.lines[0].left, 3600, 'clamped to the depth\'s length');
  assert.equal(e.adopt(Object.assign({ perks: { twolines: 1 }, glassTotal: 40, glass: 0, unlightings: 1 }, o)).snd.lines.length, 2);
});

test('both sets complete at a depth pay double Echoes and add nothing', () => {
  const f = sea();
  const { D } = load();
  ['table', 'lamp'].forEach((s) => D.RELICS.filter((r) => r.set === s).forEach((r) => { f.e.S.relics[r.id] = 1; }));
  f.e.S.snd.done = 20;
  f.e.lowerLine('shallows', true); f.e.step(3601);
  const e0 = f.e.S.echoesTotal, n = f.e.relicCount();
  f.e.drawUp(0, true);
  assert.equal(f.e.relicCount(), n);
  const paid = f.e.S.echoesTotal - e0;
  assert.ok(Math.abs(paid - 2 * 6 * f.e.shaftReward(f.e.S.shaftTop)) < 1);
});
