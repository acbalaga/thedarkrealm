'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { simulate } = require('../tools/sim.js');

/* Present seconds the casual policy needs before an Unlighting first yields Nightglass, from
   docs/design/balance-baseline.md (seed 1). If a change moves this on purpose, run
   `npm run sim -- --policy casual --days 3 --seed 1 --json`, read the milestone, and update
   this number in the same PR as a deliberate decision. Do not widen the window to make a
   failing test pass. */
const BASELINE_FIRST_YIELD_PRESENT_SEC = 905;
const WINDOW = 0.25;

test('casual: the first Unlighting becomes possible inside the baseline window', () => {
  const t0 = Date.now();
  const r = simulate({ policy: 'casual', days: 3, seed: 1 });
  assert.ok(Date.now() - t0 < 10000, 'three simulated days must finish in under 10 seconds');
  const m = r.milestones.find((x) => /^Unlighting first possible/.test(x.name));
  assert.ok(m, 'the milestone was not reached in 3 days');
  assert.ok(m.present >= BASELINE_FIRST_YIELD_PRESENT_SEC * (1 - WINDOW), 'arrives earlier than the baseline window: ' + m.present);
  assert.ok(m.present <= BASELINE_FIRST_YIELD_PRESENT_SEC * (1 + WINDOW), 'arrives later than the baseline window: ' + m.present);
});

test('the same seed gives the same run', () => {
  const a = JSON.stringify(simulate({ policy: 'casual', days: 1, seed: 7 }));
  const b = JSON.stringify(simulate({ policy: 'casual', days: 1, seed: 7 }));
  assert.strictEqual(a, b);
});

test('a different seed gives a different run', () => {
  const a = JSON.stringify(simulate({ policy: 'active', days: 1, seed: 1 }));
  const b = JSON.stringify(simulate({ policy: 'active', days: 1, seed: 2 }));
  assert.notStrictEqual(a, b);
});
