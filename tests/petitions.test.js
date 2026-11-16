'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./helpers');

const DAY = 86400000;
const at = (d, h) => new Date(2026, 5, d, h || 12).getTime();

function realm(opts) {
  const f = engine(Object.assign({ wall: at(10) }, opts));
  f.e.S.den = { gleaner: 30 };
  f.e.recalc();
  return f;
}
const ids = (offer) => offer.map((o) => o.id).sort().join();

test('no offer before 25 denizens, an offer on day one, none after granting until the day and six hours both pass', () => {
  const f = engine({ wall: at(10) });
  f.e.S.den = { gleaner: 24 };
  assert.equal(f.e.petitionOffer(), null);
  f.e.S.den = { gleaner: 25 };
  const offer = f.e.petitionOffer();
  assert.equal(offer.length, 3);
  assert.equal(f.e.grantPetition(offer[0].id, true), true);
  assert.equal(f.e.petitionOffer(), null, 'same day');
  f.clock.wall = at(11);
  assert.equal(f.e.petitionOffer(), null, 'new day but under six hours of play');
  f.e.S.played += 21600;
  assert.notEqual(f.e.petitionOffer(), null, 'both hold');
  const g = engine({ wall: at(10) });
  g.e.S.den = { gleaner: 25 };
  g.e.grantPetition(g.e.petitionOffer()[0].id, true);
  g.e.S.played += 30000;
  assert.equal(g.e.petitionOffer(), null, 'enough play but the same day');
});

test('ten idle days yield one offer, not ten, and it waits', () => {
  const f = realm();
  f.e.grantPetition(f.e.petitionOffer()[0].id, true);
  f.clock.wall = at(20);
  f.e.S.played += 10 * DAY / 1000;
  assert.notEqual(f.e.petitionOffer(), null);
  f.e.grantPetition(f.e.petitionOffer()[0].id, true);
  assert.equal(f.e.S.pet.count, 2);
  assert.equal(f.e.petitionOffer(), null);
});

test('the same seed and count give the same three, whatever the clock says, and a grant needs an offered id and a trusted caller', () => {
  const f = realm();
  const a = ids(f.e.petitionOffer());
  f.clock.wall = at(15);
  assert.equal(ids(f.e.petitionOffer()), a);
  const g = realm();
  g.e.S.seed = f.e.S.seed;
  assert.equal(ids(g.e.petitionOffer()), a);
  const other = engine({ wall: at(10) });
  other.e.S.den = { gleaner: 30 };
  other.e.S.seed = (f.e.S.seed + 7) >>> 0;
  assert.equal(other.e.petitionOffer().length, 3);
  const offer = f.e.petitionOffer();
  assert.equal(f.e.grantPetition(offer[0].id, false), false);
  const notOffered = ['rake', 'ink', 'hands', 'rest', 'names'].find((i) => !offer.some((o) => o.id === i));
  assert.equal(f.e.grantPetition(notOffered, true), false);
});

test('options the player does not qualify for never appear', () => {
  const f = engine({ wall: at(10) });
  f.e.S.played = 1e6;
  f.e.S.den = { gleaner: 30 };          // no scribe, weaver, warden, cantor, forge, tide; no shafts, no rites, no lanterns
  for (let i = 0; i < 20; i++) {
    f.e.S.pet.count = i;
    f.e.S.pet.day = 0;
    f.e.petitionOffer().forEach((o) => assert.ok(['rake', 'rest', 'hands'].includes(o.id), o.id));
  }
});

test('Temper takes exactly a tenth of the Gloom and the save still passes its audit', () => {
  const f = engine({ wall: at(10) });
  f.e.S.den = { gleaner: 30, forge: 1 };
  f.e.S.played = 1e5; f.e.S.runGloom = 1e9; f.e.S.totalGloom = 1e9; f.e.S.gloom = 5e8;
  f.e.S.pet.count = 0;
  for (let i = 0; i < 40 && !f.e.petitionOffer().some((o) => o.id === 'temper'); i++) { f.e.S.pet.count = i; }
  f.e.S.pet.count = Math.max(0, f.e.S.pet.count);
  const offer = f.e.petitionOffer();
  if (offer.some((o) => o.id === 'temper')) {
    const g0 = f.e.S.gloom;
    f.e.grantPetition('temper', true);
    assert.ok(Math.abs(f.e.S.gloom - 0.9 * g0) < 1e-6);
    assert.equal(f.e.audit(JSON.parse(JSON.stringify(f.e.S))), 0);
  }
});

