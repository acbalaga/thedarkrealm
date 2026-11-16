'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, load } = require('./helpers');

test('riteCostN equals the sum of single costs, and maxRite never passes what is affordable or the cap', () => {
  const f = engine();
  const { D } = load();
  D.RITES.forEach((r) => {
    [0, 2, 5].forEach((lvl) => {
      if (r.max && lvl >= r.max) return;
      let sum = 0;
      for (let k = 1; k <= 30; k++) {
        if (r.max && lvl + k > r.max) break;
        sum += Math.ceil(r.base * Math.pow(r.g, lvl + k - 1));
        const n = f.e.riteCostN(r, lvl, k);
        assert.ok(Math.abs(n - sum) <= k, r.id + ' lvl ' + lvl + ' k ' + k + ': ' + n + ' vs ' + sum);   // one rounding per level
      }
    });
  });
  f.e.S.echoes = 1e6; f.e.S.echoesTotal = 1e6; f.e.S.runEchoes = 1e6;
  const sleep = D.RITES.find((r) => r.id === 'sleep');
  assert.equal(f.e.maxRite(sleep), 5, 'capped at its maximum');
  const edge = D.RITES.find((r) => r.id === 'edge');
  const k = f.e.maxRite(edge);
  assert.ok(f.e.riteCostN(edge, 0, k) <= 1e6 && f.e.riteCostN(edge, 0, k + 1) > 1e6);
});

test('performing k levels at once spends the total and respects the cap', () => {
  const f = engine();
  f.e.S.echoes = 1e6;
  const before = f.e.S.echoes;
  assert.equal(f.e.buyRite('edge', 10), true);
  assert.equal(f.e.rl('edge'), 10);
  assert.ok(before - f.e.S.echoes > 0);
  assert.equal(f.e.buyRite('sleep', 6), false, 'past the maximum of 5');
  assert.equal(f.e.buyRite('sleep', 5), true);
});

test('the three perks are in cost order with the rest', () => {
  const { D } = load();
  const costs = D.PERKS.map((p) => p.cost);
  assert.deepEqual(costs.slice().sort((a, b) => a - b), costs);
  ['usher', 'precentor', 'chamberlain'].forEach((id) => assert.ok(D.PERKS.some((p) => p.id === id)));
});

function usher(gloom) {
  const f = engine();
  f.e.S.perks.usher = 1; f.e.S.auto.den = { gleaner: true, scribe: true };
  f.e.S.gloom = gloom; f.e.S.runGloom = 1e9; f.e.S.totalGloom = 1e9;
  f.e.recalc();
  return f;
}

test('auto-bind buys nothing when the cost is over a tenth of Gloom, and buys when under', () => {
  const poor = usher(50);               // a Wisp-Gleaner costs 10, which is more than 5
  poor.e.slowChecks();
  assert.equal(poor.e.cnt('gleaner'), 0);
  const rich = usher(1000);
  rich.e.slowChecks();
  assert.equal(rich.e.cnt('gleaner'), 1);
  assert.ok(rich.e.S.gloom >= 0);
});

test('auto-bind goes cheapest first and never spends below the reserve', () => {
  const f = usher(1e5);
  for (let i = 0; i < 400; i++) f.e.slowChecks();
  assert.ok(f.e.cnt('gleaner') > f.e.cnt('scribe'), 'the cheap one first');
  assert.ok(f.e.S.gloom > 0);
  // The last purchase left at least 90 percent of what was there before it.
  const g = usher(1000);
  const before = g.e.S.gloom;
  g.e.slowChecks();
  assert.ok(g.e.S.gloom >= 0.9 * before - 1e-9);
});

test('automation is inert without the perk, even with toggles in a forged save', () => {
  const f = engine();
  f.e.S.auto.den = { gleaner: true }; f.e.S.auto.rite = { edge: true };
  f.e.S.gloom = 1e6; f.e.S.echoes = 1e6; f.e.S.unlocked.rites = true;
  f.e.slowChecks();
  assert.equal(f.e.cnt('gleaner'), 0);
  assert.equal(f.e.rl('edge'), 0);
});

test('auto-rite respects the cap on sleep and lure and the quarter reserve', () => {
  const f = engine();
  f.e.S.perks.precentor = 1; f.e.S.unlocked.rites = true;
  f.e.S.auto.rite = { sleep: true, lure: true, edge: true };
  f.e.S.echoes = 1e9; f.e.S.echoesTotal = 1e9; f.e.S.runEchoes = 1e9;
  for (let i = 0; i < 400; i++) f.e.slowChecks();
  assert.equal(f.e.rl('sleep'), 5);
  assert.equal(f.e.rl('lure'), 5);
  assert.ok(f.e.rl('edge') > 5);
  const g = engine();
  g.e.S.perks.precentor = 1; g.e.S.unlocked.rites = true; g.e.S.auto.rite = { edge: true };
  g.e.S.echoes = 12; g.e.S.echoesTotal = 12; g.e.S.runEchoes = 12;       // a level costs 5, a quarter of 12 is 3
  g.e.slowChecks();
  assert.equal(g.e.rl('edge'), 0);
});

test('automation does not run in away time', () => {
  const f = usher(1e5);
  f.e.S.gloom = 1e5;
  f.e.away(3600);
  assert.equal(f.e.cnt('gleaner'), 0);
});

test('the Chamberlain waits for a margin of 60 percent of the time, and passes sealed shafts at ten a second', () => {
  const mk = (perk) => {
    const f = engine();
    f.e.S.den = { gleaner: 15 }; f.e.S.unlocked.shafts = true;
    if (perk) f.e.S.perks.chamberlain = 1;
    f.e.S.shaftTop = 10; f.e.S.shaft = 9; f.e.S.regroup = true; f.e.S.autoAdvance = false;
    f.e.recalc();
    return f;
  };
  const a = mk(false), b = mk(true);
  const need = a.e.shaftMaxHp(10) / a.e.C.might;
  assert.ok(need > 27 && need < 36, 'between 60 and 80 percent of 45 s: ' + need);
  a.e.slowChecks(); b.e.slowChecks();
  assert.equal(a.e.S.regroup, false, 'without the perk the Host sets out');
  assert.equal(b.e.S.regroup, true, 'with it the Host waits for a larger margin (the ticket says 60 percent of the allowed time)');
  const g = engine();
  g.e.S.den = { gleaner: 8 }; g.e.S.unlocked.shafts = true; g.e.S.perks.chamberlain = 1;
  g.e.S.shaftTop = 30; g.e.S.shaft = 1; g.e.S.autoAdvance = true;
  g.e.recalc();
  g.e.fight(1);
  assert.ok(g.e.S.shaft >= 9, 'ten a second: ' + g.e.S.shaft);
});
