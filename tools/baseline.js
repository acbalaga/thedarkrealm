'use strict';
/* Rebuilds the numbers in docs/design/balance-baseline.md from a fresh simulator run: the answers table and the
   raw output. The notes between them are written by hand and left alone.
   Run: npm run baseline   (about 2 minutes: three policies, 60 simulated days, seed 1)
   Pass --json <file> to reuse a saved `npm run sim -- --json` result instead of running again. */
var fs = require('fs');
var path = require('path');
var sim = require('./sim.js');

var DOC = path.join(__dirname, '..', 'docs', 'design', 'balance-baseline.md');
var DAY = 86400, HOUR = 3600;

function dur(sec) {
  if (sec < 90) return Math.round(sec) + ' s';
  if (sec < 5400) return Math.round(sec / 60) + ' min';
  if (sec < 2 * DAY) return (sec / HOUR).toFixed(1) + ' h';
  return (sec / DAY).toFixed(1) + ' days';
}
function find(r, name) { return r.milestones.filter(function (m) { return m.name === name; })[0]; }
function cell(r, name, key) { var m = find(r, name); return m ? dur(m[key]) : 'never'; }

function build(results) {
  var by = {};
  results.forEach(function (r) { by[r.policy] = r; });
  var rows = [
    ['First Unlighting that yields Nightglass is possible (present)', 'Unlighting first possible (yield >= 1)', 'present'],
    ['First Unlighting under the simulator\'s rule (present)', 'First Unlighting', 'present'],
    ['First Unlighting under the rule (elapsed)', 'First Unlighting', 'elapsed'],
    ['Sunshaft 150 (present)', 'Sunshaft 150', 'present'],
    ['Sunshaft 150 (elapsed)', 'Sunshaft 150', 'elapsed'],
    ['All perks (present)', 'All perks', 'present'],
    ['All perks (elapsed)', 'All perks', 'elapsed']
  ];
  var table = ['| Question | idle | casual | active |', '| --- | --- | --- | --- |'];
  rows.forEach(function (row) {
    table.push('| ' + row[0] + ' | ' + ['idle', 'casual', 'active'].map(function (p) { return by[p] ? cell(by[p], row[1], row[2]) : 'n/a'; }).join(' | ') + ' |');
  });
  var raw = results.map(sim.render).join('\n\n');
  return { table: table.join('\n'), raw: raw };
}

function main() {
  var args = process.argv.slice(2), results;
  var at = args.indexOf('--json');
  if (at >= 0) {
    results = JSON.parse(fs.readFileSync(args[at + 1], 'utf8'));
    if (!Array.isArray(results)) results = [results];
  } else {
    results = ['idle', 'casual', 'active'].map(function (p) { return sim.simulate({ policy: p, days: 60, seed: 1 }); });
  }
  var doc = fs.readFileSync(DOC, 'utf8');
  var b = build(results);
  doc = doc.replace(/(## Answers\n\n)\| Question[\s\S]*?\n\n/, function (m, head) { return head + b.table + '\n\n'; });
  doc = doc.replace(/(## Raw output\n\n```\n)[\s\S]*?(\n```\s*$)/, function (m, a, z) { return a + b.raw + z; });
  fs.writeFileSync(DOC, doc);
  console.log('updated ' + path.relative(process.cwd(), DOC));
}

module.exports = { build: build };
if (require.main === module) main();
