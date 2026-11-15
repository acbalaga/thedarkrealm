/* The Dark Realm: the throne room picture. Decorative only: nothing in the rules reads it. It is drawn on the
   scene canvas with shapes, so there are no image files. `view` is a plain snapshot the interface builds from the
   state; the layers never read live state. Plain script, runs from file://. */
window.TDR_SCENE = (function () {
  'use strict';

  /* Figures for a count: 1 for a kind just bound, 2 from 25, 3 from 100. */
  function tier(n) { return n >= 100 ? 3 : n >= 25 ? 2 : n >= 1 ? 1 : 0; }

  /* Where a cluster stands, as fractions of the box (x, y). Ten slots round the well, outside the 190 px circle
     around it; later kinds stand further back. */
  var SLOTS = [[0.14, 0.78], [0.86, 0.78], [0.24, 0.62], [0.76, 0.62], [0.12, 0.45], [0.88, 0.45], [0.2, 0.28], [0.8, 0.28], [0.34, 0.16], [0.66, 0.16]];

  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  /* Violet at the first fathom toward blue-black at the twelfth: [mid stop, edge stop]. */
  function depthTint(unlightings) {
    var t = Math.max(0, Math.min(12, unlightings)) / 12;
    function rgb(r, g, b) { return 'rgb(' + r + ',' + g + ',' + b + ')'; }
    return { mid: rgb(lerp(11, 8, t), lerp(9, 14, t), lerp(22, 30, t)), edge: rgb(lerp(6, 4, t), lerp(5, 8, t), lerp(11, 18, t)) };
  }

  /* The snapshot. s: { unlightings, den: {id: n}, ended, shaft, shaftHp, shaftMax, autoAdvance, paneLit, choice }; kinds: denizen ids in order. */
  function view(s, kinds) {
    var boss = s.shaft % 10 === 0 && s.autoAdvance;
    return {
      unlightings: s.unlightings, ended: !!s.ended, paneLit: s.paneLit || 0, choice: s.choice || '',
      kinds: kinds.map(function (id) { return { id: id, tier: tier(s.den[id] || 0) }; }),
      lamp: boss ? { on: true, frac: Math.max(0, Math.min(1, s.shaftHp / s.shaftMax)) } : { on: false, frac: 0 },
      tint: depthTint(s.unlightings)
    };
  }
  function signature(v) {
    return v.unlightings + '|' + v.ended + '|' + v.paneLit + '|' + v.choice + '|' + v.kinds.map(function (k) { return k.tier; }).join('') + '|' + (v.lamp.on ? Math.round(v.lamp.frac * 10) : 'x');
  }

  /* ---- the figures: a few strokes each ---- */
  var FIGURES = {
    gleaner: function (c, x, y, s) { c.beginPath(); c.arc(x, y, 2 * s, 0, 6.3); c.fill(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2 * s, y + 7 * s); c.lineTo(x + 5 * s, y + 5 * s); c.stroke(); },
    scribe: function (c, x, y, s) { c.beginPath(); c.arc(x, y, 2.5 * s, 0, 6.3); c.fill(); c.beginPath(); c.moveTo(x - 2 * s, y); c.lineTo(x - 7 * s, y - 3 * s); c.moveTo(x + 2 * s, y); c.lineTo(x + 7 * s, y - 3 * s); c.stroke(); },
    weaver: function (c, x, y, s) { c.beginPath(); c.moveTo(x - 6 * s, y + 6 * s); c.lineTo(x, y - 6 * s); c.lineTo(x + 6 * s, y + 6 * s); c.closePath(); c.fill(); },
    warden: function (c, x, y, s) { c.fillRect(x - 2 * s, y - 12 * s, 4 * s, 22 * s); },
    cantor: function (c, x, y, s) { c.beginPath(); c.arc(x, y - 4 * s, 3 * s, 0, 6.3); c.fill(); c.fillRect(x - 3 * s, y, 6 * s, 9 * s); },
    forge: function (c, x, y, s) { c.fillRect(x - 6 * s, y, 12 * s, 4 * s); c.fillRect(x - 3 * s, y - 5 * s, 6 * s, 5 * s); },
    tide: function (c, x, y, s) { c.beginPath(); c.arc(x, y, 7 * s, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke(); },
    choir: function (c, x, y, s) { for (var i = -2; i <= 2; i++) { c.beginPath(); c.arc(x + i * 4 * s, y + Math.abs(i), 1.6 * s, 0, 6.3); c.fill(); } },
    orchard: function (c, x, y, s) { c.fillRect(x - 1 * s, y, 2 * s, 8 * s); c.beginPath(); c.arc(x, y - 2 * s, 5 * s, 0, 6.3); c.fill(); },
    sleeper: function (c, x, y, s) { c.beginPath(); c.ellipse(x, y, 9 * s, 4 * s, 0, 0, 6.3); c.fill(); }
  };

  /* One frame. t is seconds. fade: { kindId: 0..1 } for kinds that have just appeared. */
  function draw(c, w, h, t, v, fade, motion) {
    var i, k, f, s = Math.max(0.8, Math.min(1.4, w / 380));
    // The throne: a tall back and two arms behind the well, a little lighter than the dark.
    var tx = w * 0.5, ty = h * 0.4;
    c.fillStyle = 'rgba(40,34,78,.55)';
    c.fillRect(tx - 30 * s, ty - 78 * s, 60 * s, 112 * s);
    c.fillRect(tx - 48 * s, ty - 8 * s, 18 * s, 44 * s);
    c.fillRect(tx + 30 * s, ty - 8 * s, 18 * s, 44 * s);
    if (v.ended) {                                         // the First Lamp at its foot, and a shadow cast toward the viewer
      c.fillStyle = 'rgba(255,214,140,.85)'; c.beginPath(); c.arc(tx, ty + 44 * s, 3 * s, 0, 6.3); c.fill();
      c.fillStyle = 'rgba(0,0,0,' + (v.choice === 'kept' ? 0.5 : 0.3) + ')'; c.beginPath(); c.moveTo(tx - 10 * s, ty + 46 * s); c.lineTo(tx + 10 * s, ty + 46 * s); c.lineTo(tx + 30 * s, ty + (v.choice === 'kept' ? 130 : 90) * s); c.lineTo(tx - 30 * s, ty + (v.choice === 'kept' ? 130 : 90) * s); c.fill();
    }
    if (v.choice === 'returned') { c.fillStyle = 'rgba(60,52,110,.9)'; c.beginPath(); c.arc(tx, ty - 30 * s, 8 * s, 0, 6.3); c.fill(); c.fillRect(tx - 9 * s, ty - 22 * s, 18 * s, 34 * s); }
    // A shaft of light while a Lampwarden is being fought: narrower as its radiance falls.
    if (v.lamp.on) {
      var half = (8 + 22 * v.lamp.frac) * s;
      c.fillStyle = 'rgba(241,197,107,' + (0.06 + 0.08 * v.lamp.frac).toFixed(3) + ')';
      c.beginPath(); c.moveTo(w * 0.5 - half, 0); c.lineTo(w * 0.5 + half, 0); c.lineTo(w * 0.5 + 6 * s, h * 0.4); c.lineTo(w * 0.5 - 6 * s, h * 0.4); c.fill();
    }
    // The court: one cluster per kind owned.
    for (i = 0; i < v.kinds.length; i++) {
      k = v.kinds[i];
      if (!k.tier) continue;
      f = fade && fade[k.id] !== undefined ? fade[k.id] : 1;
      var period = 4 + (i * 0.55) % 5, bob = motion ? Math.sin(t * 6.283 / period + i) * 2 : 0;
      c.globalAlpha = 0.85 * f;
      c.fillStyle = 'rgba(92,80,170,1)'; c.strokeStyle = 'rgba(92,80,170,1)'; c.lineWidth = 1.6 * s;
      for (var n = 0; n < k.tier; n++) {
        var x = SLOTS[i][0] * w + (n - (k.tier - 1) / 2) * 14 * s, y = SLOTS[i][1] * h + bob + (n % 2) * 3 * s;
        FIGURES[k.id](c, x, y, s * (0.9 + 0.1 * (i % 3)));
      }
      c.globalAlpha = 1;
    }
    // The Pane: a small rose of dots above the throne, one for each light lit.
    for (i = 0; i < v.paneLit; i++) {
      var a = i / 24 * 6.283;
      c.fillStyle = 'rgba(201,212,255,.85)'; c.beginPath(); c.arc(tx + Math.cos(a) * 14 * s, ty - 100 * s + Math.sin(a) * 14 * s, 1.6 * s, 0, 6.3); c.fill();
    }
  }

  return { tier: tier, SLOTS: SLOTS, depthTint: depthTint, view: view, signature: signature, draw: draw };
})();
