'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./helpers');

/* ---- next objective ---- */

test('a new realm is told to bind a Wisp-Gleaner', () => {
  const { e } = engine();
  assert.equal(e.objective().id, 'first');
  assert.match(e.objective().text, /bind a Wisp-Gleaner/);
});

test('with a denizen bound and nothing else to do the realm is quiet', () => {
  const { e } = engine();
  e.S.den = { gleaner: 1 };
  e.recalc();
  assert.equal(e.objective().id, 'quiet');
  assert.equal(e.objective().go, null);
});

function state(mut) {
  const f = engine();
  f.e.S.den = { gleaner: 20, scribe: 6 };
  f.e.S.runGloom = 1e6; f.e.S.totalGloom = 1e6; f.e.S.played = 1e5;
  mut(f.e.S);
  f.e.recalc();
  return f.e;
}

test('an affordable working comes first after the opening, and names itself', () => {
  const e = state((S) => { S.gloom = 1e5; });
  const o = e.objective();
  assert.equal(o.id, 'working');
  assert.match(o.text, /^A working is ready: .+\.$/);
  assert.deepEqual(JSON.parse(JSON.stringify(o.go)), { dest: 'realm', page: 'work' });
});

test('a Lampwarden the Host cannot beat asks for more Might, as a multiple', () => {
  const e = state((S) => { S.den = { gleaner: 1 }; S.unlocked.shafts = true; S.shaftTop = 10; S.shaft = 10; S.bestShaft = 9; S.gloom = 0; });
  const o = e.objective();
  assert.equal(o.id, 'lampwarden');
  assert.match(o.text, /^The Host needs \d+(\.\d)?\u00d7 more Might for Lampwarden Orrin Vale\.$/);
});

test('Unlighting is offered once, when it is first possible', () => {
  const e = state((S) => { S.unlocked.unlight = true; S.runGloom = 2e9; S.totalGloom = 2e9; S.gloom = 0; });
  assert.equal(e.objective().id, 'unlight');
  const again = state((S) => { S.unlocked.unlight = true; S.unlightings = 1; S.glassTotal = 3; S.runGloom = 2e9; S.totalGloom = 2e9; S.gloom = 0; });
  assert.notEqual(again.objective().id, 'unlight');
});

test('a denizen kind not yet owned is named when it is under ten minutes away', () => {
  const e = state((S) => { S.den = { gleaner: 20, scribe: 6, weaver: 0 }; S.gloom = 0; S.upg = {}; });
  const f = e.facts();
  assert.ok(f.nextDen, 'a next denizen is within reach');
  assert.equal(f.nextDen.name, 'Murk-Weaver');
  const o = e.objective();
  if (o.id === 'nextden') assert.match(o.text, /^A Murk-Weaver in /);
});

test('an affordable Rite is announced', () => {
  const e = state((S) => { S.den = { gleaner: 1, scribe: 1, weaver: 1, warden: 1, cantor: 1, forge: 1, tide: 1, choir: 1, orchard: 1, sleeper: 1 }; S.unlocked.rites = true; S.echoes = 500; S.echoesTotal = 500; S.runEchoes = 500; S.gloom = 0; });
  assert.equal(e.objective().id, 'rite');
});

test('an unearned omen within a quarter of its goal is named with a percentage', () => {
  const e = state((S) => { S.den = { gleaner: 1 }; S.gloom = 0; S.totalGloom = 8.2e11; S.runGloom = 8.2e11; S.omens = { o0: 1, o1: 1, o2: 1 }; });
  const o = e.objective();
  assert.equal(o.id, 'omen');
  assert.equal(o.text, 'A Sea of Night: 82%.');
});

test('when several apply the order of the list decides', () => {
  const e = state((S) => {
    S.unlocked.rites = true; S.echoes = 500; S.echoesTotal = 500; S.runEchoes = 500;
    S.gloom = 1e5;                          // a working and a rite are both ready
  });
  assert.equal(e.objective().id, 'working');
});

/* ---- time to afford ---- */

