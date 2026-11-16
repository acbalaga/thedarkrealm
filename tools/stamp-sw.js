'use strict';
/* Computes the version stamp of the shipped files and writes it into public/sw.js (CACHE) and
   public/js/version.js. The stamp is a SHA-256 over every file listed in FILES, in sorted order,
   except version.js itself (it holds the stamp). Run: npm run stamp
   verify(root) returns a list of problems; `npm run check` fails on any. */
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var shared = require('./shared.js');

var VERSION_FILE = 'js/version.js';

function fileFor(pub, f) { return f === './' ? path.join(pub, 'index.html') : path.join(pub, f); }

function compute(root) {
  var pub = path.join(root, 'public');
  var files = shared.filesList(shared.read(path.join(pub, 'sw.js')));
  if (!files) throw new Error('public/sw.js: FILES list not found');
  var h = crypto.createHash('sha256');
  files.slice().sort().forEach(function (f) {
    if (f === VERSION_FILE) return;
    var p = fileFor(pub, f);
    if (!fs.existsSync(p)) throw new Error('FILES names a file that does not exist: ' + f);
    h.update(f + '\0');
    h.update(fs.readFileSync(p));
    h.update('\0');
  });
  return 'tdr-' + h.digest('hex').slice(0, 10);
}

function versionSource(stamp) {
  return "/* Written by tools/stamp-sw.js. Do not edit. game.js reads it once and removes it. */\nwindow.TDR_VERSION = '" + stamp + "';\n";
}

function stamp(root) {
  var pub = path.join(root, 'public');
  var swPath = path.join(pub, 'sw.js'), vPath = path.join(pub, VERSION_FILE);
  // version.js has to exist before the hash is taken, because it is a listed file.
  if (!fs.existsSync(vPath)) fs.writeFileSync(vPath, versionSource('tdr-pending'));
  var s = compute(root);
  var sw = shared.read(swPath);
  if (!/var CACHE = '[^']*';/.test(sw)) throw new Error('public/sw.js: no "var CACHE = \'...\';" line');
  fs.writeFileSync(swPath, sw.replace(/var CACHE = '[^']*';/, "var CACHE = '" + s + "';"));
  fs.writeFileSync(vPath, versionSource(s));
  return s;
}

function verify(root) {
  var pub = path.join(root, 'public'), errs = [];
  var swPath = path.join(pub, 'sw.js'), vPath = path.join(pub, VERSION_FILE);
  if (!fs.existsSync(swPath)) return errs;
  var want;
  try { want = compute(root); } catch (e) { return [e.message]; }
  var m = /var CACHE = '([^']*)';/.exec(shared.read(swPath));
  if (!m || m[1] !== want) errs.push('public/sw.js: CACHE is ' + (m ? m[1] : 'missing') + ' but the files hash to ' + want + '. Run npm run stamp.');
  if (!fs.existsSync(vPath)) errs.push('public/' + VERSION_FILE + ' is missing. Run npm run stamp.');
  else if (shared.read(vPath) !== versionSource(want)) errs.push('public/' + VERSION_FILE + ' does not hold ' + want + '. Run npm run stamp.');
  return errs;
}

module.exports = { compute: compute, stamp: stamp, verify: verify, versionSource: versionSource };

if (require.main === module) console.log('stamped ' + stamp(path.join(__dirname, '..')));
