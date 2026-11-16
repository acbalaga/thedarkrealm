'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./helpers');

test('shaft names: the last shaft of the Concord, then Elder Shafts and their Lampwardens', () => {
  const { e } = engine();
  assert.equal(e.shaftName(150), 'The First Lamp');
  assert.equal(e.shaftName(151), 'Elder Shaft 151');
  assert.equal(e.shaftName(160), 'The Tin Sun');
  assert.equal(e.shaftName(200), 'The Hole in the Field');
});

test('the Drowned Bell shows after Sunshaft 150 and the Pane-Wright at 12 lights', () => {
  const { e, D } = engine();
  const bell = D.DENIZENS.find((d) => d.id === 'bell'), wright = D.DENIZENS.find((d) => d.id === 'wright');
  assert.equal(e.denLive(bell), false);
  assert.equal(e.denLive(wright), false);
  e.S.bestShaft = 150;
  assert.equal(e.denLive(bell), true);
});

test('Full Attendance counts only denizens the player can see', () => {
  const { e } = engine();
  const omen = e.OMENS.find((o) => o.name === 'Full Attendance');
  e.S.den = { gleaner: 1, scribe: 1, weaver: 1, warden: 1, cantor: 1, forge: 1, tide: 1, choir: 1, orchard: 1, sleeper: 1 };
  assert.equal(omen.cond(), true, 'unearnable bell does not block it');
  e.S.bestShaft = 150;
  assert.equal(omen.cond(), false, 'visible bell with none bound');
  e.S.den.bell = 1;
  assert.equal(omen.cond(), true);
});

test('audit strips Drowned Bells and The Patient Dark from saves that cannot have them', () => {
  const f = engine();
  const e = f.e;
  e.S.den = { gleaner: 10, bell: 3 }; e.S.bestShaft = 100; e.S.perks = { patient: 1 }; e.S.unlightings = 1; e.S.glassTotal = 5000;
  const text = e.exportText();
  const g = engine();
  g.e.importText(text);
  assert.equal(g.e.S.den.bell || 0, 0);
  assert.equal(g.e.S.perks.patient || 0, 0);
});

test('The Patient Dark makes the away cap 48 hours, only with Unsleeping', () => {
  const { e } = engine();
  assert.equal(e.awayCapHours(), 8);
  e.S.perks.unsleeping = 1; assert.equal(e.awayCapHours(), 24);
  e.S.perks.patient = 1; assert.equal(e.awayCapHours(), 48);
  e.S.perks = { patient: 1 }; assert.equal(e.awayCapHours(), 8);
});

test('Older Than Lamps multiplies Gloom and Might by 1.7', () => {
  const { e } = engine();
  e.S.den = { gleaner: 10 }; e.recalc();
  const g = e.C.gps, m = e.C.might;
  e.S.perks.older = 1; e.recalc();
  assert.ok(Math.abs(e.C.gps / g - 1.7) < 1e-9);
  assert.ok(Math.abs(e.C.might / m - 1.7) < 1e-9);
});

test('fmt reaches 1e48 in named notation', () => {
  const { e } = engine();
  assert.equal(e.fmt(1e36), '1.00Ud');
  assert.equal(e.fmt(1e47), '100Qad');
  assert.equal(e.fmt(1e48), '1.00Qid');
  assert.match(e.fmt(1e51), /e51$/);
});
