'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { engine, fixtures } = require('./helpers');

function sig12(a, b, what) {
  if (a === b) return;
  assert.ok(Math.abs(a - b) <= Math.abs(b) * 5e-13, what + ': ' + a + ' vs ' + b);
}

const BEFORE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'before-tdr004.json'), 'utf8'));

fixtures().forEach((fx) => {
  test('fixture ' + fx.name + ': derived values match the pre-registry numbers to 12 figures', () => {
    const { e } = engine();
    assert.equal(e.importText(fx.text).ok, true);
    e.recalc();
    const want = BEFORE[fx.name];
    ['gps', 'click', 'might', 'echoMult'].forEach((k) => sig12(e.C[k], want[k], fx.name + ' ' + k));
  });
});

test('a source adds to the folded result, and the registry rejects unknown channels', () => {
  const { e } = engine();
  e.S.den = { gleaner: 10 };
  e.recalc();
  const gps = e.C.gps, pace = e.awayPace();
  e.addSource('test', () => ({ gloom: 2, awayPace: 0.1 }));
  e.recalc();
  sig12(e.C.gps, gps * 2, 'gps doubles');
  sig12(e.awayPace(), pace + 0.1, 'away pace');
  e.addSource('typo', () => ({ gloomm: 2 }));
  assert.throws(() => e.recalc(), /unknown channel gloomm/);
});

test('away pace is capped at 100 percent', () => {
  const { e } = engine();
  e.addSource('big', () => ({ awayPace: 5 }));
  assert.equal(e.awayPace(), 1);
});

test('a source can see whether the player is present', () => {
  const { e } = engine();
  e.S.den = { gleaner: 10 };
  e.addSource('openPlay', (s, ctx) => ({ gloom: ctx.present ? 3 : 1 }));
  e.recalc();
  const open = e.C.gps;
  const report = e.away(100);
  assert.ok(report);
  sig12(report.gloom, open / 3 * report.pace * 100, 'away ignores the open-play bonus');
});

test('den.<id> channels apply to one denizen only', () => {
  const { e } = engine();
  e.S.den = { gleaner: 10, scribe: 10 };
  e.recalc();
  const g = e.C.denOut.gleaner, s = e.C.denOut.scribe;
  e.addSource('gleaners', () => ({ 'den.gleaner': 4 }));
  e.recalc();
  sig12(e.C.denOut.gleaner, g * 4, 'gleaner');
  sig12(e.C.denOut.scribe, s, 'scribe');
});

test('cost channels reach denCost, riteCost and glassGain', () => {
  const { e, D } = engine();
  const d = D.DENIZENS[1], r = D.RITES[0];
  e.S.runGloom = 1e12;
  e.recalc();
  const c = e.denCost(d, 5, 1), rc = e.riteCost(r), gg = e.glassGain();
  e.addSource('cheap', () => ({ cost: 0.5, riteCost: 0.5, glass: 2 }));
  e.recalc();
  assert.equal(e.denCost(d, 5, 1), Math.ceil(d.cost * 0.5 * Math.pow(1.15, 5)));
  assert.ok(e.denCost(d, 5, 1) < c);
  assert.ok(e.riteCost(r) < rc);
  assert.equal(e.glassGain(), Math.floor(Math.pow(1e12 / 1e9, e.GLASS_EXP) * 2));
  assert.ok(e.glassGain() > gg);
});

test('the audit prices a save with the same cost modifiers as the game', () => {
  const { e, D } = engine();
  e.addSource('free', () => ({ cost: 0.1 }));
  e.recalc();
  const s = e.fresh();
  s.runGloom = 1000; s.totalGloom = 1000; s.gloom = 0; s.played = 1e6;
  // Thirty Scribes cost far more than 1000 at full price, but about a tenth of that with the source.
  s.den = { scribe: 15 };
  const fixes = e.audit(s);
  // 15 scribes at 10 percent of 150 growing 1.15x: about 612, inside the 1000 spent.
  assert.equal(fixes, 0, 'a purchase that was legal under the modifier is not repaired');
  assert.equal(s.den.scribe, 15);
});

test('rng is pure: same seed, label and counter give the same sequence', () => {
  const { e } = engine();
  const a = e.rng('x', 1), b = e.rng('x', 1);
  const sa = [a(), a(), a(), a()], sb = [b(), b(), b(), b()];
  assert.deepEqual(sa, sb);
  sa.forEach((v) => assert.ok(v >= 0 && v < 1));
  const c = e.rng('x', 2), d = e.rng('y', 1);
  assert.notDeepEqual([c(), c(), c(), c()], sa);
  assert.notDeepEqual([d(), d(), d(), d()], sa);
});

test('rng changes with the saved seed', () => {
  const f = engine();
  const before = [f.e.rng('x', 1)(), f.e.rng('x', 1)()];
  f.e.S.seed = (f.e.S.seed + 1) >>> 0;
  const after = f.e.rng('x', 1)();
  assert.notEqual(after, before[0]);
});

