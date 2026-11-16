'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fakeEnv, j } = require('./helpers');

const NOON = new Date(2026, 5, 10, 12, 0, 0).getTime();
const HOUR = 3600000, DAY = 86400000;
const DAILY = 'thedarkrealm.save.v2.bak.daily', UNL = 'thedarkrealm.save.v2.bak.unlight', IMP = 'thedarkrealm.save.v2.bak.import';

function boot(opts) {
  const { D, create } = load();
  const f = fakeEnv(Object.assign({ wall: NOON, mono: 1000 }, opts));
  const e = create(D, f.env);
  e.load(); e.recalc(); e.start();
  return Object.assign(f, { e, D, create });
}
const state = (e, text) => j(e.adopt(e.unpack(text).data));

test('the daily slot takes the last save of the previous day, once per day', () => {
  const f = boot();
  f.e.save();
  f.clock.wall = NOON + 3 * HOUR;
  f.e.S.gloom = 5; f.e.S.runGloom = 5; f.e.S.totalGloom = 5;
  f.e.save();
  assert.equal(f.map.has(DAILY), false, 'same day, no rotation');
  const lastOfDay1 = f.map.get(f.e.KEY);
  f.clock.wall = NOON + DAY;
  f.e.S.gloom = 9; f.e.S.runGloom = 9; f.e.S.totalGloom = 9;
  f.e.save();
  assert.equal(f.map.get(DAILY), lastOfDay1);
  const first = f.map.get(DAILY);
  f.clock.wall = NOON + DAY + HOUR;
  f.e.save();
  assert.equal(f.map.get(DAILY), first, 'a second save on the same day leaves the slot alone');
});

test('a realm loaded the next day rotates on its first save', () => {
  const f = boot();
  f.e.save();
  const saved = f.map.get(f.e.KEY);
  const g = boot({ storage: [[f.e.KEY, saved]], wall: NOON + 2 * DAY });
  g.e.save();
  assert.equal(g.map.get(DAILY), saved);
});

test('a backup that cannot be written never stops the main save', () => {
  const { D, create } = load();
  const f = fakeEnv({ wall: NOON });
  const real = f.env.storage.set;
  f.env.storage.set = (k, v) => { if (k.indexOf('.bak.') >= 0) throw new Error('quota'); real(k, v); };
  const e = create(D, f.env);
  e.load(); e.recalc(); e.start();
  e.save();
  f.clock.wall = NOON + DAY;
  e.S.runGloom = 1e12; e.S.totalGloom = 1e12; e.S.gloom = 1e12;
  assert.equal(e.save(), true);
  assert.equal(e.unlight(), true);
  assert.equal(f.map.has(e.KEY), true);
});

test('the unlight slot holds the realm as it was before the reset', () => {
  const f = boot();
  f.e.S.played = 1e5;
  f.e.S.runGloom = 1e12; f.e.S.totalGloom = 1e12; f.e.S.gloom = 4e11;
  f.e.S.den = { gleaner: 20 };
  assert.equal(f.e.unlight(), true);
  const b = f.e.adopt(f.e.unpack(f.map.get(UNL)).data);
  assert.equal(b.unlightings, 0);
  assert.equal(b.gloom, 4e11);
  assert.equal(b.den.gleaner, 20);
  assert.equal(f.e.S.unlightings, 1);
});

test('an import writes the replaced realm to the import slot first, and a restore undoes it', () => {
  const a = boot();
  a.e.S.gloom = 111; a.e.S.runGloom = 111; a.e.S.totalGloom = 111;
  const textA = a.e.exportText();
  const b = boot();
  b.e.S.gloom = 222; b.e.S.runGloom = 222; b.e.S.totalGloom = 222;
  const beforeImport = state(b.e, b.e.exportText());
  assert.equal(b.e.importText(textA).ok, true);
  assert.equal(b.e.S.gloom, 111);
  assert.equal(state(b.e, b.map.get(IMP)), beforeImport);
  assert.equal(b.e.restoreBackup('import').ok, true);
  assert.equal(b.e.S.gloom, 222, 'restoring brings the earlier realm back');
  assert.equal(state(b.e, b.map.get(IMP)).includes('"gloom":111'), true, 'and the one it replaced is kept in turn');
});

