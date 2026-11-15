'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fakeEnv, fixtures, j } = require('./helpers');

function fresh() {
  const { D, create } = load();
  const f = fakeEnv();
  const e = create(D, f.env);
  e.load();
  return Object.assign(f, { e, D });
}

const FIX = fixtures();

test('there are at least four fixtures, from different stages of play', () => {
  assert.ok(FIX.length >= 4);
  ['fresh', 'mid-first-fathom', 'two-unlightings-perks', 'post-ending'].forEach((n) =>
    assert.ok(FIX.some((x) => x.name === n), 'missing fixture ' + n));
});

FIX.forEach((fx) => {
  test('fixture ' + fx.name + ': unpacks and seals as valid', () => {
    const { e } = fresh();
    const u = e.unpack(fx.text);
    assert.equal(u.sealed, true);
    assert.equal(typeof u.data, 'object');
  });

  test('fixture ' + fx.name + ': adopts with zero audit fixes and no irregularity mark', () => {
    const { e } = fresh();
    const u = e.unpack(fx.text);
    const s = e.adopt(u.data);
    assert.equal(s.marks, 0);
    assert.equal(e.audit(s), 0);
    assert.equal(s.marks, u.data.marks);
  });

  test('fixture ' + fx.name + ': re-packs to a string that adopts to an equal state', () => {
    const f = fresh();
    f.map.set(f.e.KEY, fx.text);
    f.e.load();
    const first = j(f.e.S);
    const again = f.e.unpack(f.e.exportText());
    assert.equal(again.sealed, true);
    assert.equal(j(f.e.adopt(again.data)), first);
  });

  test('fixture ' + fx.name + ': a tampered body fails the seal', () => {
    const { e } = fresh();
    const parts = fx.text.split('.');
    const body = Buffer.from(parts[1], 'base64').toString('binary').replace(/"gloom":/, '"gloom":9');
    const forged = parts[0] + '.' + Buffer.from(body, 'binary').toString('base64') + '.' + parts[2];
    assert.equal(e.unpack(forged).sealed, false);
  });
});

test('a fresh realm loads, saves, and loads back the same', () => {
  const f = fresh();
  assert.equal(f.e.save(), true);
  const before = j(f.e.S);
  assert.equal(f.e.load().note, null);
  assert.equal(j(f.e.S), before);
});

test('a save that fails its seal is set aside, not played', () => {
  const f = fresh();
  const fx = FIX.find((x) => x.name === 'mid-first-fathom');
  const parts = fx.text.split('.');
  const bad = parts[0] + '.' + parts[1] + '.' + 'zzzz-zzzz';
  f.map.set(f.e.KEY, bad);
  const r = f.e.load();
  assert.match(r.note, /altered outside the game/);
  assert.equal(f.map.get(f.e.KEY + '.rejected'), bad);
  assert.equal(f.e.S.totalGloom, 0);
});

test('unreadable text is set aside under its own key', () => {
  const f = fresh();
  f.map.set(f.e.KEY, 'not a save');
  const r = f.e.load();
  assert.match(r.note, /could not be read/);
  assert.equal(f.map.get(f.e.KEY + '.unreadable'), 'not a save');
});

test('hostile input is rejected or defaulted', () => {
  const { e } = fresh();
  assert.throws(() => e.unpack('x'.repeat(200001)), /size/);
  assert.throws(() => e.unpack('TDR1.abc.def'), /format/);
  const proto = e.adopt(JSON.parse('{"__proto__":{"polluted":1},"constructor":{"x":1},"den":{"__proto__":{"gleaner":9}}}'));
  assert.equal(({}).polluted, undefined);
  assert.equal(proto.polluted, undefined);
  assert.equal(Object.keys(proto).indexOf('constructor'), -1);
  assert.equal(proto.den.gleaner, undefined);
  const wrong = e.adopt({ gloom: '9e99', totalGloom: [1], runGloom: null, den: 5, upg: 'x', echoes: {}, tab: 'nope', opts: { buy: 7 } });
  assert.equal(wrong.gloom, 0);
  assert.equal(wrong.totalGloom, 0);
  assert.equal(wrong.tab, 'den');
  assert.equal(wrong.opts.buy, 1);
  assert.equal(e.adopt('a string').totalGloom, 0);
  assert.equal(e.adopt(null).totalGloom, 0);
});

test('negative and non-finite numbers are clamped or defaulted', () => {
  const { e } = fresh();
  const s = e.adopt({ gloom: -5, totalGloom: -1, runGloom: Infinity, echoes: NaN, played: -9, clicks: -3, glass: -2 });
  assert.equal(s.gloom, 0);
  assert.equal(s.totalGloom, 0);
  assert.equal(s.runGloom, 0);
  assert.equal(s.echoes, 0);
  assert.equal(s.played, 0);
  assert.equal(s.clicks, 0);
  assert.equal(s.glass, 0);
});

test('importText refuses an oversized string and a non-save, and keeps the current realm', () => {
  const f = fresh();
  f.e.S.gloom = 0;
  assert.equal(f.e.importText('x'.repeat(200001)).ok, false);
  const r = f.e.importText('hello');
  assert.equal(r.ok, false);
  assert.match(r.error, /not a Dark Realm save/);
});

test('importText accepts a fixture and replaces the realm', () => {
  const f = fresh();
  const fx = FIX.find((x) => x.name === 'post-ending');
  const r = f.e.importText(fx.text);
  assert.equal(r.ok, true);
  assert.equal(f.e.S.ended, true);
  assert.equal(f.e.S.bestShaft, 150);
});

test('importText refuses a tampered save', () => {
  const f = fresh();
  const parts = FIX[0].text.split('.');
  assert.equal(f.e.importText(parts[0] + '.' + parts[1] + '.aaaa-bbbb').ok, false);
});

test('an over-rich forged save is repaired and marks rises', () => {
  const f = fresh();
  const forged = { v: 2, gloom: 1e30, runGloom: 1e30, totalGloom: 1e30, den: { sleeper: 10 }, played: 100 };
  const s = f.e.adopt(forged);
  assert.ok(s.marks >= 1);
  assert.ok(s.totalGloom < 1e30);
  assert.ok((s.den.sleeper || 0) < 10);
});

test('Nightglass and perks without an Unlighting are stripped', () => {
  const f = fresh();
  const s = f.e.adopt({ glassTotal: 50, glass: 50, perks: { queen: 1, deep: 1 }, played: 100000 });
  assert.equal(s.glassTotal, 0);
  assert.equal(s.glass, 0);
  assert.deepEqual(Object.keys(s.perks), []);
  assert.ok(s.marks >= 1);
});

test('a save refused by the browser warns once and returns false', () => {
  const { D, create } = load();
  const f = fakeEnv({ refuse: true });
  const e = create(D, f.env);
  e.load();
  assert.equal(e.save(), false);
  assert.equal(e.save(), false);
  assert.equal(f.said.filter((m) => /refusing to store/.test(m)).length, 1);
});

test('a v1 save is adopted and the old key removed', () => {
  const { D, create } = load();
  const f = fakeEnv({ storage: [['thedarkrealm.save.v1', JSON.stringify({ totalGloom: 500, runGloom: 500, gloom: 500, played: 1000 })]] });
  const e = create(D, f.env);
  e.load();
  assert.equal(e.S.totalGloom, 500);
  assert.equal(f.map.has('thedarkrealm.save.v1'), false);
});

test('erase removes both keys', () => {
  const f = fresh();
  f.e.save();
  f.map.set('thedarkrealm.save.v1', 'old');
  f.e.erase();
  assert.equal(f.map.size, 0);
});
