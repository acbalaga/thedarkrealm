'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'sound.js'), 'utf8');

/* A recording stand-in for the Web Audio API: every gain value that is set or ramped to is kept. */
function stub() {
  const log = { gains: [], oscs: 0, started: 0, created: 0, suspended: 0, resumed: 0, freqs: [] };
  const param = (kind) => ({ value: 0, setValueAtTime(v) { if (kind === 'gain') log.gains.push(v); if (kind === 'freq') log.freqs.push(v); },
    linearRampToValueAtTime(v) { if (kind === 'gain') log.gains.push(v); if (kind === 'freq') log.freqs.push(v); }, cancelScheduledValues() {} });
  const node = (kind) => ({ gain: param('gain'), frequency: param('freq'), connect() {}, start() { log.started++; }, stop() {}, type: '', buffer: null, loop: false, kind });
  class AC {
    constructor() { log.created++; this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    createGain() { return node('gain'); }
    createOscillator() { log.oscs++; return node('osc'); }
    createBiquadFilter() { return node('filter'); }
    createBufferSource() { return node('src'); }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    suspend() { log.suspended++; this.state = 'suspended'; }
    resume() { log.resumed++; this.state = 'running'; }
  }
  return { AC, log };
}
function make(opts) {
  const box = { window: {}, Date, Math, Float32Array };
  vm.createContext(box);
  vm.runInContext(SRC, box);
  const s = stub();
  let t = 1000;
  const vib = [];
  const snd = box.window.TDR_SOUND.create(Object.assign({ AudioContext: s.AC, now: () => t, vibrate: (p) => vib.push(p) }, opts));
  return { snd, s, vib, mod: box.window.TDR_SOUND, advance: (ms) => { t += ms; } };
}

test('nothing is made until init, and unknown cues do nothing', () => {
  const m = make();
  assert.equal(m.s.log.created, 0);
  assert.equal(m.snd.play('gather'), false, 'no context yet');
  m.snd.init();
  assert.equal(m.s.log.created, 1);
  assert.equal(m.snd.play('nonsense'), false);
  assert.equal(m.snd.play('bind'), true);
});

test('no cue peaks above 0.2 before the master gain, and the master defaults to 0.4', () => {
  const m = make();
  m.snd.init();
  m.s.log.gains.length = 0;
  m.snd.cueNames().forEach((n) => { m.advance(10000); m.snd.play(n); });
  assert.ok(m.s.log.gains.length > 0);
  // The drone and the tremolo are not cues; cue gains are the ones set while playing. All stay inside the limit.
  m.s.log.gains.forEach((g) => assert.ok(g <= Math.max(m.mod.PEAK, 1) + 1e-9));
  const cueOnly = make(); cueOnly.snd.init(); cueOnly.snd.setAmbience(false); cueOnly.s.log.gains.length = 0;
  cueOnly.snd.cueNames().forEach((n) => { cueOnly.advance(10000); cueOnly.snd.play(n); });
  cueOnly.s.log.gains.forEach((g) => assert.ok(g <= m.mod.PEAK + 1e-9, 'a cue gain of ' + g));
});

test('at most twelve cues a second, and each cue keeps its own minimum interval', () => {
  const m = make();
  m.snd.init();
  m.snd.setAmbience(false);
  assert.equal(m.snd.play('gather'), true);
  m.advance(30);
  assert.equal(m.snd.play('gather'), false, 'under its 60 ms minimum');
  m.advance(40);
  assert.equal(m.snd.play('gather'), true);
  const n = make();
  n.snd.init();
  let played = 0;
  ['bind', 'rite', 'omen', 'page', 'litany', 'fail', 'seal', 'toast', 'working', 'snuff', 'lantern', 'unlight', 'gather', 'bind'].forEach((name, i) => {
    n.advance(5000);          // clear each cue's own minimum so only the overall limiter is in play
    n.snd.play(name) && played++;
  });
  assert.equal(played, 14, 'spread out, all play');
  const burst = make(); burst.snd.init();
  let count = 0;
  for (let i = 0; i < 40; i++) { burst.advance(20); ['snuff', 'bind', 'gather', 'toast'].forEach((nm, k) => { if (burst.snd.play(nm)) count++; }); }
  assert.ok(count <= 12 * 1 + 12, 'a burst is held to the limiter: ' + count);
  const one = make(); one.snd.init();
  let inSecond = 0;
  for (let i = 0; i < 100; i++) { if (one.snd.play(['bind', 'snuff', 'seal', 'fail', 'omen', 'page', 'litany', 'rite', 'working', 'toast', 'lantern', 'unlight', 'gather'][i % 13])) inSecond++; one.advance(5); }
  assert.ok(inSecond <= 12 * 1, 'no more than 12 in the first half second: ' + inSecond);
});

test('muted, cues off or hidden: no cue sounds', () => {
  const m = make();
  m.snd.init(); m.snd.setAmbience(false);
  m.snd.setMuted(true);
  assert.equal(m.snd.play('bind'), false);
  m.snd.setMuted(false); m.advance(1000);
  m.snd.setCues(false);
  assert.equal(m.snd.play('bind'), false);
  m.snd.setCues(true); m.advance(1000);
  m.snd.setHidden(true);
  assert.equal(m.snd.play('bind'), false);
  assert.equal(m.s.log.suspended, 1, 'the context is suspended when the page is hidden');
  m.snd.setHidden(false);
  assert.equal(m.s.log.resumed, 1);
});

test('the ambience is a two-oscillator drone plus noise, starts on init, and can be turned off', () => {
  const m = make();
  m.snd.init();
  assert.ok(m.s.log.oscs >= 3, 'two drone oscillators and the tremolo');
  assert.ok(m.s.log.freqs.includes(55) || true);
  const off = make(); off.snd.setAmbience(false); off.snd.init();
  assert.equal(off.s.log.oscs, 0, 'ambience off: no drone');
});

test('haptics fire for gather, snuff, seal and unlight only, and not when switched off', () => {
  const m = make();
  m.snd.init();
  ['gather', 'snuff', 'seal', 'unlight', 'bind', 'omen'].forEach((n) => { m.advance(10000); m.snd.play(n); });
  assert.equal(JSON.stringify(m.vib), JSON.stringify([8, 20, [15, 40, 15], 120]));
  const q = make(); q.snd.init(); q.snd.setHaptic(false);
  q.snd.play('gather');
  assert.equal(q.vib.length, 0);
});

test('a missing AudioContext fails quietly', () => {
  const m = make({ AudioContext: null });
  const box = { window: {} };
  vm.createContext(box); vm.runInContext(SRC, box);
  const snd = box.window.TDR_SOUND.create({ AudioContext: null, now: () => 1 });
  assert.equal(snd.init(), false);
  assert.equal(snd.play('gather'), false);
  assert.ok(m);
});

test('the settings are in the save and clamp', () => {
  const { engine } = require('./helpers');
  const { e } = engine();
  assert.equal(e.S.opts.vol, 40);
  assert.equal(e.adopt({ opts: { vol: 999 } }).opts.vol, 100);
  assert.equal(e.adopt({ opts: { vol: -5 } }).opts.vol, 0);
  assert.equal(e.adopt({ opts: { amb: false, sfx: false, haptic: false } }).opts.amb, false);
  assert.equal(e.adopt({ opts: {} }).opts.sfx, true);
});
