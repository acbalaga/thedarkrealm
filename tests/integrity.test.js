'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fakeEnv, engine, j } = require('./helpers');

const V1 = JSON.stringify({ totalGloom: 500, runGloom: 500, gloom: 500, played: 1000 });

function boot(storage, wall) {
  const { D, create } = load();
  const f = fakeEnv({ storage, wall });
  const e = create(D, f.env);
  const r = e.load();
  return Object.assign(f, { e, D, note: r.note });
}

/* ---- the v1 path ---- */

test('a v1 save loads marked, is rewritten as a sealed v2 save, and the v1 key goes', () => {
  const f = boot([['thedarkrealm.save.v1', V1]]);
  assert.equal(f.e.S.totalGloom, 500);
  assert.ok(f.e.S.marks >= 1);
  assert.match(f.note, /arrived unsealed/);
  assert.equal(f.map.has('thedarkrealm.save.v1'), false);
  const v2 = f.map.get(f.e.KEY);
  assert.ok(v2, 'a v2 save was written at once');
  assert.equal(f.e.unpack(v2).sealed, true);
});

test('a v1 save longer than the size cap is ignored and set aside', () => {
  const f = boot([['thedarkrealm.save.v1', V1 + ' '.repeat(250000)]]);
  assert.equal(f.e.S.totalGloom, 0);
  assert.equal(f.map.has('thedarkrealm.save.v1'), false);
  assert.ok(f.map.has('thedarkrealm.save.v1.unreadable'));
  assert.match(f.note, /too large/);
});

test('after the cut-off date the v1 key is retired and not read', () => {
  const f = boot([['thedarkrealm.save.v1', V1]], Date.UTC(2027, 6, 2));
  assert.equal(f.e.S.totalGloom, 0);
  assert.equal(f.map.has('thedarkrealm.save.v1'), false);
  assert.equal(f.map.get('thedarkrealm.save.v1.retired'), V1);
});

test('a v1 save that is not JSON leaves a fresh realm', () => {
  const f = boot([['thedarkrealm.save.v1', 'not json']]);
  assert.equal(f.e.S.totalGloom, 0);
});

/* ---- Rites after the first Unlighting ---- */

test('a forged state with 300 levels of a Rite after an Unlighting is repaired and marked', () => {
  const { e } = engine();
  const s = e.adopt({ unlightings: 2, glassTotal: 5, glass: 5, runEchoes: 10, echoesTotal: 5000, echoes: 0, rites: { edge: 300 }, played: 1e5 });
  assert.equal(j(s.rites), '{}');
  assert.equal(s.marks, 1);
});

test('rites carried in by Rites Remembered are not counted against this fathom', () => {
  const { e } = engine();
  const s = e.adopt({ unlightings: 2, glassTotal: 200, glass: 0, perks: { remember: 1 }, runEchoes: 0, echoesTotal: 5000, echoes: 0,
    rites: { edge: 12 }, ritesKept: { edge: 12 }, played: 1e5 });
  assert.equal(s.rites.edge, 12);
  assert.equal(s.marks, 0);
});

test('an honest run, including an Unlighting with Rites Remembered, needs no repairs', () => {
  const { e } = engine();
  e.S.unlocked.shafts = true;
  e.S.played = 1e5;
  function earn() { e.C.might = 1e6; e.S.shaftTop = 1e6; e.S.shaft = 1; e.fight(200); }
  earn();
  for (let i = 0; i < 40; i++) e.buyRite('edge');
  assert.ok(e.rl('edge') > 3);
  assert.equal(e.audit(JSON.parse(JSON.stringify(e.S))) , 0);
  // Unlight with the perk, which keeps half the levels.
  e.S.glassTotal = 500; e.S.unlightings = 1; e.S.perks.remember = 1;
  e.S.runGloom = 1e12; e.S.totalGloom = 1e12;
  const before = e.rl('edge');
  assert.equal(e.unlight(), true);
  assert.equal(e.rl('edge'), Math.floor(before / 2));
  assert.equal(j(e.S.ritesKept), j({ edge: Math.floor(before / 2) }));
  assert.equal(e.S.runEchoes, 0);
  e.S.unlocked.shafts = true;
  earn();
  for (let i = 0; i < 10; i++) e.buyRite('listen');
  const after = JSON.parse(JSON.stringify(e.S));
  assert.equal(e.audit(after), 0);
});

test('a save from before runEchoes existed loads with no repairs and starts tracking', () => {
  const { e } = engine();
  const s = e.adopt({ unlightings: 2, glassTotal: 20, glass: 20, echoesTotal: 5000, echoes: 40, rites: { edge: 30 }, played: 1e5 });
  assert.equal(s.marks, 0);
  assert.equal(s.runEchoes, 40);
  assert.equal(j(s.ritesKept), j({ edge: 30 }));
});

/* ---- storage events from another window ---- */

test('storageAction decides what a storage event means', () => {
  const { e } = engine();
  assert.equal(e.storageAction(e.KEY, 'TDR2.x.y'), 'taken');
  assert.equal(e.storageAction(e.KEY, null), 'erased');
  assert.equal(e.storageAction(null, null), 'erased');
  assert.equal(e.storageAction('some.other.key', 'x'), null);
  assert.equal(e.storageAction('some.other.key', null), null);
});
