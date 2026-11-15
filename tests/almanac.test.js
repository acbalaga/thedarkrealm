'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, load } = require('./helpers');

const at = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h || 12, mi || 0).getTime();
const utc = (y, mo, d, h, mi) => Date.UTC(y, mo - 1, d, h || 0, mi || 0);
const near = (a, b, tol) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b)) <= tol;

test('moon phase: known new and full moons', () => {
  const { e } = engine();
  assert.ok(near(e.moonPhase(utc(2000, 1, 6, 18, 14)), 0, 0.001));
  assert.ok(near(e.moonPhase(utc(2000, 1, 21, 4, 40)), 0.5, 0.03));
  assert.ok(near(e.moonPhase(utc(2024, 4, 8, 18, 21)), 0, 0.03), 'new moon of the April 2024 eclipse');
  assert.ok(near(e.moonPhase(utc(2024, 10, 2, 18, 49)), 0, 0.03), 'new moon of the October 2024 eclipse');
});

test('moon names cover the circle', () => {
  const { e } = engine();
  assert.equal(e.moonName(0), 'New moon');
  assert.equal(e.moonName(0.25), 'First quarter');
  assert.equal(e.moonName(0.5), 'Full moon');
  assert.equal(e.moonName(0.75), 'Last quarter');
  assert.equal(e.moonName(0.99), 'New moon');
});

test('moonless and lidless windows follow the phase', () => {
  const { e } = engine();
  const base = utc(2000, 1, 6, 18, 14), day = 86400000;
  assert.equal(e.moonEvent(base), 'moonless');
  assert.equal(e.moonEvent(base + 14.77 * day), 'lidless');
  assert.equal(e.moonEvent(base + 7 * day), null);
  assert.equal(e.moonEvent(base + 29.53 * day - 0.5 * day), 'moonless');
});

test('solstice and equinox windows at their first and last local minute', () => {
  const { e } = engine();
  const has = (ms, id) => e.datedEvents(ms).includes(id);
  assert.equal(has(at(2026, 12, 20, 0, 0), 'longestnight'), true);
  assert.equal(has(at(2026, 12, 22, 23, 59), 'longestnight'), true);
  assert.equal(has(at(2026, 12, 19, 23, 59), 'longestnight'), false);
  assert.equal(has(at(2026, 12, 23, 0, 0), 'longestnight'), false);
  assert.equal(has(at(2026, 6, 20, 0, 0), 'longestday'), true);
  assert.equal(has(at(2026, 6, 22, 23, 59), 'longestday'), true);
  assert.equal(has(at(2026, 3, 19, 0, 0), 'balance'), true);
  assert.equal(has(at(2026, 3, 21, 23, 59), 'balance'), true);
  assert.equal(has(at(2026, 9, 21, 0, 0), 'balance'), true);
  assert.equal(has(at(2026, 9, 23, 23, 59), 'balance'), true);
  assert.equal(has(at(2026, 9, 24, 0, 0), 'balance'), false);
});

test('effects: Longest Night doubles Gloom on top of Night, and every event is a bonus', () => {
  const { e } = engine();
  const ms = at(2026, 12, 21, 22, 0);
  const fx = e.skyEffects(ms);
  assert.ok(Math.abs(fx.gloom - 2.5) < 1e-9, 'x2 and x1.25');
  Object.values(fx).forEach((v) => assert.ok(v >= 1));
  assert.ok(Math.abs(e.skyEffects(at(2026, 6, 21, 12, 0)).echo - 2.5) < 1e-9, 'Longest Day by day: x2 and x1.25');
});

test('the combined ceiling holds at x3 per channel, with a petition-like factor sharing it', () => {
  const { e } = engine();
  const fx = e.skyEffects(at(2026, 12, 21, 22, 0), { gloom: 2 });
  assert.equal(fx.gloom, 3);
  assert.equal(e.skyEffects(at(2026, 12, 21, 22, 0), { gloom: 1.1 }).gloom < 3, true);
});

test('Moonless Night raises Nightglass; Lidless Moon doubles Lampwarden Echoes only, and only while present', () => {
  const base = utc(2000, 1, 6, 18, 14);
  const f = engine({ sky: true, wall: base + 14.77 * 86400000 });
  f.e.S.unlocked.shafts = true; f.e.recalc();
  assert.equal(f.e.C.lidless, true);
  const boss = f.e.shaftReward(10), plain = f.e.shaftReward(9);
  f.e.C.lidless = false;
  assert.equal(boss, f.e.shaftReward(10) * 2);
  f.e.C.lidless = true;
  assert.equal(f.e.shaftReward(9), plain);
  const away = engine({ sky: true, wall: base + 14.77 * 86400000 });
  away.e.S.unlocked.shafts = true;
  away.e.recalc({ present: false, wall: away.clock.wall });
  assert.equal(away.e.C.lidless, false);
  const m = engine({ sky: true, wall: base + 0.2 * 86400000 });
  m.e.S.unlocked.shafts = true; m.e.S.runGloom = 1e12; m.e.recalc();
  const plainGain = Math.floor(Math.pow(1e12 / 1e9, m.e.GLASS_EXP));
  assert.equal(m.e.glassGain(), Math.floor(Math.pow(1e12 / 1e9, m.e.GLASS_EXP) * 1.1));
  assert.ok(m.e.glassGain() >= plainGain);
});

