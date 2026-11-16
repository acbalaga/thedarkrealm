'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine, load } = require('./helpers');

const ALL = Object.values(load().D.CHATTER).flat();
const chat = (f) => f.said.filter((m) => ALL.includes(m));
function run(f, seconds) {
  for (let i = 0; i < seconds; i++) { f.clock.mono += 1000; f.clock.wall += 1000; f.e.tick(); }
}
function owned(f, ids) { f.e.S.den = {}; ids.forEach((id) => { f.e.S.den[id] = 1; }); f.e.S.played = 200; f.e.recalc(); }

test('the data holds the 30 lines of the lore bible, three for each of ten denizens', () => {
  const { D } = load();
  assert.equal(Object.keys(D.CHATTER).length, 10);
  Object.keys(D.CHATTER).forEach((k) => assert.equal(D.CHATTER[k].length, 3, k));
  assert.ok(D.CHATTER.gleaner.includes('Two Gleaners are arguing over a hook. It is the same hook.'));
});

test('nothing is said with no denizens', () => {
  const f = engine();
  f.e.S.played = 200;
  assert.equal(f.e.pickChatter(), null);
  run(f, 700);
  assert.equal(f.said.some((m) => /Gleaner|Scribe|Warden|Cantor/.test(m)), false);
});

test('only lines for owned denizens are chosen, and none repeat until the pool is spent', () => {
  const f = engine();
  owned(f, ['gleaner', 'scribe']);
  const { D } = load();
  const pool = D.CHATTER.gleaner.concat(D.CHATTER.scribe);
  const seen = [];
  for (let i = 0; i < 6; i++) seen.push(f.e.pickChatter().line);
  assert.equal(new Set(seen).size, 6, 'six different lines before any repeat');
  seen.forEach((l) => assert.ok(pool.includes(l)));
  const seventh = f.e.pickChatter().line;
  assert.ok(pool.includes(seventh), 'the pool starts over');
});

test('a line arrives within a few minutes, tagged as chatter', () => {
  const f = engine();
  owned(f, ['gleaner', 'warden']);
  const kinds = [];
  f.env.say = (m, k) => { f.said.push(m); kinds.push(k); };
  run(f, 130);
  assert.ok(f.said.length >= 1, 'the first line is due within 120 seconds');
  assert.ok(kinds.includes('chatter'));
});

test('no chatter in the first three minutes of a new realm', () => {
  const f = engine();
  f.e.S.den = { gleaner: 1 };
  f.e.recalc();
  run(f, 170);
  assert.equal(f.said.filter((m) => /Gleaner/.test(m)).length, 0);
});

test('the timer does not run while the page is hidden or a dialog is open', () => {
  const f = engine();
  owned(f, ['gleaner']);
  f.clock.hidden = true;
  run(f, 600);
  assert.equal(chat(f).length, 0);
  f.clock.hidden = false;
  let modal = true;
  f.env.modalOpen = () => modal;
  run(f, 600);
  assert.equal(chat(f).length, 0);
  modal = false;
  run(f, 130);
  assert.ok(chat(f).length >= 1);
});

test('with the setting off no chatter is produced', () => {
  const f = engine();
  owned(f, ['gleaner']);
  f.e.S.opts.chatter = false;
  run(f, 900);
  assert.equal(chat(f).length, 0);
});

test('chatter waits when a Whisper has just been said', () => {
  const f = engine();
  owned(f, ['gleaner']);
  run(f, 59);
  f.e.S.gloom = 1e4;
  // a purchase Whisper lands as the timer is about to fire
  run(f, 59);
  f.e.buyDenizen('scribe');
  const before = f.said.length;
  run(f, 3);
  assert.equal(f.said.length, before, 'nothing within 5 seconds of another Whisper');
});

test('the setting is on by default and a save can turn it off', () => {
  const { e } = engine();
  assert.equal(e.S.opts.chatter, true);
  assert.equal(e.adopt({ opts: { chatter: false } }).opts.chatter, false);
  assert.equal(e.adopt({ opts: {} }).opts.chatter, true);
});

/* ---- Whispers kept across a reload ---- */

test('log restore accepts short strings and rejects everything else', () => {
  const { e } = engine();
  assert.equal(JSON.stringify(e.parseLog('["a","b"]')), '["a","b"]');
  assert.equal(JSON.stringify(e.parseLog('not json')), '[]');
  assert.equal(JSON.stringify(e.parseLog('{"a":1}')), '[]');
  assert.equal(JSON.stringify(e.parseLog('"text"')), '[]');
  assert.equal(JSON.stringify(e.parseLog('["ok", 5, null, {"x":1}, ["y"], ""]')), '["ok"]');
  assert.equal(e.parseLog(JSON.stringify(['x'.repeat(301), 'y'.repeat(300)])).length, 1);
  assert.equal(e.parseLog(JSON.stringify(Array.from({ length: 50 }, (_, i) => 'line ' + i))).length, 30);
  assert.equal(e.parseLog(JSON.stringify(Array.from({ length: 50 }, (_, i) => 'line ' + i)))[0], 'line 0');
});

test('markup in a restored line is plain text to the engine and stays text', () => {
  const { e } = engine();
  const out = e.parseLog('["<img src=x onerror=alert(1)>"]');
  assert.equal(out[0], '<img src=x onerror=alert(1)>');
});
