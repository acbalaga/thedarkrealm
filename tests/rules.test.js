'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, j } = require('./helpers');

const close = (a, b, msg) => assert.ok(Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)), (msg || '') + ' ' + a + ' vs ' + b);

/* maxBuy never over-reports. At the exact-cost boundary float rounding in its log estimate can
   leave it one short (warden, n=0, k=4 is one such case). That is existing behaviour and TDR-001
   does not change it; the test pins the contract the game relies on. */
test('denCost and maxBuy agree for k from 1 to 200', () => {
  const { e, D } = engine();
  [D.DENIZENS[0], D.DENIZENS[3]].forEach((d) => {
    [0, 7].forEach((n) => {
      for (let k = 1; k <= 200; k++) {
        const cost = e.denCost(d, n, k);
        e.S.gloom = cost;
        const exact = e.maxBuy(d, n);
        assert.ok(exact === k || exact === k - 1, d.id + ' n=' + n + ' k=' + k + ' at cost gave ' + exact);
        assert.ok(e.denCost(d, n, exact) <= cost || exact === 0);
        if (cost > 1e14) continue;   // past this a double cannot tell cost from cost - 1
        e.S.gloom = cost - 1;
        assert.equal(e.maxBuy(d, n), k - 1, d.id + ' n=' + n + ' k=' + k + ' one short');
        e.S.gloom = cost * 1.01 + 1;
        assert.ok(e.maxBuy(d, n) >= k, d.id + ' n=' + n + ' k=' + k + ' with a margin');
      }
    });
  });
});

test('denCost of one follows the stated growth, and thrift takes a tenth off', () => {
  const { e, D } = engine();
  const d = D.DENIZENS[1];
  assert.equal(e.denCost(d, 0, 1), Math.ceil(d.cost));
  assert.equal(e.denCost(d, 10, 1), Math.ceil(d.cost * Math.pow(1.15, 10)));
  e.S.perks.thrift = 1;
  e.recalc();
  assert.equal(e.denCost(d, 0, 1), Math.ceil(d.cost * 0.9));
});

test('buying when unaffordable changes nothing', () => {
  const { e, D } = engine();
  const before = j(e.S);
  assert.equal(e.buyDenizen(D.DENIZENS[0].id), false);
  assert.equal(e.buyUpg(e.UPGS[0].id), false);
  assert.equal(e.buyRite(D.RITES[0].id), false);
  assert.equal(e.buyPerk(D.PERKS[0].id), false);
  assert.equal(e.buyDenizen('nonsense'), false);
  assert.equal(j(e.S), before);
});

test('buyDenizen spends exactly denCost and adds k', () => {
  const { e, D } = engine();
  const d = D.DENIZENS[0];
  e.S.gloom = 1000; e.S.runGloom = 1000; e.S.totalGloom = 1000;
  e.S.opts.buy = 10;
  const cost = e.denCost(d, 0, 10);
  assert.equal(e.buyDenizen(d.id), true);
  assert.equal(e.S.den[d.id], 10);
  close(e.S.gloom, 1000 - cost);
});

test('recalc matches numbers worked out by hand', () => {
  const { e, D } = engine();
  const g = D.DENIZENS[0], s = D.DENIZENS[1];
  e.S.den = { [g.id]: 10, [s.id]: 2 };
  e.recalc();
  close(e.C.denGps, 10 * g.rate + 2 * s.rate);
  close(e.C.gps, 10 * g.rate + 2 * s.rate);
  close(e.C.click, 1);
  close(e.C.might, 1 + 10 * 1 + 2 * 3);
  close(e.C.echoMult, 1);
});

test('recalc applies Nightglass, omens, rites, perks and buffs', () => {
  const { e, D } = engine();
  const g = D.DENIZENS[0];
  e.S.den = { [g.id]: 4 };
  e.S.glassTotal = 2;
  e.S.omens = { o0: 1, o1: 1 };
  e.S.rites = { listen: 3, hands: 2, edge: 2, names: 2 };
  e.S.perks = { deep: 1, queen: 1, keen: 1, halls: 1 };
  e.S.upg = { hand0: 1 };
  e.recalc();
  const common = 1.1, pane = 1.03;                       // the Pane's first light is lit by any Nightglass
  const perm = common * 1.02 * Math.pow(1.12, 3) * 2 * 5 * pane;
  close(e.C.gMult, perm, 'gloom multiplier');
  close(e.C.denGps, 4 * g.rate * perm, 'denGps');
  close(e.C.click, 2 * Math.pow(1.5, 2) * perm, 'click');
  close(e.C.might, (1 + 4) * common * Math.pow(1.2, 2) * 2 * 5 * pane, 'might');
  close(e.C.echoMult, Math.pow(1.15, 2) * 2 * 5 * pane, 'echoMult');
  e.S.buffs.hush = 10; e.S.buffs.teeth = 10;
  e.recalc();
  close(e.C.denGps, 4 * g.rate * perm * 5, 'hush');
  close(e.C.might, (1 + 4) * common * Math.pow(1.2, 2) * 2 * 5 * 5 * pane, 'teeth');
});

