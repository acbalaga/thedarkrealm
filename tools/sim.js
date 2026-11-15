'use strict';
/* Headless balance simulator. Drives the real engine (public/js/core.js) with a fake clock,
   so away time, caps and the monotonic rules behave exactly as in play. No DOM, no network.
   Run: npm run sim -- [--policy idle|casual|active|all] [--days 60] [--seed 1] [--json] */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var JS = path.join(__dirname, '..', 'public', 'js');
process.env.TZ = 'UTC';          // the Surface Clock reads local time: pin it so a run is the same on every machine
var WALL0 = Date.UTC(2026, 0, 1);   // the fake wall clock starts at local midnight, so the policies meet a real day
var STEP = 5;                  // seconds per present step (a Stray Lantern lasts 14, so every one is seen)
var HOUR = 3600, DAY = 86400;

function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadCore() {
  var box = {
    window: {},
    btoa: function (s) { return Buffer.from(s, 'binary').toString('base64'); },
    atob: function (s) { return Buffer.from(s, 'base64').toString('binary'); }
  };
  vm.createContext(box);
  ['data.js', 'core.js'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), box, { filename: f });
  });
  return { D: box.window.TDR_DATA, create: box.window.TDR_CORE.create };
}

/* ---------- policies ----------
   sessions(day): list of [start offset in seconds into the day, length in seconds].
   clickRate(sim): hand gathers per second while present.
   snuff: share of lanterns snuffed while present.
   handValue: clicks per second the policy is assumed to make over a whole day, used to
   value hand Workings by payback. */
function every(startH, endH, stepMin, lenSec) {
  var out = [];
  for (var t = startH * 60; t < endH * 60; t += stepMin) out.push([t * 60, lenSec]);
  return out;
}
var POLICIES = {
  idle: {
    sessions: function () { return every(0, 24, 240, 180); },
    clickRate: function () { return 0; }, snuff: 0, handValue: function () { return 0; }
  },
  casual: {
    sessions: function () { return every(7, 23, 90, 300); },
    clickRate: function (sim) { return sim.present < 600 ? 4 : 0; }, snuff: 0.5,
    handValue: function (sim) { return sim.present < 600 ? 4 : 0; }
  },
  active: {
    sessions: function () { return [[8 * HOUR, 1800], [12 * HOUR, 1800], [18 * HOUR, 1800], [21 * HOUR, 1800]]; },
    clickRate: function () { return 8 * 0.2; }, snuff: 0.9, litanies: true,
    handValue: function () { return 8 * 0.2 * 7200 / DAY; }
  }
};

/* ---------- spending ---------- */
function bestPurchase(e, policy, sim) {
  var C = e.C, S = e.S, best = null, pb, add, i;
  function consider(kind, id, cost, gain) {
    if (!(gain > 0) || !isFinite(cost)) return;
    var p = cost / gain;
    if (!best || p < best.pb) best = { kind: kind, id: id, cost: cost, pb: p };
  }
  for (i = 0; i < sim.D.DENIZENS.length; i++) {
    var d = sim.D.DENIZENS[i];
    consider('den', d.id, e.denCost(d, e.cnt(d.id), 1), C.denEach[d.id]);
  }
  var clicks = policy.handValue(sim);
  var ups = e.availableUpgs();
  for (i = 0; i < ups.length; i++) {
    var u = ups[i];
    if (u.kind === 'den') add = C.denOut[u.den];
    else if (u.kind === 'realm') add = 0.5 * C.gps;
    else if (u.kind === 'hand0') add = (C.click - sim.pctOfDen(e)) * clicks;
    else add = 0.02 * C.denGps * clicks;
    consider('upg', u.id, u.cost, add);
  }
  return best;
}

function spendGloom(e, policy, sim) {
  for (var iter = 0; iter < 500; iter++) {
    var b = bestPurchase(e, policy, sim);
    if (!b || e.S.gloom < b.cost) return;
    if (!(b.kind === 'den' ? e.buyDenizen(b.id) : e.buyUpg(b.id))) return;
  }
}

function spendEchoes(e, sim) {
  var S = e.S, R = sim.D.RITES, i, r, c;
  for (var iter = 0; iter < 200; iter++) {
    var edgeNeeded = S.shaftTop % 10 === 0 && e.shaftMaxHp(S.shaftTop) / e.C.might > e.BOSS_TIME * 0.8;
    var pick = null;
    if (edgeNeeded) {
      pick = R[0];
      if (S.echoes < e.riteCost(pick)) return;           // save for the edge, do not drain other Rites
    } else {
      for (i = 0; i < R.length; i++) {
        r = R[i]; c = e.riteCost(r);
        if (r.max && e.rl(r.id) >= r.max) continue;
        if (!pick || c < e.riteCost(pick)) pick = r;
      }
    }
    if (!pick || !e.buyRite(pick.id)) return;
  }
}

