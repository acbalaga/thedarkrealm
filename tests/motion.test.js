'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./helpers');

test('a new realm follows the system reduced-motion setting', () => {
  assert.equal(engine({ reducedMotion: true }).e.S.opts.motion, false);
  assert.equal(engine({ reducedMotion: false }).e.S.opts.motion, true);
  assert.equal(engine().e.S.opts.motion, true);
});

test('an existing save keeps its stored choice whatever the system says', () => {
  const { e } = engine({ reducedMotion: true });
  assert.equal(e.adopt({ opts: { motion: true } }).opts.motion, true);
  assert.equal(e.adopt({ opts: { motion: false } }).opts.motion, false);
});

test('keyboard shortcuts are on by default and a save can turn them off', () => {
  const { e } = engine();
  assert.equal(e.S.opts.keys, true);
  assert.equal(e.adopt({ opts: { keys: false } }).opts.keys, false);
  assert.equal(e.adopt({ opts: {} }).opts.keys, true);
  assert.equal(e.adopt({ opts: { keys: 'no' } }).opts.keys, true);
});
