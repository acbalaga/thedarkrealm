'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function queue(cap) {
  const box = { window: {} };
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'toast.js'), 'utf8'), box);
  return box.window.TDR_TOAST.createQueue(cap);
}
const t = (n) => ({ kind: 'omen', title: 'T' + n });

test('toasts come out in the order they went in', () => {
  const q = queue(5);
  q.push(t(1)); q.push(t(2)); q.push(t(3));
  assert.deepEqual([q.next(false).title, q.next(false).title, q.next(false).title], ['T1', 'T2', 'T3']);
  assert.equal(q.next(false), null);
});

test('only five wait, and the oldest are dropped first', () => {
  const q = queue(5);
  let dropped = 0;
  for (let i = 1; i <= 8; i++) dropped += q.push(t(i));
  assert.equal(dropped, 3);
  assert.equal(q.size(), 5);
  assert.equal(q.next(false).title, 'T4');
});

test('nothing is handed out while a dialog is open, and nothing is lost meanwhile', () => {
  const q = queue(5);
  q.push(t(1)); q.push(t(2));
  assert.equal(q.next(true), null);
  assert.equal(q.size(), 2);
  assert.equal(q.next(false).title, 'T1');
});