/* Teeth and the Held Breath on any Lampwarden the Host cannot otherwise beat; the Undertow whenever it is ready. */
function speakLitanies(e) {
  var S = e.S, f = e.facts();
  if (f.boss && S.shaft % 10 === 0) {
    if (S.lit.teeth.cd === 0) e.speakLitany('teeth', true);
    if (S.lit.breath.cd === 0) e.speakLitany('breath', true);
  }
  if (S.lit.undertow.cd === 0) e.speakLitany('undertow', true);
}

function spendGlass(e, sim) {
  for (var iter = 0; iter < 50; iter++) {
    var pick = null;
    sim.D.PERKS.forEach(function (p) { if (!e.perk(p.id) && e.S.glass >= p.cost && (!pick || p.cost < pick.cost)) pick = p; });
    if (!pick || !e.buyPerk(pick.id)) return;
  }
}

/* ---------- unlighting rule ---------- */
function maybeUnlight(e, sim) {
  var S = e.S;
  if (S.runTime < 60) return false;
  var g = e.glassGain();
  var rate = Math.pow(S.runGloom / 1e9, e.GLASS_EXP) / (S.runTime / HOUR);
  if (rate > sim.peak) sim.peak = rate;
  if (g < 1 || rate > 0.7 * sim.peak) return false;
  if (S.unlightings > 0 && g < 0.2 * S.glassTotal) return false;
  var before = { t: sim.t, present: sim.present, played: S.played, shaft: S.bestShaft };
  if (!e.unlight()) return false;
  sim.fathoms.push({
    n: S.unlightings, duration: sim.t - sim.fathomStart, present: sim.present - sim.fathomPresent,
    glass: g, deepest: before.shaft
  });
  sim.fathomStart = sim.t; sim.fathomPresent = sim.present; sim.peak = 0;
  return true;
}

/* ---------- milestones ---------- */
function noteMilestones(e, sim) {
  var S = e.S;
  function mark(name, ok) {
    if (ok && !sim.msSeen[name]) {
      sim.msSeen[name] = true;
      sim.milestones.push({ name: name, elapsed: sim.t, present: sim.present, played: S.played });
    }
  }
  mark('First Sunshaft sealed', S.bestShaft >= 1);
  mark('First Rite', e.totalRites() >= 1);
  mark('Unlighting first possible (yield >= 1)', S.unlightings >= 1 || e.glassGain() >= 1);
  mark('First Unlighting', S.unlightings >= 1);
  [10, 50, 100, 150].forEach(function (n) { mark('Sunshaft ' + n, S.bestShaft >= n); });
  var all = true;
  sim.D.PERKS.forEach(function (p) {
    mark('Perk: ' + p.name, e.perk(p.id));
    if (!e.perk(p.id)) all = false;
  });
  mark('All perks', all);
}

