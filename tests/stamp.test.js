'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const stamp = require('../tools/stamp-sw.js');
const { check } = require('../tools/check.js');

function tree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tdr-stamp-'));
  const put = (f, c) => { const p = path.join(root, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); };
  put('public/index.html', '<!doctype html><p>x</p>');
  put('public/js/a.js', 'var a = 1;\n');
  put('public/sw.js', "var CACHE = 'tdr-0000000000';\nvar FILES = ['./', 'js/a.js', 'js/version.js'];\n");
  return { root, put };
}

test('stamping writes the hash into sw.js and version.js, and verify then passes', () => {
  const t = tree();
  const s = stamp.stamp(t.root);
  assert.match(s, /^tdr-[0-9a-f]{10}$/);
  assert.match(fs.readFileSync(path.join(t.root, 'public/sw.js'), 'utf8'), new RegExp("var CACHE = '" + s + "';"));
  assert.equal(fs.readFileSync(path.join(t.root, 'public/js/version.js'), 'utf8'), stamp.versionSource(s));
  assert.deepEqual(stamp.verify(t.root), []);
});

test('changing one byte of a listed file changes the stamp', () => {
  const t = tree();
  const a = stamp.stamp(t.root);
  t.put('public/js/a.js', 'var a = 2;\n');
  assert.notEqual(stamp.compute(t.root), a);
});

test('changing the page changes the stamp, and the stamp does not depend on version.js itself', () => {
  const t = tree();
  const a = stamp.stamp(t.root);
  assert.equal(stamp.compute(t.root), a, 'writing the stamp into version.js must not move the stamp');
  t.put('public/index.html', '<!doctype html><p>y</p>');
  assert.notEqual(stamp.compute(t.root), a);
});

test('a file outside FILES does not change the stamp', () => {
  const t = tree();
  const a = stamp.stamp(t.root);
  t.put('public/404.html', 'x');
  assert.equal(stamp.compute(t.root), a);
});

test('check fails when the stamp is stale, and says how to fix it', () => {
  const t = tree();
  stamp.stamp(t.root);
  assert.deepEqual(check(t.root, [], {}).filter((m) => /CACHE|version\.js/.test(m)), []);
  t.put('public/js/a.js', 'var a = 3;\n');
  const errs = check(t.root, [], {});
  assert.ok(errs.some((m) => /npm run stamp/.test(m)), JSON.stringify(errs));
});

test('check fails when version.js was edited by hand', () => {
  const t = tree();
  stamp.stamp(t.root);
  t.put('public/js/version.js', "window.TDR_VERSION = 'tdr-bogus';\n");
  assert.ok(check(t.root, [], {}).some((m) => /version\.js/.test(m)));
});