test('pick, shuffle and weighted use only the generator they are given', () => {
  const { e } = engine();
  const list = [1, 2, 3, 4, 5, 6];
  assert.ok(list.includes(e.pick(e.rng('p', 1), list)));
  const sh = e.shuffle(e.rng('s', 1), list);
  assert.deepEqual(sh.slice().sort(), list);
  assert.deepEqual(list, [1, 2, 3, 4, 5, 6], 'shuffle returns a copy');
  assert.deepEqual(e.shuffle(e.rng('s', 1), list), sh);
  const w = e.rng('w', 1);
  const seen = {};
  for (let i = 0; i < 200; i++) seen[e.weighted(w, [['a', 1], ['b', 0], ['c', 3]])] = 1;
  assert.deepEqual(Object.keys(seen).sort(), ['a', 'c']);
  assert.equal(e.weighted(w, []), undefined);
});

test('a new realm has a seed and a birth time, and loading a save never draws from env.random', () => {
  const f = engine();
  assert.equal(typeof f.e.S.seed, 'number');
  assert.ok(Number.isInteger(f.e.S.seed) && f.e.S.seed >= 0 && f.e.S.seed <= 4294967295);
  assert.equal(f.e.S.born, f.clock.wall);
  const text = f.e.exportText();
  let draws = 0;
  const g = engine();
  const orig = g.env.random;
  g.env.random = () => { draws++; return orig(); };
  g.e.importText(text);
  assert.equal(draws, 0);
});

test('a save from before TDR-004 gets a seed and loads with no irregularity mark', () => {
  const { e } = engine();
  fixtures().forEach((fx) => {
    const u = e.unpack(fx.text);
    assert.equal(Object.prototype.hasOwnProperty.call(u.data, 'seed'), false);
    const s = e.adopt(u.data);
    assert.equal(s.marks, u.data.marks);
    assert.equal(s.v, 3);
    assert.ok(Number.isInteger(s.seed));
  });
});

/* ---- schema round trip: a field in fresh() that adopt() forgets fails here ---- */

function canon(x) {
  if (x === null || typeof x !== 'object') return JSON.stringify(x);
  return '{' + Object.keys(x).sort().map((k) => JSON.stringify(k) + ':' + canon(x[k])).join(',') + '}';
}

function leaves(o, prefix, out) {
  Object.keys(o).forEach((k) => {
    const v = o[k], p = prefix ? prefix + '.' + k : k;
    if (v !== null && typeof v === 'object' && Object.keys(v).length > 0) leaves(v, p, out);
    else out.push(p);
  });
  return out;
}
function at(o, p) { return p.split('.').reduce((a, k) => a[k], o); }

function altered(e) {
  return {
    v: 3, seed: 123456789, born: 5,
    gloom: 123456, runGloom: 4e8, totalGloom: 5e8,
    echoes: 300, echoesTotal: 5000, runEchoes: 400, ritesKept: { edge: 1 },
    glass: 5, glassTotal: 40, unlightings: 3,
    den: { gleaner: 12 }, upg: { hand0: 1 }, rites: { edge: 2, listen: 1 }, perks: { absence: 1, keen: 1 },
    omens: { o0: 1, o1: 1 }, codex: { waking: 1, gloom: 2 },
    codexSeq: 7, codexNew: { gloom: 1 },
    shaft: 12, shaftTop: 151, bestShaft: 150, shaftHp: e.shaftMaxHp(12) / 2, bossTime: 20, march: 0.1,
    autoAdvance: false, regroup: true, sealed: 1234,
    clicks: 500, lanterns: 12, played: 100000, runTime: 5000,
    buffs: { hush: 12, teeth: 7 },
    lanternIn: 33,
    unlocked: { shafts: true, rites: true, unlight: true },
    ended: true,
    seen: 1.7e12 + 5, debt: 1234, marks: 2, exportedAt: 1.6e12, remindedAt: 1.65e12,
    opts: { sci: true, motion: false, buy: 25, keys: false, chatter: false },
    nav: { dest: 'ledger', page: { realm: 'work', host: 'rite', deep: 'vows', ledger: 'codex' } }
  };
}

test('schema round trip: every field of a new realm survives pack, unpack and adopt', () => {
  const { e } = engine();
  const f = e.fresh();
  const alt = altered(e);
  leaves(f, '', []).forEach((p) => {
    if (p === 'v') return;                                   // adopt ignores v by design
    let a;
    try { a = at(alt, p); } catch (x) { a = undefined; }
    assert.notEqual(a, undefined, 'add a valid, non-default value for "' + p + '" to altered() in this test');
    assert.notEqual(canon(a), canon(at(f, p)), '"' + p + '" in altered() equals the default, so the test proves nothing');
  });
  const body = Buffer.from(JSON.stringify(alt), 'utf8').toString('base64');
  const text = 'TDR2.' + body + '.' + e.seal(body);
  const u = e.unpack(text);
  assert.equal(u.sealed, true);
  const s = e.adopt(u.data);
  assert.equal(canon(s), canon(alt), 'a field was dropped, changed or clamped by adopt()');
  assert.equal(e.audit(e.adopt(u.data)), 0, 'the altered state should be one the audit accepts');
});
