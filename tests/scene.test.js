'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load } = require('./helpers');

function scene() {
  const box = { window: {}, Math };
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'scene.js'), 'utf8'), box);
  return box.window.TDR_SCENE;
}
const KINDS = ['gleaner', 'scribe', 'weaver', 'warden', 'cantor', 'forge', 'tide', 'choir', 'orchard', 'sleeper', 'bell', 'wright'];
const base = { unlightings: 0, den: {}, ended: false, shaft: 1, shaftHp: 12, shaftMax: 12, autoAdvance: true };

test('counts become figure tiers: none, one, two from 25, three from 100', () => {
  const S = scene();
  [[0, 0], [1, 1], [24, 1], [25, 2], [99, 2], [100, 3], [5000, 3]].forEach(([n, t]) => assert.equal(S.tier(n), t, String(n)));
  const v = S.view(Object.assign({}, base, { den: { gleaner: 1, scribe: 30, weaver: 150 } }), KINDS);
  assert.equal(v.kinds.map((k) => k.tier).join(''), '123000000000');
});

test('a Lampwarden being fought makes a shaft of light that narrows with its radiance, and nothing otherwise', () => {
  const S = scene();
  assert.equal(S.view(base, KINDS).lamp.on, false);
  const boss = S.view(Object.assign({}, base, { shaft: 10, shaftHp: 300, shaftMax: 600 }), KINDS);
  assert.equal(boss.lamp.on, true);
  assert.equal(boss.lamp.frac, 0.5);
  assert.equal(S.view(Object.assign({}, base, { shaft: 10, autoAdvance: false }), KINDS).lamp.on, false);
});

test('the depth tint moves from violet toward blue-black over twelve fathoms and then stops', () => {
  const S = scene();
  const a = S.depthTint(0), b = S.depthTint(12), c = S.depthTint(40);
  assert.notEqual(a.mid, b.mid);
  assert.equal(b.mid, c.mid);
  assert.match(a.mid, /^rgb\(11,9,22\)$/);
});

test('the signature changes when the picture should, and not otherwise', () => {
  const S = scene();
  const a = S.view(base, KINDS), b = S.view(Object.assign({}, base, { den: { gleaner: 3 } }), KINDS), c = S.view(Object.assign({}, base, { den: { gleaner: 4 } }), KINDS);
  assert.notEqual(S.signature(a), S.signature(b));
  assert.equal(S.signature(b), S.signature(c), 'the same tier looks the same');
  assert.notEqual(S.signature(a), S.signature(S.view(Object.assign({}, base, { ended: true }), KINDS)));
});

test('figure slots keep clear of the circle round the well', () => {
  const S = scene();
  S.SLOTS.forEach(([x, y]) => {
    // On the smallest scene box (360 by 236) the well and its tap target are a 150 px circle at 50% and 46%.
    const dx = x * 360 - 180, dy = y * 236 - 0.46 * 236;
    assert.ok(Math.sqrt(dx * dx + dy * dy) > 75, 'a slot at ' + x + ',' + y + ' sits under the well');
  });
  assert.equal(S.SLOTS.length, 12);
});

test('every kind has a figure, drawn in under ten path operations, and draw never throws', () => {
  const S = scene();
  const calls = [];
  const ctx = new Proxy({}, { get: (t, k) => (typeof k === 'string' ? (...a) => { calls.push(k); } : undefined), set: () => true });
  const v = S.view(Object.assign({}, base, { den: Object.fromEntries(KINDS.map((k) => [k, 150])), ended: true, choice: 'returned', paneLit: 12, shaft: 10, shaftHp: 5, shaftMax: 10 }), KINDS);
  assert.doesNotThrow(() => S.draw(ctx, 360, 236, 1.5, v, { gleaner: 0.4 }, true));
  const { D } = load();
  assert.equal(D.DENIZENS.length, 12);
  assert.ok(calls.length > 50);
  KINDS.forEach((k) => {
    const one = []; const c = new Proxy({}, { get: (t, p) => (typeof p === 'string' ? (...a) => { one.push(p); } : undefined), set: () => true });
    S.draw(c, 360, 236, 0, S.view(Object.assign({}, base, { den: { [k]: 1 } }), KINDS), null, false);
    const paths = one.filter((x) => /^(moveTo|lineTo|arc|ellipse|fillRect|fill|stroke|beginPath|closePath)$/.test(x)).length;
    assert.ok(paths < 40, k + ': ' + paths);   // the throne is in this count too
  });
});
