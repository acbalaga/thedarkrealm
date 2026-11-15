'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { engine, fixtures, load } = require('./helpers');

test('the 25 original pages keep their words (ids, titles and text)', () => {
  const { D } = load();
  const h = crypto.createHash('sha256');
  D.CODEX.filter((c) => c.sys === 'core').forEach((c) => h.update(c.id + '\0' + c.title + '\0' + c.text + '\0'));
  assert.equal(D.CODEX.filter((c) => c.sys === 'core').length, 25);
  assert.equal(h.digest('hex'), '1820b36a48b251696f3375f0b20b0ae977f6d6e689b8ee9bfbafcfbb7b1ea028');
});

test('every page has a category and a system, and the original pages sit where the ticket puts them', () => {
  const { D } = load();
  const cats = D.CODEX_CATS.map((c) => c.id);
  assert.equal(cats.join(), 'realm,concord,queen,deep,sea,sky');
  D.CODEX.forEach((c) => { assert.ok(cats.includes(c.cat), c.id); assert.ok(c.sys, c.id); });
  const of = (cat) => D.CODEX.filter((c) => c.sys === 'core' && c.cat === cat).map((c) => c.id).sort().join();
  assert.equal(of('realm'), 'echo,gloom,hush,ledger,orchard,seat,waking');
  assert.equal(of('concord'), 'concord,drill,firstlamp,lantern,ownshadow,pell,sister,tallow,vale');
  assert.equal(of('queen'), 'cantors,glass,queenseat,reflection,ysmerel');
  assert.equal(of('deep'), 'fathom,unlighting');
  assert.equal(of('sea'), 'sea,sleeper');
});

test('the lore bible pages are all present', () => {
  const { D } = load();
  ['surfaceclock', 'moonless', 'lidless', 'longestnight', 'longestday', 'balance', 'performance', 'petitions', 'litanies', 'vigil',
    'soundings', 'set_table', 'set_survey', 'set_loft', 'set_lamp', 'set_queen', 'set_bed', 'currents', 'vows', 'pane', 'pane_half', 'elder', 'bell', 'root']
    .forEach((id) => assert.ok(D.CODEX.some((c) => c.id === id), id));
  assert.equal(D.CODEX.length, 49);
});

test('pages come with the order they were learned in, and it survives a save', () => {
  const f = engine();
  f.e.S.totalGloom = 50; f.e.S.runGloom = 50; f.e.S.gloom = 50;
  f.e.slowChecks();
  f.e.S.den = { gleaner: 1 }; f.e.slowChecks();
  f.e.S.den = { gleaner: 1, scribe: 1 }; f.e.slowChecks();
  const order = Object.keys(f.e.S.codex).sort((a, b) => f.e.S.codex[a] - f.e.S.codex[b]);
  assert.equal(order.join(), 'waking,gloom,seat,ledger');
  const g = engine();
  g.e.importText(f.e.exportText());
  assert.equal(JSON.stringify(g.e.S.codex), JSON.stringify(f.e.S.codex));
  assert.equal(g.e.S.codexSeq, 4);
});

test('an old save with 1 for every page loads, and later pages number above it', () => {
  fixtures().filter((x) => x.name === 'post-ending').forEach((fx) => {
    const f = engine();
    f.e.importText(fx.text);
    assert.equal(f.e.S.marks, 0);
    const seqs = Object.values(f.e.S.codex);
    assert.ok(seqs.every((n) => n === 1));
    assert.equal(f.e.S.codexSeq, 1);
    delete f.e.S.codex.waking;          // pretend one page was still unlearned
    f.e.slowChecks();
    assert.equal(f.e.S.codex.waking, 2);
  });
});

test('new pages are flagged until read, and the unread count follows', () => {
  const f = engine();
  f.e.S.totalGloom = 50; f.e.S.runGloom = 50; f.e.S.gloom = 50;
  f.e.slowChecks();
  assert.equal(f.e.codexUnread(), 2);
  f.e.markCodexRead('waking');
  assert.equal(f.e.codexUnread(), 1);
  f.e.markAllCodexRead();
  assert.equal(f.e.codexUnread(), 0);
});

test('pages of systems that do not exist yet never unlock and are not counted as dark', () => {
  const f = engine();
  f.e.S.bestShaft = 210; f.e.S.shaftTop = 211; f.e.S.glassTotal = 5; f.e.S.unlightings = 1; f.e.S.played = 1e7;
  f.e.slowChecks();
  ['elder', 'root', 'pane', 'vows'].forEach((id) => assert.equal(f.e.S.codex[id], undefined, id));
  assert.equal(f.e.codexLive().length, 44);
  assert.ok(f.e.codexLive().every((c) => ['core', 'litanies', 'skyclock', 'sky', 'petitions', 'soundings', 'currents', 'vows'].includes(c.sys)));
});

test('the facts object offers zero defaults for later systems', () => {
  // The unlocks of every later page read these, so a missing field would throw during slowChecks.
  const f = engine();
  assert.doesNotThrow(() => f.e.slowChecks());
});
