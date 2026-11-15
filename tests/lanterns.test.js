'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./helpers');

test('lantern path weights hold at their boundaries', () => {
  const { e } = engine();
  const want = [[0, 'ltr'], [0.349, 'ltr'], [0.35, 'rtl'], [0.699, 'rtl'], [0.7, 'drop'], [0.999, 'drop']];
  want.forEach(([r, p]) => assert.equal(e.lanternPath(r), p, 'r = ' + r));
});

test('all three paths occur over a thousand rolls, in roughly the stated shares', () => {
  const { e } = engine();
  const n = { ltr: 0, rtl: 0, drop: 0 };
  for (let i = 0; i < 1000; i++) n[e.lanternPath((i + 0.5) / 1000)]++;
  assert.deepEqual(n, { ltr: 350, rtl: 350, drop: 300 });
});

test('the lantern countdown does not run while the page is hidden', () => {
  const f = engine();
  f.e.S.totalGloom = 100; f.e.S.lanternIn = 40;
  f.clock.hidden = true;
  for (let i = 0; i < 30; i++) { f.clock.mono += 1000; f.clock.wall += 1000; f.e.tick(); }
  assert.equal(f.e.S.lanternIn, 40);
  assert.equal(f.e.lantern, null);
  f.clock.hidden = false;
  f.clock.mono += 1000; f.clock.wall += 1000; f.e.tick();
  assert.equal(Math.round(f.e.S.lanternIn), 39);
});

test('a lantern already on screen when the page hides is withdrawn, not spent', () => {
  const f = engine();
  f.e.S.totalGloom = 100; f.e.S.lanternIn = 0;
  f.clock.mono += 1000; f.clock.wall += 1000; f.e.tick();
  assert.notEqual(f.e.lantern, null);
  const before = f.e.S.lanterns;
  f.clock.hidden = true;
  f.clock.mono += 1000; f.clock.wall += 1000; f.e.tick();
  assert.equal(f.e.lantern, null);
  assert.equal(f.e.S.lanternIn, 5);
  assert.equal(f.e.S.lanterns, before, 'nothing was snuffed or lost to the count');
});

test('an away of ten minutes or more brings a lantern within 8 seconds, with a welcome', () => {
  const f = engine();
  f.e.S.totalGloom = 100; f.e.S.lanternIn = 140;
  f.e.away(600);
  assert.ok(f.e.S.lanternIn <= 8);
  assert.equal(f.said.some((m) => /waiting for someone/.test(m)), false, 'said only when it appears');
  for (let i = 0; i < 9; i++) { f.clock.mono += 1000; f.clock.wall += 1000; f.e.tick(); }
  assert.notEqual(f.e.lantern, null);
  assert.equal(f.said.filter((m) => /waiting for someone to come back/.test(m)).length, 1);
});

test('a shorter away leaves the countdown alone', () => {
  const f = engine();
  f.e.S.totalGloom = 100; f.e.S.lanternIn = 140;
  f.e.away(599);
  assert.equal(f.e.S.lanternIn, 140);
});

test('an away does not raise a countdown that is already short', () => {
  const f = engine();
  f.e.S.lanternIn = 3;
  f.e.away(3600);
  assert.equal(f.e.S.lanternIn, 3);
});