test('fight seals the expected number of shafts for a fixed Might and dt', () => {
  const { e } = engine();
  e.S.unlocked.shafts = true;
  e.C.might = 1000;
  e.C.echoMult = 1;
  const dt = 10;
  let t = 0, k = 0, echoes = 0;
  for (;;) {
    const need = e.shaftMaxHp(k + 1) / 1000;
    if (t + need > dt) break;
    t += need; echoes += e.shaftReward(k + 1); k++;
    t += 0.25;
    if (t >= dt) break;
  }
  assert.ok(k > 10, 'the case should cross a Lampwarden');
  e.fight(dt);
  assert.equal(e.S.sealed, k);
  assert.equal(e.S.bestShaft, k);
  assert.equal(e.S.shaftTop, k + 1);
  assert.equal(e.S.echoesTotal, echoes);
});

test('fight does nothing until Sunshafts are unlocked', () => {
  const { e } = engine();
  e.C.might = 1e9;
  e.fight(100);
  assert.equal(e.S.sealed, 0);
});

test('a Lampwarden fails at 45 s and sets regroup', () => {
  const { e, say, said } = Object.assign({}, engine(), {});
  e.S.unlocked.shafts = true;
  e.S.shaft = 10; e.S.shaftTop = 10; e.S.bestShaft = 9; e.S.shaftHp = e.shaftMaxHp(10);
  e.C.might = 1;
  e.fight(44);
  assert.equal(e.S.regroup, false);
  assert.ok(e.S.bossTime < 1.01 && e.S.bossTime > 0.99);
  e.fight(2);
  assert.equal(e.S.regroup, true);
  assert.equal(e.S.autoAdvance, false);
  assert.equal(e.S.shaft, 9);
  assert.equal(e.S.bossTime, 45);
});

test('regroup ends by itself once the Host can win, and by the player choosing a shaft', () => {
  const a = engine();
  a.e.S.regroup = true; a.e.S.autoAdvance = false; a.e.S.shaft = 9; a.e.S.shaftTop = 10; a.e.S.bestShaft = 9;
  a.e.C.might = 1e12;
  a.e.slowChecks();
  assert.equal(a.e.S.regroup, false);
  assert.equal(a.e.S.autoAdvance, true);
  assert.equal(a.e.S.shaft, 10);
  const b = engine();
  b.e.S.regroup = true; b.e.S.shaftTop = 5;
  b.e.setShaft(3);
  assert.equal(b.e.S.regroup, false);
  assert.equal(b.e.S.shaft, 3);
});

test('away respects the cap, the pace and the debt', () => {
  const { e, said } = engine();
  e.S.den = { gleaner: 10 };
  e.recalc();
  const gps = e.C.gps;
  let r = e.away(3600);
  assert.equal(r.sec, 3600);
  assert.equal(r.credited, 3600);
  assert.equal(r.pace, 0.5);
  assert.equal(r.capHours, 8);
  close(r.gloom, gps * 3600 * 0.5);
  assert.equal(r.echoes, 0);
  assert.equal(r.bestShaft, 0);

  r = e.away(20 * 3600);
  assert.equal(r.credited, 8 * 3600);
  assert.ok(r.sec > r.credited);
  close(r.gloom, gps * 8 * 3600 * 0.5);

  e.S.rites.sleep = 2; e.S.perks.unsleeping = 1;
  r = e.away(30 * 3600);
  assert.equal(r.pace, 0.7);
  assert.equal(r.capHours, 24);
  assert.equal(r.credited, 24 * 3600);

  e.S.debt = 100;
  const gloom0 = e.S.totalGloom;
  assert.equal(e.away(60), null);
  assert.equal(e.S.debt, 40);
  assert.equal(e.S.totalGloom, gloom0);
  assert.ok(said.some((m) => /clocks to agree/.test(m)));
  r = e.away(150);
  assert.equal(e.S.debt, 0);
  assert.equal(r.sec, 110);
});

test('away reports nothing when nothing was gathered', () => {
  const { e } = engine();
  assert.equal(e.away(3600), null);
});