test('time to afford: nothing at zero income or when already affordable, then 59 s, 1 h, over a day', () => {
  const { e } = engine();
  assert.equal(e.eta(0, 100, 0), '');
  assert.equal(e.eta(100, 100, 5), '');
  assert.equal(e.eta(0, 59, 1), 'in 59s');
  assert.equal(e.eta(0, 3600, 1), 'in 1h 0m');
  assert.equal(e.eta(0, 25 * 3600, 1), 'over a day');
  assert.equal(e.eta(0, 200, 1), 'in 3m 20s');
});

/* ---- Echo income over the last minute ---- */

test('the rate meter averages the last 60 seconds and forgets older samples', () => {
  const { e } = engine();
  const m = e.rateMeter(60);
  assert.equal(m.rate(), 0);
  for (let t = 0; t <= 120; t += 1) m.sample(t < 60 ? 0 : (t - 60) * 10, t);   // nothing for a minute, then 10 a second
  assert.ok(Math.abs(m.rate() - 10) < 0.2, 'about 10 a second over the last minute: ' + m.rate());
  m.reset();
  assert.equal(m.rate(), 0);
});

/* ---- events for toasts ---- */

test('earning an omen, a codex page and an unlock raise events the interface can drain', () => {
  const f = engine();
  f.e.drainEvents();
  f.e.S.totalGloom = 2500; f.e.S.runGloom = 2500; f.e.S.gloom = 2500;
  f.e.slowChecks();
  const ev = f.e.drainEvents();
  const types = ev.map((x) => x.type);
  assert.ok(types.includes('omen'));
  assert.ok(types.includes('codex'));
  assert.ok(types.includes('unlock'));
  assert.equal(ev.find((x) => x.type === 'omen').name, 'A Puddle of Night');
  assert.equal(f.e.drainEvents().length, 0, 'draining empties the list');
});

test('the first of each denizen raises an event, the second does not', () => {
  const f = engine();
  f.e.S.gloom = 1e4;
  f.e.drainEvents();
  f.e.buyDenizen('gleaner');
  f.e.buyDenizen('gleaner');
  const ev = f.e.drainEvents().filter((x) => x.type === 'den');
  assert.equal(ev.length, 1);
  assert.equal(ev[0].name, 'Wisp-Gleaner');
});

test('undoing a Lampwarden for the first time raises an event', () => {
  const f = engine();
  f.e.S.unlocked.shafts = true; f.e.S.shaftTop = 10; f.e.S.shaft = 10; f.e.S.bestShaft = 9;
  f.e.drainEvents();
  f.e.C.might = 1e9;
  f.e.fight(5);
  assert.ok(f.e.drainEvents().some((x) => x.type === 'boss' && x.n === 10));
});

test('events cannot grow without bound when nobody listens', () => {
  const f = engine();
  for (let i = 0; i < 200; i++) { f.e.S.gloom = 1e4; f.e.S.den = {}; f.e.buyDenizen('gleaner'); }
  assert.ok(f.e.drainEvents().length <= 60);
});

/* ---- the Why breakdown ---- */

test('the breakdown lists each source that changes a channel, and its factors multiply to the total', () => {
  const f = engine();
  f.e.S.glassTotal = 4; f.e.S.perks = { deep: 1 }; f.e.S.rites = { listen: 2 };
  f.e.recalc();
  const rows = f.e.breakdown('gloom');
  const names = rows.map((r) => r.name);
  assert.ok(names.includes('Nightglass') && names.includes('Nightglass perks') && names.includes('Rites'));
  const product = rows.reduce((p, r) => p * r.value, 1);
  assert.ok(Math.abs(product - f.e.C.mods.gloom) < 1e-9);
  assert.equal(f.e.breakdown('might').some((r) => r.name === 'Rites'), false);
});

/* ---- omen sets ---- */

test('every omen belongs to a set and reports progress between 0 and 1', () => {
  const { e } = engine();
  e.OMENS.forEach((o) => { assert.ok(o.set, o.id); const p = o.prog(); assert.ok(p >= 0 && p <= 1, o.id + ' ' + p); });
});
