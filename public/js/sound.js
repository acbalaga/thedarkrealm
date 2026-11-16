/* The Dark Realm: sound and haptics. Everything is synthesised with WebAudio, so there are no audio files and no
   remote hosts. The context is made only after a real player gesture and is suspended when the page is hidden.
   Quiet by design: master volume 0.4 by default and no cue peaks above 0.2 before the master gain.
   Plain script, runs from file://. env is only for tests: { AudioContext, now, vibrate }. */
window.TDR_SOUND = (function () {
  'use strict';

  var PEAK = 0.2;                 // loudest any cue gets before the master gain (about -14 dBFS)
  var MAX_PER_SECOND = 12;

  function create(env) {
    env = env || {};
    var ctx = null, master = null, amb = null, vol = 0.4, muted = false, ambience = true, cues = true, haptic = true, hidden = false;
    var recent = [], last = {}, depth = 0, ducked = false;
    var now = env.now || function () { return Date.now(); };

    function Ctor() { return env.AudioContext || (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null; }

    /* ---- building blocks ---- */
    function tone(freq, dur, opt) {
      opt = opt || {};
      var t0 = ctx.currentTime + (opt.at || 0), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = opt.type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (opt.to) o.frequency.linearRampToValueAtTime(opt.to, t0 + dur);
      var peak = Math.min(PEAK, opt.gain || 0.12);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.02, dur / 4));
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    }
    function noiseBuffer(sec, brown) {
      var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), last = 0;
      for (var i = 0; i < n; i++) {
        var w = Math.random() * 2 - 1;
        if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
      }
      return b;
    }
    function puff(dur, freq, gain, at) {
      var t0 = ctx.currentTime + (at || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuffer(dur, false);
      f.type = 'bandpass'; f.frequency.value = freq;
      var peak = Math.min(PEAK, gain);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 0.01);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t0); s.stop(t0 + dur + 0.05);
    }

    /* ---- the cues: name -> { min: least ms between plays, buzz: haptic pattern, fn } ---- */
    var CUES = {
      gather: { min: 60, buzz: 8, fn: function () { tone(110 + Math.random() * 30, 0.08, { gain: 0.12, to: 100 }); } },
      bind: { min: 80, fn: function () { tone(330, 0.08, { gain: 0.1 }); tone(220, 0.08, { gain: 0.1, at: 0.08 }); } },
      working: { min: 120, fn: function () { tone(523, 0.4, { gain: 0.1 }); tone(1046, 0.3, { gain: 0.03 }); } },
      rite: { min: 120, fn: function () { tone(98, 0.3, { gain: 0.14, type: 'triangle' }); } },
      lantern: { min: 1500, fn: function () { tone(1250, 0.5, { gain: 0.04 }); } },
      snuff: { min: 80, buzz: 20, fn: function () { puff(0.12, 900, 0.1); tone(70, 0.15, { gain: 0.14, at: 0.08 }); } },
      seal: { min: 300, buzz: [15, 40, 15], fn: function () { tone(392, 0.15, { gain: 0.1 }); tone(330, 0.15, { gain: 0.1, at: 0.15 }); tone(262, 0.25, { gain: 0.1, at: 0.3 }); } },
      fail: { min: 300, fn: function () { tone(82, 0.5, { gain: 0.14, type: 'triangle' }); } },
      omen: { min: 300, fn: function () { tone(440, 0.2, { gain: 0.08 }); tone(587, 0.3, { gain: 0.08, at: 0.18 }); } },
      page: { min: 200, fn: function () { puff(0.12, 3000, 0.06); } },
      unlight: { min: 6000, buzz: 120, fn: function () { glideAmbience(); } },
      litany: { min: 300, fn: function () { tone(196, 0.6, { gain: 0.08 }); tone(294, 0.6, { gain: 0.07 }); tone(441, 0.6, { gain: 0.05 }); } },
      toast: { min: 400, fn: function () { tone(660, 0.05, { gain: 0.03 }); } }
    };

    /* ---- the ambience: a drone with brown noise under a slow tremolo ---- */
    var amb_nodes = null;
    function startAmbience() {
      if (!ctx || amb_nodes || !ambience) return;
      var g = ctx.createGain(), trem = ctx.createGain(), lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
      var a = ctx.createOscillator(), b = ctx.createOscillator(), ag = ctx.createGain();
      a.frequency.value = 55; b.frequency.value = 55.4;
      ag.gain.value = 0.05;
      var n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
      n.buffer = noiseBuffer(2, true); n.loop = true;
      nf.type = 'lowpass'; nf.frequency.value = 160 + 20 * Math.min(12, depth);
      ng.gain.value = 0.03;
      lfo.frequency.value = 0.07; lfoGain.gain.value = 0.25; trem.gain.value = 0.75;
      lfo.connect(lfoGain); lfoGain.connect(trem.gain);
      a.connect(ag); b.connect(ag); ag.connect(trem);
      n.connect(nf); nf.connect(ng); ng.connect(trem);
      trem.connect(g); g.connect(master);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);                        // fade in over 3 s
      [a, b, n, lfo].forEach(function (x) { x.start(); });
      amb_nodes = { g: g, a: a, b: b, nf: nf, ng: ng, ag: ag, oscs: [a, b, n, lfo] };
    }
    function stopAmbience() {
      if (!amb_nodes) return;
      var nodes = amb_nodes, t = ctx.currentTime;
      amb_nodes = null;
      nodes.g.gain.cancelScheduledValues && nodes.g.gain.cancelScheduledValues(t);
      nodes.g.gain.linearRampToValueAtTime(0.0001, t + 1);                            // fade out over 1 s
      nodes.oscs.forEach(function (x) { try { x.stop(t + 1.1); } catch (e) {} });
    }
    function glideAmbience() {
      if (!amb_nodes) return;
      var t = ctx.currentTime, a = amb_nodes.a, b = amb_nodes.b;
      [[a, 55], [b, 55.4]].forEach(function (p) {
        p[0].frequency.cancelScheduledValues && p[0].frequency.cancelScheduledValues(t);
        p[0].frequency.setValueAtTime(p[1], t);
        p[0].frequency.linearRampToValueAtTime(p[1] / 2, t + 4);                      // a 4 s fall by an octave
        p[0].frequency.setValueAtTime(p[1] / 2, t + 5);                               // then a second of the low note
        p[0].frequency.linearRampToValueAtTime(p[1], t + 5.5);                        // and the drone returns
      });
    }
    function applyMaster() { if (master) master.gain.value = muted ? 0 : vol; }
    function applyDuck() { if (amb_nodes) amb_nodes.ng.gain.value = ducked ? 0.03 / 2 : 0.03; }   // minus 6 dB while the Hush lasts

    var api = {
      /* On the first trusted gesture. Safe to call again. */
      init: function () {
        if (ctx) return true;
        var C = Ctor();
        if (!C) return false;
        try {
          ctx = new C();
          master = ctx.createGain();
          master.connect(ctx.destination);
          applyMaster();
          if (!hidden && !muted) startAmbience();
        } catch (e) { ctx = null; return false; }
        return true;
      },
      ready: function () { return !!ctx && ctx.state !== 'suspended' && !hidden; },
      setVolume: function (v) { vol = Math.max(0, Math.min(1, v)); applyMaster(); },
      setMuted: function (m) { muted = !!m; applyMaster(); if (ctx) { if (muted) stopAmbience(); else if (!hidden) startAmbience(); } },
      setAmbience: function (on) { ambience = !!on; if (ctx) { if (ambience && !muted && !hidden) startAmbience(); else stopAmbience(); } },
      setCues: function (on) { cues = !!on; },
      setHaptic: function (on) { haptic = !!on; },
      setDepth: function (fathom) { depth = Math.max(0, Math.min(12, fathom || 0)); if (amb_nodes) amb_nodes.nf.frequency.value = 160 + 20 * depth; },
      duck: function (on) { ducked = !!on; applyDuck(); },
      setHidden: function (h) {
        hidden = !!h;
        if (!ctx) return;
        if (hidden) { stopAmbience(); if (ctx.suspend) ctx.suspend(); }
        else { if (ctx.resume) ctx.resume(); if (ambience && !muted) startAmbience(); }
      },
      /* Plays a cue. Returns true when it sounded. Never throws. */
      play: function (name) {
        var cue = CUES[name];
        if (!cue) return false;
        var t = now();
        if (haptic && cue.buzz && api.vibrate) api.vibrate(cue.buzz);
        if (!ctx || hidden || muted || !cues || ctx.state === 'suspended') return false;
        recent = recent.filter(function (x) { return t - x < 1000; });
        if (recent.length >= MAX_PER_SECOND) return false;
        if (last[name] !== undefined && t - last[name] < cue.min) return false;
        last[name] = t; recent.push(t);
        try { cue.fn(); } catch (e) { return false; }
        return true;
      },
      vibrate: env.vibrate !== undefined ? env.vibrate : (typeof navigator !== 'undefined' && navigator.vibrate ? function (p) { try { navigator.vibrate(p); } catch (e) {} } : null),
      cueNames: function () { return Object.keys(CUES); }
    };
    return api;
  }

  return { create: create, PEAK: PEAK, MAX_PER_SECOND: MAX_PER_SECOND };
})();
