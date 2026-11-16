'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { engine } = require('./helpers');

function nav() {
  const box = { window: {} };
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'nav.js'), 'utf8'), box);
  return box.window.TDR_NAV.create();
}
const none = {}, all = { shafts: true, rites: true, unlight: true };
const saved = (dest, page) => ({ dest, page: Object.assign({ realm: 'den', host: 'shaft', deep: 'unl', ledger: 'omen' }, page) });

test('an old save opens on the equivalent destination and page', () => {
  const { e } = engine();
  const want = { den: ['realm', 'den'], work: ['realm', 'work'], shaft: ['host', 'shaft'], rite: ['host', 'rite'],
    unl: ['deep', 'unl'], omen: ['ledger', 'omen'], codex: ['ledger', 'codex'], set: ['ledger', 'set'] };
  Object.keys(want).forEach((tab) => {
    const s = e.adopt({ tab });
    assert.equal(s.nav.dest, want[tab][0], tab);
    assert.equal(s.nav.page[want[tab][0]], want[tab][1], tab);
    assert.equal(Object.prototype.hasOwnProperty.call(s, 'tab'), false);
  });
});

test('a new save keeps its nav, and unknown values fall back to defaults', () => {
  const { e } = engine();
  const s = e.adopt({ nav: { dest: 'ledger', page: { ledger: 'codex', realm: 'work' } } });
  assert.equal(s.nav.dest, 'ledger');
  assert.equal(s.nav.page.ledger, 'codex');
  assert.equal(s.nav.page.realm, 'work');
  const bad = e.adopt({ nav: { dest: 'nowhere', page: { host: 'Not Ok!', deep: '' } } });
  assert.equal(bad.nav.dest, 'seat');
  assert.equal(bad.nav.page.host, 'shaft');
  assert.equal(bad.nav.page.deep, 'unl');
});

test('locked destinations and pages are hidden and resolution falls back', () => {
  const n = nav();
  const host = n.dest('host'), deep = n.dest('deep');
  assert.equal(n.destVisible(host, none), false);
  assert.equal(n.destVisible(host, { shafts: true }), true);
  assert.equal(n.pagesOf(host, { shafts: true }).map((p) => p.id).join(), 'shaft');
  assert.equal(n.pagesOf(host, all).map((p) => p.id).join(), 'shaft,rite');
  assert.equal(n.destVisible(deep, none), false);
  assert.equal(n.resolve(saved('host', {}), none, true).dest.id, 'realm');
  assert.equal(n.resolve(saved('host', { host: 'rite' }), { shafts: true }, true).page.id, 'shaft', 'a locked page falls back to the first open one');
  assert.equal(n.resolve(saved('host', { host: 'rite' }), all, true).page.id, 'rite');
});

test('the Seat is a destination only on a narrow screen, and the saved choice is kept', () => {
  const n = nav();
  assert.equal(n.resolve(saved('seat', {}), none, true).dest.id, 'realm');
  assert.equal(n.resolve(saved('seat', {}), none, false).dest.id, 'seat');
});

test('addPage registers a page that appears only when its lock is open', () => {
  const n = nav();
  n.addPage('host', { id: 'soundings', label: 'Soundings', lock: 'rites' });
  assert.equal(n.pagesOf(n.dest('host'), { shafts: true }).some((p) => p.id === 'soundings'), false);
  assert.equal(n.pagesOf(n.dest('host'), { shafts: true, rites: true }).some((p) => p.id === 'soundings'), true);
  assert.equal(n.resolve(saved('host', { host: 'soundings' }), { shafts: true, rites: true }, true).page.id, 'soundings');
});

test('addPage refuses a missing destination, a duplicate id and an incomplete page', () => {
  const n = nav();
  assert.throws(() => n.addPage('nowhere', { id: 'x', label: 'X' }));
  assert.throws(() => n.addPage('host', { id: 'shaft', label: 'Again' }));
  assert.throws(() => n.addPage('host', { id: 'y' }));
});

test('the destination list matches the guide: Seat, Realm, Host, Deep, Ledger', () => {
  assert.equal(nav().dests.map((d) => d.label).join(), 'Seat,Realm,Host,Deep,Ledger');
});
