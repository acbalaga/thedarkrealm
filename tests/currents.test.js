'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, load } = require('./helpers');

function ready(unl) {
  const f = engine();
  const S = f.e.S;
  S.unlightings = unl || 0; S.glassTotal = unl ? 40 : 0; S.glass = 0;
  S.played = 1e6; S.runGloom = 1e12; S.totalGloom = 1e12; S.gloom = 5e11;
  f.e.recalc();
  return f;
}

test('the offer for a seed and an Unlighting count is stable and always contains Still', () => {
  const f = ready(2);
  const a = f.e.currentOffer().map((c) => c.id).join();
  assert.equal(a, f.e.currentOffer().map((c) => c.id).join());
  assert.equal(f.e.currentOffer()[0].id, 'still');
  assert.equal(new Set(f.e.currentOffer().map((c) => c.id)).size, 3, 'three distinct');
  const text = f.e.exportText();
  const g = engine(); g.e.importText(text);
  assert.equal(g.e.currentOffer().map((c) => c.id).join(), a, 'a reload shows the same three');
  const h = ready(3); h.e.S.seed = f.e.S.seed;
  assert.equal(h.e.currentOffer().length, 3);
});

test('the first Unlighting has no choice and starts a Still fathom', () => {
  const f = ready(0);
  assert.equal(f.e.unlight('narrow'), true);
  assert.equal(f.e.S.current, 'still');
  assert.equal(f.e.S.currentChoices, 0);
});

test('from the second Unlighting on a choice is made, only from the offer, and its line is whispered', () => {
  const f = ready(1);
  const offer = f.e.currentOffer();
  const pick = offer[1].id;
  assert.equal(f.e.unlight('not-in-the-offer-' + pick), false);
  assert.equal(f.e.unlight(pick), true);
  assert.equal(f.e.S.current, pick);
  assert.equal(f.e.S.currentChoices, 1);
  assert.ok(f.said.includes(offer[1].line));
  assert.equal(f.e.S.fathoms.length, 1);
  assert.equal(f.e.S.fathoms[0].current, 'still');
});

test('adopt turns an unknown id, or any save before the first Unlighting, into Still', () => {
  const { e } = engine();
  assert.equal(e.adopt({ current: 'nonsense', unlightings: 3, glassTotal: 9 }).current, 'still');
  assert.equal(e.adopt({ current: 'narrow', unlightings: 0 }).current, 'still');
  assert.equal(e.adopt({ current: 'narrow', unlightings: 3, glassTotal: 9 }).current, 'narrow');
});

function withCurrent(id) {
  const f = engine();
  f.e.S.unlightings = 2; f.e.S.glassTotal = 20; f.e.S.current = id;
  f.e.S.den = { tide: 10, gleaner: 10 }; f.e.S.unlocked.shafts = true;
  f.e.recalc();
  return f;
}

test('each current reaches the numbers: narrow cost, silted Tidewells, hollow boss timer, lit away pace', () => {
  const still = withCurrent('still'), narrow = withCurrent('narrow'), silted = withCurrent('silted'), hollow = withCurrent('hollow'), lit = withCurrent('lit');
  const { D } = load();
  const d = D.DENIZENS[1];
  assert.equal(narrow.e.denCost(d, 5, 1), Math.ceil(still.e.denCost(d, 5, 1) * 0.75 - 1e-9) === narrow.e.denCost(d, 5, 1) ? narrow.e.denCost(d, 5, 1) : Math.ceil(d.cost * 0.75 * Math.pow(1.15, 5)));
  assert.ok(narrow.e.denCost(d, 5, 1) < still.e.denCost(d, 5, 1));
  assert.ok(Math.abs(narrow.e.C.might / still.e.C.might - 0.6) < 1e-9);
  assert.ok(Math.abs(silted.e.C.denOut.tide / still.e.C.denOut.tide - 3) < 1e-9);
  assert.ok(Math.abs(silted.e.C.mods.hand - 0.5) < 1e-9);
  assert.equal(hollow.e.bossMax(), 35);
  assert.ok(Math.abs(lit.e.awayPace() - 0.3) < 1e-9);
});

test('floors: away pace never below 10 percent, the boss timer never below 15 seconds', () => {
  const f = withCurrent('lit');
  f.e.addSource('harsh', () => ({ awayPace: -5, bossTime: -100 }));
  f.e.recalc();
  assert.equal(f.e.awayPace(), 0.1);
  assert.equal(f.e.bossMax(), 15);
});

test('a Loud Fathom never grants a Deep Hush', () => {
  const f = withCurrent('loud');
  f.env.random = () => 0.4;                 // would be a Hush on the stock table (index 3 of 10 is hush)
  f.e.S.lanternIn = 0; f.e.S.totalGloom = 1e6;
  f.e.step(1);
  const r = f.e.snuffLantern(true);
  assert.notEqual(r.kind, 'hush');
});

test('Heavy: the preview includes the glass factor, the gain agrees, and it does not carry into the next fathom', () => {
  const f = ready(1);
  f.e.S.current = 'heavy'; f.e.recalc();
  const preview = f.e.glassGain();
  const plain = Math.floor(Math.pow(5e11 / 1e9 * 0 + f.e.S.runGloom / 1e9, f.e.GLASS_EXP));
  assert.equal(preview, Math.floor(Math.pow(f.e.S.runGloom / 1e9, f.e.GLASS_EXP) * 1.25));
  assert.ok(preview > plain);
  const g0 = f.e.S.glass;
  f.e.unlight('still');
  assert.equal(f.e.S.glass - g0, preview);
  f.e.S.runGloom = 1e12; f.e.recalc();
  assert.equal(f.e.glassGain(), Math.floor(Math.pow(1e12 / 1e9, f.e.GLASS_EXP)), 'Still: no factor');
});

test('an honest Narrow fathom, with denizens bought at the discount, passes the audit with no fixes', () => {
  const f = withCurrent('narrow');
  f.e.S.den = {}; f.e.S.upg = {}; f.e.S.gloom = 1e6; f.e.S.runGloom = 1e6; f.e.S.totalGloom = 1e6; f.e.S.played = 1e6;
  f.e.recalc();
  for (let i = 0; i < 200; i++) if (!f.e.buyDenizen('gleaner')) break;
  for (let i = 0; i < 100; i++) if (!f.e.buyDenizen('scribe')) break;
  assert.ok(f.e.cnt('gleaner') > 10);
  assert.equal(f.e.audit(JSON.parse(JSON.stringify(f.e.S))), 0);
});

test('a forged Still fathom with Narrow-priced denizens is repaired', () => {
  const f = withCurrent('still');
  f.e.S.den = { gleaner: 200 }; f.e.S.gloom = 0; f.e.S.runGloom = 1e3; f.e.S.totalGloom = 1e3; f.e.S.played = 1e6;
  assert.ok(f.e.audit(JSON.parse(JSON.stringify(f.e.S))) > 0);
});

test('the first choice unlocks the Currents Codex page', () => {
  const f = ready(1);
  f.e.S.codex = {};
  f.e.unlight(f.e.currentOffer()[1].id);
  f.e.slowChecks();
  assert.ok(f.e.S.codex.currents);
});