function onDay(date) {
  const f = engine({ sky: true, wall: date });
  f.e.S.unlocked.shafts = true; f.e.S.den = { choir: 1 };
  f.e.recalc();
  return f;
}
function look(f) { f.clock.mono += 1000; f.clock.wall += 1000; f.e.tick(); }

test('an eclipse is witnessed once, gives +2 percent to Gloom, Might and Echoes, and multiplies the Choir by 10 that day', () => {
  const f = onDay(at(2027, 8, 2, 12, 0));
  look(f);
  assert.equal(f.e.eclipseCount(), 1);
  assert.ok(f.e.S.sky.eclipses.e2027b);
  look(f); look(f);
  assert.equal(f.e.eclipseCount(), 1, 'once');
  const g = engine({ sky: true, wall: at(2027, 8, 3, 12, 0) });
  g.e.S.unlocked.shafts = true; g.e.S.den = { choir: 1 }; g.e.S.sky.eclipses = { e2027b: 1 };
  g.e.recalc();
  const h = engine({ sky: true, wall: at(2027, 8, 3, 12, 0) });
  h.e.S.unlocked.shafts = true; h.e.S.den = { choir: 1 }; h.e.recalc();
  assert.ok(Math.abs(g.e.C.mods.gloom / h.e.C.mods.gloom - 1.02) < 1e-9);
  assert.ok(Math.abs(g.e.C.mods.might / h.e.C.mods.might - 1.02) < 1e-9);
  const on = onDay(at(2027, 8, 2, 12, 0));
  assert.equal(on.e.C.mods.den.choir, 10);
});

test('the eleventh eclipse changes nothing: the bonus stops at ten', () => {
  const { D } = load();
  const f = engine({ sky: true });
  f.e.S.unlocked.shafts = true;
  D.SKY.ECLIPSES.slice(0, 11).forEach((x) => { f.e.S.sky.eclipses[x.id] = 1; });
  f.e.recalc();
  const ten = engine({ sky: true });
  ten.e.S.unlocked.shafts = true;
  D.SKY.ECLIPSES.slice(0, 10).forEach((x) => { ten.e.S.sky.eclipses[x.id] = 1; });
  ten.e.recalc();
  assert.equal(f.e.C.mods.gloom, ten.e.C.mods.gloom);
  assert.ok(Math.abs(f.e.C.mods.gloom / 1.2 - 1) < 0.3);
});

test('eclipse dates carry only confirmed entries, and 2035-09-02 is not among them', () => {
  const { D } = load();
  assert.equal(D.SKY.ECLIPSES.some((x) => x.date === '2035-09-02'), false);
  assert.equal(D.SKY.ECLIPSES.length, 12);
  D.SKY.ECLIPSES.forEach((x) => assert.match(x.date, /^20(2[7-9]|3[0-5])-\d\d-\d\d$/));
});

test('seen flags, Whispers and the omens follow the events', () => {
  const f = engine({ sky: true, wall: at(2026, 12, 19, 23, 59, 50) });
  f.e.S.unlocked.shafts = true;
  look(f);
  f.clock.wall = at(2026, 12, 20, 0, 0); look(f);
  assert.equal(f.e.S.sky.seen.longestnight, 1);
  assert.ok(f.said.includes('The Longest Night. The Gleaners have put down their hooks to listen.'));
  assert.equal(f.e.OMENS.find((o) => o.name === 'The Holiday').cond(), true);
  assert.equal(f.e.OMENS.find((o) => o.name === 'Sung Through').cond(), false);
});

test('Coming lists the next dated things in order and never a past date', () => {
  const { e } = engine();
  const now = at(2026, 11, 15, 12, 0);
  const list = e.nextEvents(now, 6);
  assert.equal(list.length, 6);
  for (let i = 1; i < list.length; i++) assert.ok(list[i].at >= list[i - 1].at);
  list.forEach((x) => { assert.ok(x.at > now); assert.ok(x.days >= 1); });
  assert.ok(list.some((x) => x.id === 'longestnight'), 'the Longest Night is a month away');
  const d = e.nextEvents(at(2027, 7, 20, 12, 0), 6).find((x) => x.id === 'e2028b' || x.id === 'e2027b');
  assert.ok(d && d.name === 'The Performance');
});

test('the Almanac data names today and counts what has been seen', () => {
  const f = engine({ sky: true, wall: at(2026, 12, 21, 22, 0) });
  f.e.S.unlocked.shafts = true;
  const a = f.e.almanac(at(2026, 12, 21, 22, 0));
  assert.ok(a.events.some((x) => x.id === 'longestnight'));
  assert.equal(a.eclipses.length, 12);
  assert.ok(a.moonName.length > 3);
});

test('the sixteen sky pages of the lore bible unlock from their facts', () => {
  const f = engine({ sky: true, wall: at(2026, 12, 21, 22, 0) });
  f.e.S.unlocked.shafts = true; f.e.S.codex = {};
  look(f);
  f.e.slowChecks();
  assert.ok(f.e.S.codex.longestnight);
  assert.ok(f.e.S.codex.surfaceclock);
  assert.equal(f.e.S.codex.performance, undefined);
});
