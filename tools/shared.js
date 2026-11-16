'use strict';
/* Helpers shared by the build tools. No dependencies. */
var fs = require('fs');
var path = require('path');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function exists(p) { return fs.existsSync(p); }

function walk(dir, base, out) {
  fs.readdirSync(dir).forEach(function (n) {
    var full = path.join(dir, n);
    var rel = base ? base + '/' + n : n;
    if (fs.statSync(full).isDirectory()) walk(full, rel, out); else out.push(rel);
  });
  return out;
}

function filesList(swSrc) {
  var m = /var\s+FILES\s*=\s*\[([\s\S]*?)\]/.exec(swSrc);
  if (!m) return null;
  var out = [], re = /'([^']*)'|"([^"]*)"/g, x;
  while ((x = re.exec(m[1]))) out.push(x[1] !== undefined ? x[1] : x[2]);
  return out;
}

module.exports = { read: read, exists: exists, walk: walk, filesList: filesList };