/* ---------- run ---------- */
function simulate(opts) {
  opts = opts || {};
  var name = opts.policy || 'casual', days = opts.days || 60, seed = opts.seed === undefined ? 1 : opts.seed;
  var policy = POLICIES[name];
  if (!policy) throw new Error('Unknown policy: ' + name);
  var core = loadCore();
  var wall = WALL0, mono = 0;
  var rng = mulberry32(seed), prng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  /* The engine draws one number for the realm's seed while loading. That draw comes from a
     separate stream so the lantern rolls that follow are the same ones the baseline was built on. */
  var seedRng = mulberry32((seed ^ 0x85ebca6b) >>> 0), seeding = true;
  var env = {
    wallNow: function () { return wall; },
    monoNow: function () { return mono; },
    random: function () { return seeding ? seedRng() : rng(); },
    say: function () {},
    storage: { get: function () { return null; }, set: function () {}, remove: function () {} }
  };
  var e = core.create(core.D, env);
  e.load(); e.recalc(); e.start();
  seeding = false;
  e.S.opts.chatter = false;      // chatter draws random numbers; the baseline was built without it

  var sim = {
    D: core.D, t: 0, present: 0, peak: 0, fathomStart: 0, fathomPresent: 0, fathoms: [],
    milestones: [], msSeen: {},
    pctOfDen: function (en) {
      var p = 0;
      for (var i = 1; i < core.D.HAND_UPGS.length; i++) if (en.S.upg[core.D.HAND_UPGS[i].id]) p += 0.02;
      return p * en.C.denGps;
    }
  };
  var endT = days * DAY, seenLamp = {}, clickDebt = 0;

  for (var day = 0; day < days; day++) {
    var sessions = policy.sessions(day);
    for (var s = 0; s < sessions.length; s++) {
      var start = day * DAY + sessions[s][0], len = sessions[s][1];
      if (start >= endT) break;
      if (start > sim.t) { wall += (start - sim.t) * 1000; sim.t = start; }   // absent: wall clock only
      for (var el = 0; el < len && sim.t < endT; el += STEP) {
        wall += STEP * 1000; mono += STEP * 1000; sim.t += STEP; sim.present += STEP;
        e.tick();
        // Every lamp that comes into view is decided on once: snuffed with the policy's chance, otherwise left to drift past.
        e.lanterns.slice().forEach(function (l) {
          if (l.wait > 0 || seenLamp[l.id]) return;
          seenLamp[l.id] = true;
          if (prng() < policy.snuff) e.snuffLantern(true, l.id);
        });
        clickDebt += policy.clickRate(sim) * STEP;
        while (clickDebt >= 1) { e.gather(true); clickDebt -= 1; }
        spendGloom(e, policy, sim);
        if (e.S.unlocked.rites) spendEchoes(e, sim);
        if (policy.litanies && e.S.unlocked.rites) speakLitanies(e);
        if (maybeUnlight(e, sim)) spendGlass(e, sim);
        else if (e.S.glass > 0) spendGlass(e, sim);
        noteMilestones(e, sim);
      }
      if (opts.onSession) opts.onSession(e, sim);
    }
  }
  return {
    policy: name, days: days, seed: seed,
    milestones: sim.milestones, fathoms: sim.fathoms,
    end: { elapsed: sim.t, present: sim.present, played: e.S.played, unlightings: e.S.unlightings, bestShaft: e.S.bestShaft, glassTotal: e.S.glassTotal }
  };
}

/* ---------- output ---------- */
function dur(sec) {
  if (sec < 90) return Math.round(sec) + 's';
  if (sec < 5400) return (sec / 60).toFixed(0) + 'm';
  if (sec < 2 * DAY) return (sec / HOUR).toFixed(1) + 'h';
  return (sec / DAY).toFixed(1) + 'd';
}
function pad(s, n, right) { s = String(s); while (s.length < n) s = right ? ' ' + s : s + ' '; return s; }

function render(r) {
  var out = [];
  out.push('Policy ' + r.policy + ', ' + r.days + ' days, seed ' + r.seed);
  out.push('');
  out.push(pad('Milestone', 42) + pad('Elapsed', 10, 1) + pad('Present', 10, 1) + pad('Played', 10, 1));
  r.milestones.forEach(function (m) {
    out.push(pad(m.name, 42) + pad(dur(m.elapsed), 10, 1) + pad(dur(m.present), 10, 1) + pad(dur(m.played), 10, 1));
  });
  out.push('');
  out.push(pad('Fathom', 8) + pad('Duration', 10, 1) + pad('Present', 10, 1) + pad('Glass', 10, 1) + pad('Glass/h', 10, 1) + pad('Deepest', 9, 1));
  r.fathoms.forEach(function (f) {
    out.push(pad(f.n, 8) + pad(dur(f.duration), 10, 1) + pad(dur(f.present), 10, 1) + pad(f.glass, 10, 1) +
      pad((f.glass / (f.duration / HOUR)).toFixed(2), 10, 1) + pad(f.deepest, 9, 1));
  });
  out.push('');
  out.push('End: ' + r.end.unlightings + ' Unlightings, Sunshaft ' + r.end.bestShaft + ', ' + r.end.glassTotal + ' Nightglass, ' +
    dur(r.end.present) + ' present of ' + dur(r.end.elapsed));
  return out.join('\n');
}

function parseArgs(argv) {
  var o = { policy: 'all', days: 60, seed: 1, json: false };
  for (var i = 0; i < argv.length; i++) {
    var a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--policy') o.policy = argv[++i];
    else if (a === '--days') o.days = Number(argv[++i]);
    else if (a === '--seed') o.seed = Number(argv[++i]);
    else throw new Error('Unknown option: ' + a);
  }
  if (!(o.days > 0) || !isFinite(o.seed)) throw new Error('--days must be positive and --seed a number');
  return o;
}

module.exports = { simulate: simulate, render: render, POLICIES: POLICIES };

if (require.main === module) {
  try {
    var o = parseArgs(process.argv.slice(2));
    var names = o.policy === 'all' ? Object.keys(POLICIES) : [o.policy];
    var results = names.map(function (n) { return simulate({ policy: n, days: o.days, seed: o.seed }); });
    console.log(o.json ? JSON.stringify(results.length === 1 ? results[0] : results, null, 2) : results.map(render).join('\n\n'));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
