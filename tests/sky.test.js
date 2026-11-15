'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./helpers');

const at = (h, m, day) => new Date(2026, 5, day || 10, h, m).getTime();   // local time, so the tests do not depend on the time zone

test('phaseAt at every boundary minute and across midnight', () => {
  const { e } = engine();
  const cases = [[4, 59, 'night'], [5, 0, 'dawn'], [7, 59, 'dawn'], [8, 0, 'day'], [16, 59, 'day'], [17, 0, 'dusk'], [19, 59, 'dusk'], [20, 0, 'night'],
    [23, 59, 'night'], [0, 0, 'night'], [2, 30, 'night']];
  cases.forEach(([h, m, id]) => assert.equal(e.phaseAt(at(h, m)).id, id, h + ':' + m));
});

test('endsAt is the next boundary, including Night ending at 05:00 the next day', () => {
  const { e } = engine();
  assert.equal(e.phaseAt(at(4, 59)).endsAt, at(5, 0));
  assert.equal(e.phaseAt(at(5, 0)).endsAt, at(8, 0));
  assert.equal(e.phaseAt(at(12, 0)).endsAt, at(17, 0));
  assert.equal(e.phaseAt(at(18, 0)).endsAt, at(20, 0));
  assert.equal(e.phaseAt(at(21, 0)).endsAt, at(5, 0, 11), 'Night after 20:00 ends at 05:00 the next morning');
  assert.equal(e.phaseAt(at(2, 0)).endsAt, at(5, 0), 'and after midnight at 05:00 the same morning');
});

function sky(f, h, m) {
  f.clock.wall = at(h, m);
  f.e.S.unlocked.shafts = true;
  f.e.S.den = { gleaner: 10 };
  f.e.recalc();
}

test('each phase gives its own bonus on its own channel, while present', () => {
  const base = engine({ sky: true });
  base.e.S.unlocked.shafts = true; base.e.S.den = { gleaner: 10 };
  const plain = engine({ sky: false });
  plain.e.S.unlocked.shafts = true; plain.e.S.den = { gleaner: 10 }; plain.e.recalc();
  const g0 = plain.e.C.gps, e0 = plain.e.C.echoMult;
  const night = engine({ sky: true }); sky(night, 22, 0);
  assert.ok(Math.abs(night.e.C.gps / g0 - 1.25) < 1e-9, 'Night: Gloom x1.25');
  const day = engine({ sky: true }); sky(day, 12, 0);
  assert.ok(Math.abs(day.e.C.echoMult / e0 - 1.25) < 1e-9, 'Day: Echoes x1.25');
  assert.ok(Math.abs(day.e.C.gps / g0 - 1) < 1e-9);
  const dawn = engine({ sky: true }); sky(dawn, 6, 0);
  assert.equal(dawn.e.C.mods.lanternRate, 2);
  const dusk = engine({ sky: true }); sky(dusk, 18, 0);
  assert.equal(dusk.e.C.mods.lanternRate, 2);
});

test('nothing applies before Sunshafts unlock, and the strip is inactive', () => {
  const f = engine({ sky: true });
  f.clock.wall = at(22, 0);
  f.e.S.den = { gleaner: 10 }; f.e.recalc();
  assert.equal(f.e.C.mods.gloom, 1);
  assert.equal(f.e.skyInfo(at(22, 0)).active, false);
});

test('away pay never includes sky bonuses: an away at 02:00 equals one at 12:00', () => {
  const f = engine({ sky: true }); sky(f, 2, 0);
  const g = engine({ sky: true }); sky(g, 12, 0);
  const a = f.e.away(3600), b = g.e.away(3600);
  assert.equal(a.gloom, b.gloom);
  assert.equal(a.echoes, b.echoes);
});

test('the strip data names the phase, its effect and the next phase with the time to it', () => {
  const f = engine({ sky: true }); sky(f, 21, 0);
  const i = f.e.skyInfo(at(21, 0));
  assert.equal(i.name, 'Night above');
  assert.equal(i.effectText, 'Gloom ×1.25');
  assert.equal(i.nextName, 'dawn');
  assert.equal(i.inSec, 8 * 3600);
});

test('phase flags are set only when present, and the four omens follow', () => {
  const f = engine({ sky: true });
  f.e.S.unlocked.shafts = true; f.e.S.den = { gleaner: 1 };
  const names = ['Kept the Night', 'Saw Them Wake', 'Worked the Day Shift', 'Saw Them Sleep'];
  const cond = (n) => f.e.OMENS.find((o) => o.name === n).cond();
  names.forEach((n) => assert.equal(cond(n), false));
  [[22, 'night'], [6, 'dawn'], [12, 'day'], [18, 'dusk']].forEach(([h, id], i) => {
    f.clock.wall = at(h, 0); f.clock.mono += 1000; f.e.tick();
    assert.equal(f.e.S.sky.phases[id], 1, id);
    assert.equal(cond(names[i]), true);
  });
  const g = engine({ sky: true });
  g.e.S.unlocked.shafts = true; g.clock.wall = at(12, 0);
  g.e.away(7200);
  assert.equal(g.e.S.sky.phases.day, 0, 'an absence is not time on the seat');
});

test('a Whisper marks a phase change while the game is open', () => {
  const f = engine({ sky: true });
  f.e.S.unlocked.shafts = true;
  f.clock.wall = at(7, 59); f.clock.mono += 1000; f.e.tick();
  f.clock.wall = at(8, 0); f.clock.mono += 1000; f.e.tick();
  assert.ok(f.said.includes('Day above. The chains are busy.'));
});

test('the Surface Clock page unlocks with Sunshafts', () => {
  const f = engine({ sky: true });
  f.e.S.codex = {};
  f.e.slowChecks();
  assert.equal(f.e.S.codex.surfaceclock, undefined);
  f.e.S.unlocked.shafts = true;
  f.e.slowChecks();
  assert.ok(f.e.S.codex.surfaceclock);
});

test('phase flags are adopted against the four known ids only', () => {
  const { e } = engine();
  const s = e.adopt({ sky: { phases: { night: 1, bogus: 1, dawn: 'yes' } } });
  assert.equal(s.sky.phases.night, 1);
  assert.equal(s.sky.phases.bogus, undefined);
  assert.equal(s.sky.phases.day, 0);
});
