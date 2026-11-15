'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { check } = require('../tools/check.js');

const CSP = "default-src 'none'; script-src 'self'; style-src 'self'";
const GOOD = {
  'public/index.html': '<!doctype html><meta http-equiv="Content-Security-Policy" content="' + CSP + '"><script src="js/a.js"></script>',
  'public/404.html': '<!doctype html><p>Lost</p>',
  'public/_headers': '/*\n  Content-Security-Policy: ' + CSP + '; frame-ancestors \'none\'\n',
  'public/js/a.js': "'use strict';\n// innerHTML in a comment is fine\nvar a = 1;\n",
  'public/sw.js': "var CACHE = 'x';\nvar FILES = ['./', 'js/a.js'];\n"
};

function tree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tdr-check-'));
  Object.keys(files).forEach((f) => {
    const p = path.join(root, f);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, files[f]);
  });
  return root;
}
function errorsFor(change, allow) {
  const files = Object.assign({}, GOOD, change);
  Object.keys(files).forEach((k) => { if (files[k] === null) delete files[k]; });
  return check(tree(files), allow);
}
function flags(change, re, allow) {
  const e = errorsFor(change, allow);
  assert.ok(e.some((m) => re.test(m)), 'expected ' + re + ' in ' + JSON.stringify(e));
}

test('a clean tree passes', () => assert.deepStrictEqual(errorsFor({}), []));

test('the real tree passes with the allow list', () => {
  const root = path.join(__dirname, '..');
  const allow = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'check-allow.json'), 'utf8'));
  assert.deepStrictEqual(check(root, allow), []);
});

['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write(', 'eval(', 'new Function', 'setTimeout("x", 1)', 'setInterval(`x`, 1)', 'javascript:'].forEach((bad) => {
  test('flags ' + bad + ' in scripts', () => flags({ 'public/js/a.js': "var x = el." + bad + ";\n" }, /forbidden/));
});

test('flags a sink in sw.js', () => flags({ 'public/sw.js': GOOD['public/sw.js'] + 'x.innerHTML = 1;\n' }, /forbidden innerHTML/));

test('the allow list excuses only the exact line', () => {
  const change = { 'public/js/a.js': "box.innerHTML = '';\n" };
  assert.deepStrictEqual(errorsFor(change, [{ file: 'public/js/a.js', line: "box.innerHTML = '';" }]), []);
  flags({ 'public/js/a.js': "box.innerHTML = 'x';\n" }, /forbidden/, [{ file: 'public/js/a.js', line: "box.innerHTML = '';" }]);
});

test('flags an inline script body', () => flags({ 'public/404.html': '<script>var a=1</script>' }, /inline <script>/));
test('flags an on* attribute', () => flags({ 'public/404.html': '<p onclick="x()">a</p>' }, /event attribute/));
test('flags a style attribute', () => flags({ 'public/404.html': '<p style="color:red">a</p>' }, /style attribute/));

test('flags remote URLs', () => {
  flags({ 'public/js/a.js': "var u = 'https://example.com/x';\n" }, /remote URL/);
  flags({ 'public/js/a.js': "var u = 'http://example.com/x';\n" }, /remote URL/);
  flags({ 'public/js/a.js': "var u = '//cdn.example.com/x';\n" }, /remote URL/);
});
test('remote URLs in comments and SVG xmlns are exempt', () => {
  assert.deepStrictEqual(errorsFor({
    'public/js/a.js': "// see https://example.com\nvar a = 1;\n",
    'public/icons/icon-maskable.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
  }), []);
});

test('flags CSP drift but ignores frame-ancestors', () => {
  flags({ 'public/_headers': "/*\n  Content-Security-Policy: default-src 'none'\n" }, /CSP .* differ/);
  assert.deepStrictEqual(errorsFor({ 'public/_headers': '/*\n  Content-Security-Policy: ' + CSP + '\n' }), []);
});

test('flags a file missing from FILES', () => flags({ 'public/js/b.js': 'var b = 1;\n' }, /not in FILES/));
test('flags a FILES entry that does not exist', () => flags({ 'public/sw.js': "var FILES = ['./', 'js/a.js', 'js/gone.js'];\n" }, /does not exist: js\/gone\.js/));
test('the ignore list needs no FILES entry', () => {
  assert.deepStrictEqual(errorsFor({ 'public/icons/icon-maskable.svg': '<svg></svg>' }), []);
});