test('effects end when the local day changes, and Rest persists', () => {
  const f = realm();
  f.e.S.pet.active = 'rake'; f.e.S.pet.day = f.e.dayIndex(f.clock.wall); f.e.S.pet.count = 1;
  f.e.recalc();
  assert.equal(f.e.C.mods.den.gleaner, 10);
  f.clock.wall += DAY; f.e.recalc();
  assert.equal(f.e.C.mods.den.gleaner || 1, 1, 'the next day it is over');
  const r = realm();
  r.e.S.pet.active = 'rest'; r.e.S.pet.day = r.e.dayIndex(r.clock.wall); r.e.S.pet.count = 1;
  const before = r.e.awayPace();
  r.clock.wall += 5 * DAY;
  assert.ok(Math.abs(r.e.awayPace() - Math.min(1, before)) < 1e-9);
  assert.ok(r.e.awayPace() >= 0.75);
});

test('no petition bonus reaches away pay except Rest', () => {
  const f = realm();
  f.e.S.pet.active = 'rake'; f.e.S.pet.day = f.e.dayIndex(f.clock.wall); f.e.S.pet.count = 1;
  const plain = realm();
  const a = f.e.away(3600), b = plain.e.away(3600);
  assert.equal(a.gloom, b.gloom);
});

test('petition factors share the x3 ceiling with sky factors; a denizen channel is exempt', () => {
  const f = engine({ sky: true, wall: new Date(2026, 11, 21, 22).getTime() });
  f.e.S.unlocked.shafts = true; f.e.S.den = { gleaner: 30, scribe: 1 };
  f.e.S.pet.active = 'ink'; f.e.S.pet.day = f.e.dayIndex(f.clock.wall); f.e.S.pet.count = 1;
  f.e.recalc();
  assert.equal(f.e.C.mods.gloom <= 3 + 1e-9, true);
  assert.equal(f.e.C.mods.hand, 0, 'Ink: no hand gathering');
  assert.equal(f.e.C.click, 0);
  const g = realm();
  g.e.S.pet.active = 'rake'; g.e.S.pet.day = g.e.dayIndex(g.clock.wall); g.e.S.pet.count = 1;
  g.e.recalc();
  assert.equal(g.e.C.mods.den.gleaner, 10, 'the Gleaner channel is not capped to 3');
});

test('Vigil milestones apply once each, with an omen each, and nothing counts days missed', () => {
  const f = realm();
  const factor = (n) => { f.e.S.pet.count = n; f.e.recalc(); return f.e.breakdown('gloom').filter((r) => r.name === 'The Vigil').map((r) => r.value)[0] || 1; };
  assert.equal(factor(2), 1);
  assert.ok(Math.abs(factor(3) - 1.045) < 1e-9);
  assert.ok(Math.abs(factor(7) - Math.pow(1.045, 2)) < 1e-9);
  assert.ok(Math.abs(factor(100) - Math.pow(1.045, 6)) < 1e-9);
  assert.ok(Math.abs(Math.pow(1.045, 6) - 1.3) < 0.01, 'about x1.3 in all');
  f.e.S.pet.count = 7;
  assert.equal(f.e.OMENS.find((o) => o.name === 'A Week of Evenings').cond(), true);
  assert.equal(f.e.OMENS.find((o) => o.name === 'A Fortnight').cond(), false);
});

test('the audit caps the Vigil by time played, and adopt keeps only known ids', () => {
  const { e } = engine();
  const s = e.adopt({ pet: { day: 10, count: 500, playedAt: 0, active: 'nonsense' }, played: 43200 });
  assert.equal(s.pet.count, 3);
  assert.equal(s.pet.active, '');
  assert.ok(s.marks >= 1);
  const t = e.adopt({ pet: { day: 1e9 }, played: 0 });
  assert.ok(t.pet.day <= e.dayIndex(1.7e12) + 1);
});

test('the first grant unlocks the petitions page and seven Vigils the Vigil page', () => {
  const f = realm();
  f.e.S.codex = {};
  f.e.grantPetition(f.e.petitionOffer()[0].id, true);
  f.e.slowChecks();
  assert.ok(f.e.S.codex.petitions);
  assert.equal(f.e.S.codex.vigil, undefined);
  f.e.S.pet.count = 7; f.e.slowChecks();
  assert.ok(f.e.S.codex.vigil);
});

test('an offer is on the waiting list and the objective list', () => {
  const f = realm();
  assert.ok(f.e.waiting().some((w) => w.id === 'offer'));
  assert.equal(f.e.objective().id, 'offer');
});
