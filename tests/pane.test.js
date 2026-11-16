'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, load } = require('./helpers');

const lit = (f) => Array.from(f.e.paneLights()).map((b, i) => (b ? i + 1 : 0)).filter(Boolean);
const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));

test('there are twenty-four lights in the stated order', () => {
  const { D } = load();
  assert.equal(D.PANE.lights.length, 24);
  assert.equal(D.PANE.lights.map((l) => l.id).join(), Array.from({ length: 24 }, (_, i) => 'p' + String(i + 1).padStart(2, '0')).join());
  assert.equal(D.PANE.lights[0].name, 'The Shard You Woke With');
  assert.equal(D.PANE.lights[23].name, 'Every Sign');
});

test('each condition lights its light from a hand-built state', () => {
  const f = engine();
  const S = f.e.S;
  same(lit(f), []);
  S.glassTotal = 1; same(lit(f), [1]);
  S.bestShaft = 150; S.unlightings = 10; S.lanterns = 100;
  same(lit(f), [1, 2, 3, 5]);
  const { D } = load();
  D.PERKS.forEach((p) => { S.perks[p.id] = 1; });
  assert.ok(lit(f).includes(4), 'every perk owned');
  S.omens = Object.fromEntries(f.e.OMENS.filter((o) => ['A Nation Below', 'A World Below'].includes(o.name)).map((o) => [o.id, 1]));
  assert.ok(lit(f).includes(6));
  S.keepings = { hands: 1, door: 1 };
  assert.ok(lit(f).includes(7) && lit(f).includes(9) && !lit(f).includes(8));
  D.RELICS.filter((r) => r.set === 'table').forEach((r) => { S.relics[r.id] = 1; });
  assert.ok(lit(f).includes(13));
  S.sky.seen.moonless = 1; S.sky.seen.longestnight = 1; S.sky.eclipses = { e2027a: 1 }; S.pet.count = 30;
  [19, 20, 21, 22].forEach((n) => assert.ok(lit(f).includes(n), 'light ' + n));
});

test('the Whole Ledger and Every Sign leave out the ending pages and omens, so they are reachable first', () => {
  const f = engine();
  const S = f.e.S;
  const { D } = load();
  D.CODEX.filter((c) => c.sys !== 'ending' && D.LIVE_SYSTEMS.includes(c.sys)).forEach((c) => { S.codex[c.id] = 1; });
  f.e.OMENS.filter((o) => o.name !== 'Hers' && o.name !== 'Yours').forEach((o) => { S.omens[o.id] = 1; });
  assert.ok(lit(f).includes(23));
  assert.ok(lit(f).includes(24));
  delete S.codex.waking;
  assert.equal(lit(f).includes(23), false);
});

test('the pane factor is 1.03 to the number of lit lights, on Gloom, Might and Echoes', () => {
  const f = engine();
  f.e.recalc();
  const base = f.e.C.mods.gloom;
  f.e.S.glassTotal = 1; f.e.S.bestShaft = 150; f.e.S.unlightings = 10;
  f.e.recalc();
  const rows = f.e.breakdown('gloom').filter((r) => r.name === 'The Pane');
  assert.ok(Math.abs(rows[0].value - Math.pow(1.03, 3)) < 1e-12);
  assert.ok(Math.abs(f.e.breakdown('might').find((r) => r.name === 'The Pane').value - Math.pow(1.03, 3)) < 1e-12);
  assert.ok(Math.abs(f.e.breakdown('echo').find((r) => r.name === 'The Pane').value - Math.pow(1.03, 3)) < 1e-12);
  assert.ok(base > 0);
  assert.ok(Math.abs(Math.pow(1.03, 24) - 2.03) < 0.01, 'all 24 is about x2.03');
});

function whole() {
  const f = engine();
  const S = f.e.S;
  const { D } = load();
  S.glassTotal = 5000; S.bestShaft = 150; S.unlightings = 12; S.lanterns = 120; S.played = 1e9;
  D.PERKS.forEach((p) => { S.perks[p.id] = 1; });
  D.VOWS.forEach((v) => { S.keepings[v.id] = 1; });
  D.RELICS.forEach((r) => { S.relics[r.id] = 1; });
  S.sky.seen = { moonless: 1, lidless: 1, longestnight: 1, longestday: 1, balance: 1 }; S.sky.eclipses = { e2027a: 1 }; S.pet.count = 30;
  D.CODEX.filter((c) => c.sys !== 'ending' && D.LIVE_SYSTEMS.includes(c.sys)).forEach((c) => { S.codex[c.id] = 1; });
  f.e.OMENS.filter((o) => o.name !== 'Hers' && o.name !== 'Yours').forEach((o) => { S.omens[o.id] = 1; });
  f.e.recalc();
  return f;
}

test('with all twenty-four lit, an ending can be chosen once, and only then', () => {
  const part = engine();
  assert.equal(part.e.chooseEnding('kept', true), false, 'not whole');
  const f = whole();
  assert.equal(f.e.paneCount(), 24);
  assert.equal(f.e.chooseEnding('kept', false), false, 'untrusted');
  assert.equal(f.e.chooseEnding('nonsense', true), false);
  assert.equal(f.e.chooseEnding('returned', true), true);
  assert.equal(f.e.S.pane.choice, 'returned');
  assert.equal(f.e.chooseEnding('kept', true), false, 'permanent');
  f.e.slowChecks();
  assert.ok(f.e.S.codex.end_returned);
  assert.equal(f.e.S.codex.end_kept, undefined);
  assert.equal(f.e.OMENS.find((o) => o.name === 'Hers').cond(), true);
  assert.equal(f.e.OMENS.find((o) => o.name === 'Yours').cond(), false);
});

test('a save that claims a choice without every light lit loads with no choice', () => {
  const { e } = engine();
  assert.equal(e.adopt({ pane: { choice: 'kept' }, glassTotal: 10, played: 1e6 }).pane.choice, '');
  assert.equal(e.adopt({ pane: { choice: 'nonsense' } }).pane.choice, '');
  const f = whole();
  f.e.chooseEnding('kept', true);
  const g = engine(); g.e.importText(f.e.exportText());
  assert.equal(g.e.S.pane.choice, 'kept', 'a real choice survives a save');
});

test('seen is bookkeeping only: marking changes nothing about the lights', () => {
  const f = engine();
  f.e.S.glassTotal = 3;
  assert.equal(f.e.paneUnseen(), 1);
  f.e.markPaneSeen();
  assert.equal(f.e.paneUnseen(), 0);
  const forged = engine();
  forged.e.S.pane.seen = { p01: 1, p02: 1, p03: 1 };
  assert.equal(forged.e.paneCount(), 0);
});

test('the pane page unlocks with the first Nightglass and Twelve Lights at 12', () => {
  const f = engine();
  f.e.S.codex = {}; f.e.S.glassTotal = 1;
  f.e.slowChecks();
  assert.ok(f.e.S.codex.pane);
  assert.equal(f.e.S.codex.pane_half, undefined);
  const w = whole();
  w.e.S.codex = {}; w.e.slowChecks();
  assert.ok(w.e.S.codex.pane_half);
});
