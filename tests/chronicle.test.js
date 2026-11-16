'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, engine } = require('./helpers');
const pkg = require('../package.json');

test('the shipped edition matches package.json', () => {
  const { D } = load();
  assert.ok(D.CHRONICLE.length > 0);
  const [maj, min] = pkg.version.split('.');
  assert.equal(D.CHRONICLE[0].ed, maj + '.' + min, 'bump package.json and the first CHRONICLE entry together');
});

test('editions are newest first, named, and unique', () => {
  const { D } = load();
  const n = (e) => e.ed.split('.').map(Number);
  D.CHRONICLE.forEach((e, i) => {
    assert.match(e.ed, /^\d+\.\d+$/);
    assert.ok(e.name && e.note);
    if (i) { const a = n(D.CHRONICLE[i - 1]), b = n(e); assert.ok(a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]), e.ed + ' is out of order'); }
  });
});

test('threshold text keeps the house voice', () => {
  const { D } = load();
  const all = [].concat(D.GATE.first, D.GATE.back, D.GATE.state.map((x) => x.text), D.GATE.firstBtn, D.GATE.backBtn, D.GATE.promise,
    D.CHRONICLE.map((e) => e.name + ' ' + e.note));
  all.forEach((t) => { assert.equal(/[!—]/.test(t), false, t); });
  ['returned', 'kept', 'ended', 'unlit', 'shafts'].forEach((w) => assert.ok(D.GATE.state.some((x) => x.when === w), w));
});

test('opts.gate defaults on, survives a round trip, and only false turns it off', () => {
  const f = engine();
  assert.equal(f.e.S.opts.gate, true);
  f.e.S.opts.gate = false;
  const txt = f.e.exportText();
  const g = engine();
  assert.ok(g.e.importText(txt).ok !== false);
  assert.equal(g.e.S.opts.gate, false);
});
