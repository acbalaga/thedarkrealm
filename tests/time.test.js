'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./helpers');

const close = (a, b, msg) => assert.ok(Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)), (msg || '') + ' ' + a + ' vs ' + b);

/* A realm earning exactly 1 Gloom per second (one Moth-Scribe). */
function running() {
  const x = engine();
  x.e.S.den = { scribe: 1 };
  x.e.recalc();
  close(x.e.C.gps, 1);
  x.e.tick();
  return x;
}

test('time while running comes from the monotonic clock', () => {
  const { e, clock } = running();
  const g0 = e.S.totalGloom, p0 = e.S.played;
  clock.mono += 5000; clock.wall += 5000;
  const r = e.tick();
  assert.equal(r.away, null);
  close(e.S.totalGloom - g0, 5);
  close(e.S.played - p0, 5);
});

test('a wall-clock jump forward under a minute while running does not speed step', () => {
  const { e, clock } = running();
  const g0 = e.S.totalGloom;
  clock.mono += 1000; clock.wall += 1000 + 50000;
  const r = e.tick();
  assert.equal(r.away, null);
  close(e.S.totalGloom - g0, 1);
});

test('a larger forward jump is away time: at the away pace and under the cap', () => {
  const { e, clock } = running();
  const g0 = e.S.totalGloom;
  clock.mono += 1000; clock.wall += 1000 + 3600 * 1000;
  const r = e.tick();
  assert.notEqual(r.away, null);
  assert.equal(r.away.pace, 0.5);
  close(e.S.totalGloom - g0, 1 + 0.5 * 3600, 'one hour at half pace plus one second of step');
  const g1 = e.S.totalGloom;
  e.recalc();
  const gps = e.C.gps;   // the first hour earned an omen, so this is a little over 1
  clock.mono += 1000; clock.wall += 1000 + 1000 * 3600 * 1000;
  const r2 = e.tick();
  assert.equal(r2.away.credited, 8 * 3600);
  close(e.S.totalGloom - g1, gps * (1 + 0.5 * 8 * 3600));
});

test('winding the device clock forward and back again gains nothing extra', () => {
  const { e, clock } = running();
  const g0 = e.S.totalGloom;
  clock.mono += 1000; clock.wall += 1000 + 600 * 1000;
  e.tick();
  const afterForward = e.S.totalGloom - g0;
  clock.mono += 1000; clock.wall -= 600 * 1000;
  e.tick();
  assert.ok(e.S.debt > 0);
  clock.mono += 1000; clock.wall += 1000 + 600 * 1000;
  e.tick();
  assert.ok(e.S.totalGloom - g0 < afterForward * 2 + 5, 'the second pass over the same minutes paid out');
});

test('a jump back of more than 120 s creates debt', () => {
  const { e, clock, said } = running();
  clock.mono += 1000; clock.wall += 1000;
  e.tick();
  clock.mono += 1000; clock.wall -= 300 * 1000;
  e.tick();
  close(e.S.debt, 300, 'debt');
  assert.ok(said.some((m) => /clocks disagree/.test(m)));
});

test('a jump back of under 120 s is ignored', () => {
  const { e, clock } = running();
  clock.mono += 1000; clock.wall += 1000;
  e.tick();
  clock.mono += 1000; clock.wall -= 100 * 1000;
  e.tick();
  assert.equal(e.S.debt, 0);
});

test('debt is paid before any credit', () => {
  const { e, clock } = running();
  e.S.debt = 300;
  const g0 = e.S.totalGloom;
  clock.mono += 1000; clock.wall += 1000 + 199 * 1000;
  let r = e.tick();
  assert.equal(r.away, null, 'all 199 s went to debt');
  assert.equal(e.S.debt, 101 + 0);
  close(e.S.totalGloom - g0, 1, 'only the running second counted');
  clock.mono += 1000; clock.wall += 1000 + 199 * 1000;
  r = e.tick();
  assert.equal(e.S.debt, 0);
  assert.equal(r.away, null, 'under five minutes: credited with a Whisper, no report');
  close(e.S.totalGloom - g0, 2 + 0.5 * 98);
});

test('a long monotonic gap is credited as away time, not as play', () => {
  const { e, clock } = running();
  const g0 = e.S.totalGloom;
  clock.mono += 100 * 1000; clock.wall += 100 * 1000;
  const r = e.tick();
  assert.equal(r.away, null, 'a throttled tab never produces a report');
  close(e.S.totalGloom - g0, 100 * 0.5);
});

test('the realm saves every 15 seconds of running time', () => {
  const { e, clock, map } = running();
  assert.equal(map.has(e.KEY), false);
  clock.mono += 14000; clock.wall += 14000;
  e.tick();
  assert.equal(map.has(e.KEY), false);
  clock.mono += 2000; clock.wall += 2000;
  e.tick();
  assert.equal(map.has(e.KEY), true);
});

test('a halted engine neither ticks nor saves', () => {
  const { e, clock, map } = running();
  const g0 = e.S.totalGloom;
  e.halt();
  assert.equal(e.halted, true);
  clock.mono += 60000; clock.wall += 60000;
  const r = e.tick();
  assert.deepEqual({ away: r.away, ending: r.ending }, { away: null, ending: false });
  assert.equal(e.S.totalGloom, g0);
  assert.equal(e.save(), false);
  assert.equal(map.has(e.KEY), false);
});

test('the monotonic clock going backwards adds no time', () => {
  const { e, clock } = running();
  const g0 = e.S.totalGloom;
  clock.mono -= 5000;
  e.tick();
  assert.equal(e.S.totalGloom, g0);
});
