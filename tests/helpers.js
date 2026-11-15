'use strict';
/* Loads the real data.js and core.js into a vm context with a stub `window`, so the rules run
   exactly as shipped but with a controllable clock, a seeded random and an in-memory store. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'public', 'js');

function load() {
  const box = {
    window: {},
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary')
  };
  vm.createContext(box);
  ['data.js', 'core.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), box, { filename: f }));
  return { D: box.window.TDR_DATA, create: box.window.TDR_CORE.create, window: box.window };
}

/* mulberry32: small seeded generator, so lantern rolls are repeatable. */
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* A fake environment. clock.wall and clock.mono are milliseconds and move only when a test says so. */
function fakeEnv(opts) {
  opts = opts || {};
  const clock = { wall: opts.wall || 1.7e12, mono: opts.mono || 1000 };
  const map = new Map(opts.storage || []);
  const said = [];
  const env = {
    wallNow: () => clock.wall,
    monoNow: () => clock.mono,
    random: seeded(opts.seed || 1),
    hidden: () => !!clock.hidden,
    prefersReducedMotion: () => !!opts.reducedMotion,
    sky: !!opts.sky,                       // the Surface Clock is off in tests unless one asks for it
    say: (m) => said.push(m),
    storage: {
      get: (k) => (map.has(k) ? map.get(k) : null),
      set: (k, v) => { if (opts.refuse) throw new Error('quota'); map.set(k, String(v)); },
      remove: (k) => { map.delete(k); }
    }
  };
  return { env, clock, map, said };
}

/* Engine on a fresh fake environment, with a fresh realm loaded. */
function engine(opts) {
  const { D, create } = load();
  const f = fakeEnv(opts);
  const e = create(D, f.env);
  e.load();
  e.recalc();
  e.start();
  return Object.assign(f, { e, D });
}

const FIX = path.join(__dirname, 'fixtures');
function fixtures() {
  return fs.readdirSync(FIX).filter((n) => n.endsWith('.txt')).sort()
    .map((n) => ({ name: n.replace(/\.txt$/, ''), text: fs.readFileSync(path.join(FIX, n), 'utf8').trim() }));
}

/* States built in another realm do not deep-equal by prototype, so compare as JSON. */
const j = (x) => JSON.stringify(x);

module.exports = { load, seeded, fakeEnv, engine, fixtures, j };
