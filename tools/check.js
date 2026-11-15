'use strict';
/* Static guards for the shipped game. No dependencies. Run: npm run check
   check(root, allow) returns a list of problems (empty when clean). `root` is a folder that
   holds public/, so tests can point it at small fixture trees. */
var fs = require('fs');
var path = require('path');
var shared = require('./shared.js');
var stampLib = require('./stamp-sw.js');

var read = shared.read, exists = shared.exists, walk = shared.walk, filesList = shared.filesList;

var IGNORED_UNLISTED = ['_headers', '404.html', 'sw.js', 'icons/icon-maskable.svg'];
var SINKS = [
  ['innerHTML', /\binnerHTML\b/],
  ['outerHTML', /\bouterHTML\b/],
  ['insertAdjacentHTML', /\binsertAdjacentHTML\b/],
  ['document.write', /\bdocument\s*\.\s*write(ln)?\s*\(/],
  ['eval(', /\beval\s*\(/],
  ['new Function', /\bnew\s+Function\b/],
  ['string timer', /\b(setTimeout|setInterval)\s*\(\s*['"`]/],
  ['javascript:', /javascript:/i]
];

/* Drop comments so a note about innerHTML does not trip the guard. Keeps line numbers. */
function stripJsComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, function (m) { return m.replace(/[^\n]/g, ' '); })
    .replace(/(^|[^:'"\w])\/\/[^\n]*/g, '$1');
}
function stripHtmlComments(src) {
  return src.replace(/<!--[\s\S]*?-->/g, function (m) { return m.replace(/[^\n]/g, ' '); });
}

function isAllowed(allow, file, line) {
  var t = line.trim();
  return (allow || []).some(function (a) { return a.file === file && a.line === t; });
}

function cspFromMeta(html) {
  var m = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i.exec(html);
  return m ? m[1] : null;
}
function cspFromHeaders(txt) {
  var m = /^\s*Content-Security-Policy:\s*(.+)$/m.exec(txt);
  return m ? m[1].trim() : null;
}
function normCsp(s) {
  return s.split(';').map(function (d) { return d.trim().replace(/\s+/g, ' '); })
    .filter(function (d) { return d && d.indexOf('frame-ancestors') !== 0; }).sort().join('; ');
}

function check(root, allow, options) {
  options = options || {};
  var pub = path.join(root, 'public');
  var errs = [];
  function fail(msg) { errs.push(msg); }

  /* 1. Code sinks in scripts and the service worker. */
  var scripts = [];
  if (exists(path.join(pub, 'js'))) walk(path.join(pub, 'js'), 'public/js', []).forEach(function (f) { scripts.push(f); });
  if (exists(path.join(pub, 'sw.js'))) scripts.push('public/sw.js');
  scripts.forEach(function (f) {
    if (!/\.js$/.test(f)) return;
    var raw = read(path.join(root, f)).split('\n');
    var clean = stripJsComments(read(path.join(root, f))).split('\n');
    clean.forEach(function (line, i) {
      SINKS.forEach(function (s) {
        if (s[1].test(line) && !isAllowed(allow, f, raw[i])) fail(f + ':' + (i + 1) + ': forbidden ' + s[0]);
      });
    });
  });

  /* 2. Inline script, on* attributes and style attributes in the HTML pages. */
  ['index.html', '404.html'].forEach(function (n) {
    var p = path.join(pub, n);
    if (!exists(p)) return;
    var html = stripHtmlComments(read(p));
    var f = 'public/' + n, m, re;
    re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    while ((m = re.exec(html))) {
      if (m[2].trim() !== '') fail(f + ': inline <script> body');
      if (!/\bsrc\s*=/.test(m[1])) fail(f + ': <script> without src');
    }
    re = /<[a-z][^>]*\s(on[a-z]+)\s*=/gi;
    while ((m = re.exec(html))) fail(f + ': inline event attribute ' + m[1]);
    re = /<[a-z][^>]*\sstyle\s*=/gi;
    while ((m = re.exec(html))) fail(f + ': style attribute');
    re = /<style\b/gi;
    while ((m = re.exec(html))) fail(f + ': inline <style> block');
  });

  /* 3. Remote hosts anywhere in the shipped source. */
  if (exists(pub)) walk(pub, '', []).forEach(function (rel) {
    if (!/\.(js|css|html|webmanifest|svg|json)$/.test(rel) && rel !== '_headers') return;
    var src = read(path.join(pub, rel));
    if (/\.js$/.test(rel) || /\.css$/.test(rel)) src = stripJsComments(src);
    if (/\.html$/.test(rel)) src = stripHtmlComments(src);
    src = src.replace(/xmlns(:\w+)?\s*=\s*["'][^"']*["']/g, '');
    src = src.split('http://www.w3.org/2000/svg').join('');   // the SVG namespace is a name, not an address anything fetches
    src.split('\n').forEach(function (line, i) {
      if (/https?:\/\//i.test(line) || /["'(]\/\/[a-z0-9]/i.test(line)) fail('public/' + rel + ':' + (i + 1) + ': remote URL');
    });
  });

  /* 4. The two CSP declarations must agree (frame-ancestors only works as a header). */
  var idx = path.join(pub, 'index.html'), hdr = path.join(pub, '_headers');
  if (exists(idx) && exists(hdr)) {
    var a = cspFromMeta(read(idx)), b = cspFromHeaders(read(hdr));
    if (a === null) fail('public/index.html: no CSP <meta> tag');
    else if (b === null) fail('public/_headers: no Content-Security-Policy');
    else if (normCsp(a) !== normCsp(b)) fail('CSP in index.html and _headers differ (ignoring frame-ancestors)');
  }

  /* 5. FILES in the service worker and the files on disk must agree. */
  var sw = path.join(pub, 'sw.js');
  if (exists(sw)) {
    var list = filesList(read(sw));
    if (!list) fail('public/sw.js: FILES list not found');
    else {
      list.forEach(function (f) {
        if (f === './') { if (!exists(idx)) fail('FILES names ./ but public/index.html is missing'); return; }
        if (!exists(path.join(pub, f))) fail('FILES names a file that does not exist: ' + f);
      });
      walk(pub, '', []).forEach(function (rel) {
        if (rel === 'index.html') return;
        if (list.indexOf(rel) === -1 && IGNORED_UNLISTED.indexOf(rel) === -1) fail('public/' + rel + ' is not in FILES in sw.js');
      });
    }
  }

  /* 6. The cache name must be the hash of the files, so a forgotten bump fails here. */
  if (options.stamp !== false) stampLib.verify(root).forEach(fail);
  return errs;
}

module.exports = { check: check };

if (require.main === module) {
  var root = path.join(__dirname, '..');
  var allowPath = path.join(__dirname, 'check-allow.json');
  var allow = exists(allowPath) ? JSON.parse(read(allowPath)) : [];
  var errs = check(root, allow);
  if (errs.length) {
    console.error('check failed:\n  ' + errs.join('\n  '));
    process.exit(1);
  }
  console.log('check passed');
}