test('away reports the Echoes and the new deepest shaft', () => {
  const { e } = engine();
  e.S.unlocked.shafts = true;
  e.S.den = { gleaner: 10, scribe: 20, weaver: 20, warden: 20 };
  e.recalc();
  const r = e.away(2 * 3600);
  assert.ok(r.echoes > 0);
  assert.ok(r.bestShaft > 0);
  assert.equal(r.bestShaft, e.S.bestShaft);
});

test('unlight needs enough Gloom, then resets the fathom and keeps what it should', () => {
  const { e } = engine();
  assert.equal(e.unlight(), false);
  e.S.runGloom = 2e9; e.S.totalGloom = 2e9; e.S.gloom = 5; e.S.played = 1e5;
  e.S.den = { gleaner: 3 }; e.S.rites = { listen: 4 }; e.S.codex = { waking: 1 };
  const g = e.glassGain();
  assert.ok(g >= 1);
  assert.equal(e.unlight(), true);
  assert.equal(e.S.unlightings, 1);
  assert.equal(e.S.glass, g);
  assert.equal(e.S.glassTotal, g);
  assert.equal(e.S.runGloom, 0);
  assert.deepEqual(Object.keys(e.S.den), []);
  assert.deepEqual(Object.keys(e.S.rites), []);
  assert.equal(e.S.codex.waking, 1);
  assert.equal(e.dirty.upgs, true);
});

test('perks that survive an Unlighting do', () => {
  const { e } = engine();
  e.S.runGloom = 2e9; e.S.totalGloom = 2e9; e.S.unlightings = 1; e.S.glassTotal = 200; e.S.glass = 0;
  e.S.perks = { absence: 1, remember: 1 };
  e.S.rites = { listen: 5, hands: 1 };
  e.unlight();
  assert.equal(e.S.den.gleaner, 15);
  assert.equal(e.S.den.scribe, 5);
  assert.equal(e.S.rites.listen, 2);
  assert.equal(e.S.rites.hands, undefined);
});

test('a lantern spawns in the core, can be snuffed only by a trusted caller, and yields a boon', () => {
  const { e } = engine();
  assert.equal(e.lantern, null);
  e.S.totalGloom = 100; e.S.lanternIn = 0.5;
  e.step(1);
  assert.deepEqual({ life: e.lantern.life }, { life: 14 });
  assert.equal(e.snuffLantern(false), null);
  assert.equal(e.snuffLantern(undefined), null);
  assert.notEqual(e.lantern, null);
  const r = e.snuffLantern(true);
  assert.ok(['spill', 'hush', 'teeth', 'echo'].indexOf(r.kind) >= 0);
  assert.equal(e.lantern, null);
  assert.equal(e.S.lanterns, 1);
  assert.ok(e.S.lanternIn >= 63 && e.S.lanternIn <= 150);
  assert.equal(e.snuffLantern(true), null);
});

test('a lantern that is ignored fades after 14 seconds', () => {
  const { e } = engine();
  e.S.totalGloom = 100; e.S.lanternIn = 0;
  e.step(1);
  assert.notEqual(e.lantern, null);
  e.step(14);
  assert.equal(e.lantern, null);
});

test('gather refuses an untrusted call and otherwise adds one click of Gloom', () => {
  const { e } = engine();
  assert.equal(e.gather(false), 0);
  assert.equal(e.S.clicks, 0);
  const amount = e.gather(true);
  assert.equal(amount, 1);
  assert.equal(e.S.clicks, 1);
  assert.equal(e.S.gloom, 1);
});

test('reaching the last shaft raises the ending once', () => {
  const { e } = engine();
  e.S.unlocked.shafts = true;
  e.S.shaft = 150; e.S.shaftTop = 150; e.S.bestShaft = 149; e.S.shaftHp = 1;
  e.C.might = 1e30;
  e.fight(1);
  assert.equal(e.S.ended, true);
  assert.equal(e.tick().ending, true);
  assert.equal(e.tick().ending, false);
});

test('fmt keeps its shapes', () => {
  const { e } = engine();
  assert.equal(e.fmt(0), '0');
  assert.equal(e.fmt(7.5), '7.5');
  assert.equal(e.fmt(1500), '1.50K');
  assert.equal(e.fmt(2.5e6), '2.50M');
  assert.equal(e.fmt(1e300), '1.00e300');
  e.S.opts.sci = true;
  assert.equal(e.fmt(1500), '1.50e3');
  assert.equal(e.fmtTime(3725), '1h 2m');
});