test('an erase leaves a sealed backup that restores', () => {
  const f = boot();
  f.e.S.gloom = 77; f.e.S.runGloom = 77; f.e.S.totalGloom = 77;
  f.e.save();
  f.e.erase();
  assert.equal(f.map.has(f.e.KEY), false);
  const g = boot({ storage: [[IMP, f.map.get(IMP)]] });
  assert.equal(g.e.S.gloom, 0);
  assert.equal(g.e.restoreBackup('import').ok, true);
  assert.equal(g.e.S.gloom, 77);
});

test('listBackups reads sealed backups into temporary states and ignores altered ones', () => {
  const f = boot();
  f.e.S.gloom = 5; f.e.S.runGloom = 5; f.e.S.totalGloom = 5;
  f.e.S.unlightings = 0;
  f.e.save();
  f.clock.wall += DAY;
  f.e.save();
  const before = j(f.e.S);
  const list = f.e.listBackups();
  assert.equal(list.length, 1);
  assert.equal(list[0].slot, 'daily');
  assert.equal(list[0].fathom, 1);
  assert.equal(list[0].gloom, 5);
  assert.equal(j(f.e.S), before, 'listing never touches the live realm');
  const parts = f.map.get(DAILY).split('.');
  const body = Buffer.from(Buffer.from(parts[1], 'base64').toString('binary').replace(/"gloom":/, '"gloom":9'), 'binary').toString('base64');
  f.map.set(DAILY, parts[0] + '.' + body + '.' + parts[2]);
  assert.equal(f.e.listBackups().length, 0);
  assert.equal(f.e.restoreBackup('daily').ok, false);
  assert.equal(f.e.restoreBackup('nope').ok, false);
});

test('set-aside copies can be listed and discarded', () => {
  const f = boot({ storage: [['thedarkrealm.save.v2.rejected', 'TDR2.x.y'], ['thedarkrealm.save.v2.unreadable', 'junk']] });
  const l = f.e.listSetAside();
  assert.equal(j(l.map((x) => x.which).sort()), j(['rejected', 'unreadable']));
  f.e.discardSetAside('rejected');
  assert.equal(f.map.has('thedarkrealm.save.v2.rejected'), false);
  assert.equal(f.map.has('thedarkrealm.save.v2.unreadable'), true);
  f.e.discardSetAside('../../etc');
  assert.equal(f.map.size >= 1, true);
});

test('exportedAt and remindedAt are recorded and survive a round trip', () => {
  const f = boot();
  f.e.markExported(); f.e.markReminded();
  assert.equal(f.e.S.exportedAt, NOON);
  f.e.save();
  const g = boot({ storage: [[f.e.KEY, f.map.get(f.e.KEY)]] });
  assert.equal(g.e.S.exportedAt, NOON);
  assert.equal(g.e.S.remindedAt, NOON);
});

test('the reminder follows its truth table', () => {
  const { e } = boot();
  const now = NOON, d = DAY;
  const due = (played, installed, exported, reminded) => e.reminderDue(played, installed, exported, reminded, now);
  assert.equal(due(8000, false, 0, 0), true, 'long play, browser tab, never exported');
  assert.equal(due(7200, false, 0, 0), false, 'exactly two hours is not over two hours');
  assert.equal(due(8000, true, 0, 0), false, 'installed app');
  assert.equal(due(8000, false, now - 13 * d, 0), false, 'exported 13 days ago');
  assert.equal(due(8000, false, now - 15 * d, 0), true, 'exported 15 days ago');
  assert.equal(due(8000, false, 0, now - 6 * d), false, 'reminded 6 days ago');
  assert.equal(due(8000, false, 0, now - 8 * d), true, 'reminded 8 days ago');
  assert.equal(e.backupStale(8000, false, 0, now), true);
  assert.equal(e.backupStale(100, false, 0, now), false);
});
