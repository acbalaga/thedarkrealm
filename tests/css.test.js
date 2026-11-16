'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const CSS = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/* Gold (--light, used through --above) is the colour of things from above: the Concord's
   lanterns, shafts and radiance. It is never a reward colour. Add a selector here only for a thing
   that really comes from the surface. See docs/design/UI_UX_GUIDE.md section 2. */
const FROM_ABOVE = [
  /^\.lantern( span|::before)?$/, /^\.lantern\./, /^\.shaft-box\.boss$/, /^\.shaft-box\.boss \.shaft-title$/, /^\.bar-fill\.light$/, /^\.bar-btn\.dot-above \.dot$/,
  /^\.toast\.k-sky$/, /^\.sky-strip$/, /^\.scene-box::before$/, /^\.toast\.k-sky \.toast-title$/,
  /^\.gate-shaft$/
];

function rules(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) out.push({ sel: m[1].trim().split(',').map((x) => x.trim()), body: m[2] });
  return out;
}

test('--light is only ever read through --above, and --above only on things from above', () => {
  rules(CSS).forEach((r) => {
    if (r.sel.indexOf(':root') >= 0) return;
    assert.equal(/var\(--light\)/.test(r.body), false, r.sel.join(', ') + ' reads --light directly');
    if (/var\(--above\)/.test(r.body)) r.sel.forEach((s) => assert.ok(FROM_ABOVE.some((a) => a.test(s)), s + ' uses gold but is not from above'));
  });
});

test('no raw hex colour outside :root, except inside a gradient', () => {
  const noRoot = CSS.replace(/:root\s*\{[^}]*\}/, '');
  noRoot.split('\n').forEach((line, i) => {
    if (/#[0-9a-fA-F]{3,8}\b/.test(line) && !/gradient\(/.test(line)) assert.fail('raw hex on line ' + (i + 1) + ' of the stylesheet: ' + line.trim());
  });
});

test('every font size is on the scale', () => {
  const bad = CSS.match(/font(-size)?:[^;{}]*\b\d+(\.\d+)?px/g) || [];
  assert.deepEqual(bad, []);
});

test('the theme colour matches the background token in the page and the manifest', () => {
  const bg = /--bg:\s*(#[0-9a-f]{6})/i.exec(CSS)[1].toLowerCase();
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const man = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'manifest.webmanifest'), 'utf8'));
  assert.equal(/name="theme-color" content="(#[0-9a-f]{6})"/i.exec(html)[1].toLowerCase(), bg);
  assert.equal(man.theme_color.toLowerCase(), bg);
  assert.equal(man.background_color.toLowerCase(), bg);
});

function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function token(name) { return new RegExp('--' + name + ':\\s*(#[0-9a-f]{6})', 'i').exec(CSS)[1]; }

test('text tokens reach 4.5:1 on every surface they sit on', () => {
  ['panel', 'panel2', 'bg', 'surface-3'].forEach((s) => {
    const bg = s === 'surface-3' ? token('surface-3') : token(s);
    ['text', 'dim', 'gloom', 'echo', 'glass', 'light', 'danger'].forEach((t) => {
      assert.ok(ratio(token(t), bg) >= 4.5, t + ' on ' + s + ' is ' + ratio(token(t), bg).toFixed(2));
    });
  });
});
