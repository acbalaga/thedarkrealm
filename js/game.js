/* The Dark Realm: game logic and interface. Plain script, no dependencies, runs from file://. */
(function () {
  'use strict';

  var D = TDR_DATA;
  var KEY = 'thedarkrealm.save.v1';
  var GROWTH = 1.15;        // denizen cost growth per owned
  var MARCH = 0.25;         // seconds the Host needs between shafts
  var BOSS_TIME = 45;       // seconds allowed against a Lampwarden
  var FINAL_SHAFT = 150;
  var GLASS_EXP = 0.3;       // Nightglass = (run Gloom / 1e9) ^ this

  var S;                    // saved state
  var C = {};               // derived values, rebuilt every tick
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- state ---------- */

  function fresh() {
    return {
      v: 1,
      gloom: 0, runGloom: 0, totalGloom: 0,
      echoes: 0, echoesTotal: 0,
      glass: 0, glassTotal: 0, unlightings: 0,
      den: {}, upg: {}, rites: {}, perks: {}, omens: {}, codex: {},
      codexUnread: 0,
      shaft: 1, shaftTop: 1, bestShaft: 0, shaftHp: shaftMaxHp(1), bossTime: BOSS_TIME, march: 0,
      autoAdvance: true, sealed: 0,
      clicks: 0, lanterns: 0, played: 0, runTime: 0,
      buffs: { hush: 0, teeth: 0 },
      lanternIn: 75,
      unlocked: { shafts: false, rites: false, unlight: false },
      ended: false,
      last: Date.now(),
      opts: { sci: false, motion: true, buy: 1 },
      tab: 'den'
    };
  }

  function merge(a, b) {
    for (var k in b) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) continue;
      if (a[k] && typeof a[k] === 'object' && b[k] && typeof b[k] === 'object') merge(a[k], b[k]);
      else a[k] = b[k];
    }
  }

  function sanitize() {
    ['gloom', 'runGloom', 'totalGloom', 'echoes', 'echoesTotal', 'glass', 'glassTotal', 'shaftHp'].forEach(function (k) {
      if (typeof S[k] !== 'number' || !isFinite(S[k]) || S[k] < 0) S[k] = 0;
    });
    S.shaft = Math.max(1, Math.floor(S.shaft) || 1);
    S.shaftTop = Math.max(S.shaft, Math.floor(S.shaftTop) || 1);
    if (S.shaftHp <= 0 || S.shaftHp > shaftMaxHp(S.shaft)) S.shaftHp = shaftMaxHp(S.shaft);
    if (typeof S.last !== 'number' || S.last > Date.now()) S.last = Date.now();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) { return false; }
  }

  function load() {
    S = fresh();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) merge(S, JSON.parse(raw));
    } catch (e) { S = fresh(); }
    sanitize();
  }

  function encodeSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  function decodeSave(str) { return JSON.parse(decodeURIComponent(escape(atob(str.trim())))); }

  /* ---------- formatting ---------- */

  var SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) {
      if (n >= 100 || n === Math.floor(n)) return String(Math.floor(n));
      return n < 10 ? n.toFixed(2).replace(/\.?0+$/, '') : n.toFixed(1).replace(/\.0$/, '');
    }
    var e = Math.floor(Math.log10(n));
    var tier = Math.floor(e / 3);
    if (S.opts.sci || tier >= SUFFIX.length) {
      var m = n / Math.pow(10, e);
      if (m >= 9.995) { m = 1; e++; }
      return m.toFixed(2) + 'e' + e;
    }
    var v = n / Math.pow(10, tier * 3);
    if (v >= 999.5) { v = 1; tier++; if (tier >= SUFFIX.length) return '1.00e' + (tier * 3); }
    return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + SUFFIX[tier];
  }

  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    if (d) return d + 'd ' + h + 'h';
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm ' + (s % 60) + 's';
    return s + 's';
  }

  /* ---------- definitions built from data ---------- */

  var UPGS = [], UPG_BY = {};
  function addUpg(u) { UPGS.push(u); UPG_BY[u.id] = u; }

  D.DENIZENS.forEach(function (d) {
    D.UPG_TIERS.forEach(function (t, j) {
      addUpg({
        id: d.id + '_' + j, kind: 'den', den: d.id,
        name: t.adj + ' ' + d.tool,
        desc: d.plural + ' gather twice as much Gloom.',
        cost: d.cost * t.mult,
        show: function () { return cnt(d.id) >= t.at; }
      });
    });
  });
  D.HAND_UPGS.forEach(function (h, j) {
    addUpg({ id: h.id, kind: j === 0 ? 'hand0' : 'hand', name: h.name, desc: h.desc, cost: h.cost,
      show: function () { return S.runGloom >= h.cost / 5; } });
  });
  D.REALM_UPGS.forEach(function (r) {
    addUpg({ id: r.id, kind: 'realm', name: r.name, desc: 'All Gloom ×1.5.', cost: r.cost,
      show: function () { return S.runGloom >= r.cost / 5; } });
  });

  var OMENS = [];
  function omenSet(list, descFn, condFn) {
    list.forEach(function (p) {
      OMENS.push({ id: 'o' + OMENS.length, name: p[1], desc: descFn(p[0]), cond: function () { return condFn(p[0]); } });
    });
  }
  omenSet([[1e3, 'A Puddle of Night'], [1e6, 'A Cellar of Night'], [1e9, 'A Lake of Night'], [1e12, 'A Sea of Night'],
    [1e15, 'A Sky of Night'], [1e18, 'An Age of Night'], [1e21, 'Night Without Edges'], [1e24, 'Night Without End']],
    function (x) { return 'Gather ' + fmtPlain(x) + ' Gloom in all.'; }, function (x) { return S.totalGloom >= x; });
  omenSet([[10, 'A Household'], [100, 'A Court'], [500, 'A City Below'], [1000, 'A Nation Below'], [2000, 'A World Below']],
    function (x) { return 'Have ' + x + ' denizens bound at once.'; }, function (x) { return totalDenizens() >= x; });
  omenSet([[1, 'Full Attendance'], [50, 'Standing Room Only']],
    function (x) { return 'Have at least ' + x + ' of every denizen.'; },
    function (x) { return D.DENIZENS.every(function (d) { return cnt(d.id) >= x; }); });
  omenSet([[10, 'First Stitch'], [25, 'Seamstress'], [50, 'Half Dark'], [75, 'Longer Chains'], [100, 'Noon, Cancelled'],
    [125, 'No Light Left Standing'], [150, 'The Last Shaft']],
    function (x) { return 'Seal Sunshaft ' + x + '.'; }, function (x) { return S.bestShaft >= x; });
  omenSet([[100, 'Wet Hands'], [1000, 'Cold Hands'], [10000, 'No Hands Left']],
    function (x) { return 'Gather by hand ' + x + ' times.'; }, function (x) { return S.clicks >= x; });
  omenSet([[1, 'Snuffer'], [25, 'Wick-Thief'], [100, 'The Moths\' Revenge']],
    function (x) { return 'Snuff ' + x + (x === 1 ? ' Stray Lantern.' : ' Stray Lanterns.'); }, function (x) { return S.lanterns >= x; });
  omenSet([[1, 'Let Go'], [5, 'Practised Falling'], [10, 'Home Is Down']],
    function (x) { return 'Perform the Unlighting ' + (x === 1 ? 'once.' : x + ' times.'); }, function (x) { return S.unlightings >= x; });
  omenSet([[10, 'Observant'], [50, 'Devout']],
    function (x) { return 'Hold ' + x + ' Rite levels at once.'; }, function (x) { return totalRites() >= x; });
  omenSet([[1e3, 'A Thousand Small Habits'], [1e6, 'Everyone Who Ever Held a Cup']],
    function (x) { return 'Recover ' + fmtPlain(x) + ' Echoes in all.'; }, function (x) { return S.echoesTotal >= x; });

  function fmtPlain(x) {
    var names = { 1e3: 'a thousand', 1e6: 'a million', 1e9: 'a billion', 1e12: 'a trillion', 1e15: 'a quadrillion',
      1e18: 'a quintillion', 1e21: 'a sextillion', 1e24: 'a septillion' };
    return names[x] || String(x);
  }

  /* ---------- accessors ---------- */

  function cnt(id) { return S.den[id] || 0; }
  function rl(id) { return S.rites[id] || 0; }
  function perk(id) { return !!S.perks[id]; }
  function totalDenizens() { var t = 0; for (var k in S.den) t += S.den[k]; return t; }
  function totalRites() { var t = 0; for (var k in S.rites) t += S.rites[k]; return t; }
  function omenCount() { var t = 0; for (var k in S.omens) t++; return t; }

  function costMult() { return perk('thrift') ? 0.9 : 1; }
  function denCost(d, n, k) {
    return Math.ceil(d.cost * costMult() * Math.pow(GROWTH, n) * (Math.pow(GROWTH, k) - 1) / (GROWTH - 1));
  }
  function maxBuy(d, n) {
    var base = d.cost * costMult() * Math.pow(GROWTH, n);
    var k = Math.floor(Math.log(S.gloom * (GROWTH - 1) / base + 1) / Math.log(GROWTH));
    while (k > 0 && denCost(d, n, k) > S.gloom) k--;
    return Math.max(0, k);
  }
  function riteCost(r) { return Math.ceil(r.base * Math.pow(r.g, rl(r.id))); }

  function shaftMaxHp(n) { return 12 * Math.pow(1.25, n - 1) * (n % 10 === 0 ? 6 : 1); }
  function shaftReward(n) {
    return Math.ceil((1 + Math.floor(Math.pow(n, 1.4) / 4)) * (n % 10 === 0 ? 5 : 1) * C.echoMult);
  }
  function shaftName(n) {
    if (n % 10 !== 0) return 'Sunshaft ' + n;
    return D.BOSSES[n] || 'Lampwarden of the ' + n + 'th Chain';
  }
  function glassGain() { return Math.floor(Math.pow(S.runGloom / 1e9, GLASS_EXP)); }

  /* ---------- derived values ---------- */

  function recalc() {
    var i, d, n;
    C.omens = omenCount();
    var common = 1 + 0.05 * S.glassTotal;
    var m = common * (1 + 0.01 * C.omens) * Math.pow(1.12, rl('listen'));
    D.REALM_UPGS.forEach(function (r) { if (S.upg[r.id]) m *= 1.5; });
    if (perk('deep')) m *= 2;
    if (perk('queen')) m *= 5;
    if (perk('further')) m *= 10;
    C.permMult = m;
    C.gMult = m * (S.buffs.hush > 0 ? 5 : 1);

    C.denOut = {}; C.denEach = {};
    var total = 0, mightBase = 1;
    for (i = 0; i < D.DENIZENS.length; i++) {
      d = D.DENIZENS[i];
      n = 0;
      for (var j = 0; j < D.UPG_TIERS.length; j++) if (S.upg[d.id + '_' + j]) n++;
      C.denEach[d.id] = d.rate * Math.pow(2, n) * C.gMult;
      C.denOut[d.id] = C.denEach[d.id] * cnt(d.id);
      total += C.denOut[d.id];
      mightBase += cnt(d.id) * Math.pow(3, i);
    }
    C.denGps = total;

    var pct = 0;
    for (i = 1; i < D.HAND_UPGS.length; i++) if (S.upg[D.HAND_UPGS[i].id]) pct += 0.02;
    var handBase = (S.upg.hand0 ? 2 : 1) * Math.pow(1.5, rl('hands'));
    C.click = handBase * C.gMult + pct * C.denGps;
    C.gps = C.denGps + (perk('bound') ? 4 * C.click : 0);

    var mm = common * Math.pow(1.2, rl('edge'));
    if (perk('keen')) mm *= 2;
    if (perk('queen')) mm *= 5;
    if (perk('further')) mm *= 10;
    if (S.buffs.teeth > 0) mm *= 5;
    C.might = mightBase * mm;

    var em = Math.pow(1.15, rl('names'));
    if (perk('halls')) em *= 2;
    if (perk('queen')) em *= 5;
    C.echoMult = em;
  }

  /* ---------- core actions ---------- */

  function gain(x) { S.gloom += x; S.runGloom += x; S.totalGloom += x; }
  function addEchoes(x) { S.echoes += x; S.echoesTotal += x; }

  function buyDenizen(d) {
    var n = cnt(d.id), k = S.opts.buy === 'max' ? maxBuy(d, n) : S.opts.buy;
    if (k < 1) return;
    var cost = denCost(d, n, k);
    if (S.gloom < cost) return;
    S.gloom -= cost;
    S.den[d.id] = n + k;
    if (n === 0) say('A ' + d.name + ' answers the seat.');
    afterChange();
  }

  function buyUpg(u, quiet) {
    if (S.upg[u.id] || S.gloom < u.cost) return false;
    S.gloom -= u.cost;
    S.upg[u.id] = 1;
    if (!quiet) afterChange();
    return true;
  }

  function buyRite(r) {
    var c = riteCost(r);
    if (S.echoes < c || (r.max && rl(r.id) >= r.max)) return;
    S.echoes -= c;
    S.rites[r.id] = rl(r.id) + 1;
    afterChange();
  }

  function buyPerk(p) {
    if (perk(p.id) || S.glass < p.cost) return;
    S.glass -= p.cost;
    S.perks[p.id] = 1;
    say('Set in Nightglass: ' + p.name + '.');
    afterChange();
  }

  function afterChange() { recalc(); slowChecks(); render(); }

  function unlight() {
    var g = glassGain();
    if (g < 1) return;
    S.glass += g; S.glassTotal += g; S.unlightings++;
    S.gloom = 0; S.runGloom = 0; S.echoes = 0;
    S.den = {}; S.upg = {};
    var kept = {};
    if (perk('remember')) for (var k in S.rites) { var h = Math.floor(S.rites[k] / 2); if (h) kept[k] = h; }
    S.rites = kept;
    if (perk('absence')) { S.den.gleaner = 15; S.den.scribe = 5; }
    S.shaft = perk('quick') ? Math.floor(S.bestShaft / 2) + 1 : 1;
    S.shaftTop = S.shaft;
    S.shaftHp = shaftMaxHp(S.shaft); S.bossTime = BOSS_TIME; S.march = 0;
    S.autoAdvance = true;
    S.buffs.hush = 0; S.buffs.teeth = 0;
    S.runTime = 0;
    say('The realm lets go. A fathom down, the dark is closer-grained. You carry ' + fmt(g) + ' Nightglass.');
    upgSig = '';
    afterChange();
    save();
  }

  /* ---------- sunshafts ---------- */

  function setShaft(n) {
    S.shaft = Math.max(1, Math.min(n, S.shaftTop));
    S.shaftHp = shaftMaxHp(S.shaft);
    S.bossTime = BOSS_TIME;
    S.march = 0;
  }

  function clearShaft() {
    var n = S.shaft;
    addEchoes(shaftReward(n));
    S.sealed++;
    if (n >= S.shaftTop) {
      S.shaftTop = n + 1;
      if (n > S.bestShaft) {
        S.bestShaft = n;
        if (n % 10 === 0) say(shaftName(n) + ' is undone. Sunshaft ' + n + ' is sealed.');
        if (n === FINAL_SHAFT && !S.ended) { S.ended = true; pendingEnding = true; }
      }
    }
    if (S.autoAdvance) S.shaft = n + 1;
    S.shaftHp = shaftMaxHp(S.shaft);
    S.bossTime = BOSS_TIME;
    S.march = MARCH;
  }

  function failBoss() {
    say(shaftName(S.shaft) + ' holds the shaft. The Host falls back to regroup.');
    S.autoAdvance = false;
    setShaft(S.shaft - 1);
  }

  function fight(dt) {
    if (!S.unlocked.shafts) return;
    var mt = C.might, iter = 0;
    while (dt > 1e-9 && iter++ < 1e6) {
      if (S.march > 0) { var w = Math.min(dt, S.march); S.march -= w; dt -= w; continue; }
      var n = S.shaft, boss = n % 10 === 0;
      if (!S.autoAdvance && !boss) {
        var per = shaftMaxHp(n) / mt + MARCH, kills = Math.floor(dt / per);
        if (kills >= 2) { addEchoes(shaftReward(n) * kills); S.sealed += kills; dt -= kills * per; continue; }
      }
      var need = S.shaftHp / mt;
      var avail = boss ? Math.min(dt, S.bossTime) : dt;
      if (need <= avail) { dt -= need; clearShaft(); }
      else {
        S.shaftHp -= mt * avail; dt -= avail;
        if (boss) { S.bossTime -= avail; if (S.bossTime <= 1e-9) failBoss(); }
      }
    }
  }

  /* ---------- stray lanterns ---------- */

  var lanternLife = 0;

  function lanternDelay() { return (70 + Math.random() * 80) * Math.pow(0.9, rl('lure')); }

  function spawnLantern() {
    var el = $('lantern');
    el.style.top = (12 + Math.random() * 55) + '%';
    el.classList.remove('drift'); void el.offsetWidth;
    if (S.opts.motion) el.classList.add('drift'); else el.style.left = (15 + Math.random() * 65) + '%';
    el.hidden = false;
    lanternLife = 14;
  }

  function hideLantern() { $('lantern').hidden = true; lanternLife = 0; S.lanternIn = lanternDelay(); }

  function snuffLantern() {
    if (lanternLife <= 0) return;
    hideLantern();
    S.lanterns++;
    var big = perk('hunger'), mult = big ? 3 : 1, dur = big ? 80 : 40;
    var opts = ['spill', 'spill', 'spill', 'hush', 'hush', 'hush'];
    if (S.unlocked.shafts) opts.push('teeth', 'teeth', 'echo', 'echo');
    var pick = opts[Math.floor(Math.random() * opts.length)];
    if (pick === 'spill') {
      var g = Math.max(C.gps * 300, 30 * C.click) * mult;
      gain(g);
      say('The lantern gutters. Spilled light curdles into ' + fmt(g) + ' Gloom.');
    } else if (pick === 'hush') {
      S.buffs.hush = dur;
      say('A Deep Hush falls. All Gloom ×5 for ' + dur + ' seconds.');
    } else if (pick === 'teeth') {
      S.buffs.teeth = dur;
      say('The Host bares its teeth. Might ×5 for ' + dur + ' seconds.');
    } else {
      var e = shaftReward(S.shaft) * 10 * mult;
      addEchoes(e);
      say('The lantern was carrying memories. ' + fmt(e) + ' Echoes recovered.');
    }
    afterChange();
  }

  /* ---------- time ---------- */

  var pendingEnding = false;
  var slowTimer = 0, saveTimer = 0;

  function step(dt) {
    recalc();
    gain(C.gps * dt);
    if (S.buffs.hush > 0) S.buffs.hush = Math.max(0, S.buffs.hush - dt);
    if (S.buffs.teeth > 0) S.buffs.teeth = Math.max(0, S.buffs.teeth - dt);
    if (lanternLife > 0) { lanternLife -= dt; if (lanternLife <= 0) hideLantern(); }
    else { S.lanternIn -= dt; if (S.lanternIn <= 0 && S.totalGloom >= 50) spawnLantern(); }
    fight(dt);
    S.played += dt; S.runTime += dt;
  }

  function away(sec) {
    var capH = perk('unsleeping') ? 24 : 8;
    var t = Math.min(sec, capH * 3600);
    var eff = Math.min(1, 0.5 + 0.1 * rl('sleep'));
    S.buffs.hush = 0; S.buffs.teeth = 0;
    recalc();
    var g = C.gps * t * eff, e0 = S.echoesTotal, s0 = S.bestShaft;
    gain(g);
    fight(t * eff);
    S.played += t; S.runTime += t;
    if (g <= 0 && S.echoesTotal === e0) return;
    var lines = ['<p>You were away for <b>' + fmtTime(sec) + '</b>. The realm kept working at ' + Math.round(eff * 100) +
      '% of its pace' + (sec > t ? ', for the first ' + capH + ' hours' : '') + '.</p><ul class="away">'];
    lines.push('<li><b>' + fmt(g) + '</b> Gloom gathered</li>');
    if (S.echoesTotal > e0) lines.push('<li><b>' + fmt(S.echoesTotal - e0) + '</b> Echoes recovered</li>');
    if (S.bestShaft > s0) lines.push('<li>Sunshafts sealed down to <b>' + S.bestShaft + '</b></li>');
    lines.push('</ul>');
    modal('While the realm slept', lines.join(''), [{ label: 'Take the seat', primary: true }]);
  }

  function tick() {
    var now = Date.now(), dt = (now - S.last) / 1000;
    S.last = now;
    if (dt < 0) dt = 0;
    if (dt > 60) away(dt); else step(dt);
    slowTimer += dt; saveTimer += dt;
    if (slowTimer >= 0.5) { slowTimer = 0; slowChecks(); }
    if (saveTimer >= 15) { saveTimer = 0; save(); }
    if (pendingEnding) { pendingEnding = false; showEnding(); }
    render();
  }

  /* Unlocks, omens, codex, steward. Cheap enough to run twice a second. */
  function slowChecks() {
    var u = S.unlocked;
    if (!u.shafts && (cnt('weaver') >= 1 || S.totalGloom >= 2000)) {
      u.shafts = true;
      say('Light. Something above has cut a shaft through the roof of the realm.');
    }
    if (!u.rites && S.echoesTotal >= 1) { u.rites = true; say('The first Echo comes home. The Cantors know rites that feed on these.'); }
    if (!u.unlight && (S.runGloom >= 1e7 || S.unlightings > 0)) {
      u.unlight = true; say('The realm is growing heavy. The oldest page of the Ledger describes what to do about that.');
    }

    if (perk('steward')) {
      var bought = false;
      for (var i = 0; i < UPGS.length; i++) {
        var up = UPGS[i];
        if (!S.upg[up.id] && up.show() && S.gloom >= up.cost) { buyUpg(up, true); bought = true; }
      }
      if (bought) recalc();
    }

    OMENS.forEach(function (o) {
      if (!S.omens[o.id] && o.cond()) { S.omens[o.id] = 1; say('Omen: ' + o.name + '.'); omenDirty = true; }
    });

    var f = {
      total: S.totalGloom, denizens: totalDenizens(), den: {}, lanterns: S.lanterns, shaftsOpen: u.shafts,
      echoesTotal: S.echoesTotal, best: S.bestShaft, unlightOpen: u.unlight, unlightings: S.unlightings, glassTotal: S.glassTotal
    };
    D.DENIZENS.forEach(function (d) { f.den[d.id] = cnt(d.id); });
    D.CODEX.forEach(function (c) {
      if (!S.codex[c.id] && c.when(f)) {
        S.codex[c.id] = 1; codexDirty = true;
        if (S.tab !== 'codex') S.codexUnread++;
        if (c.id !== 'waking') say('Codex: ' + c.title + '.');
      }
    });
  }

  /* ---------- small UI helpers ---------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var logLines = [];
  function say(msg) {
    logLines.unshift(msg);
    if (logLines.length > 40) logLines.pop();
    var ul = $('log');
    if (!ul) return;
    var li = el('li', null, msg);
    ul.insertBefore(li, ul.firstChild);
    while (ul.children.length > 40) ul.removeChild(ul.lastChild);
  }

  var modalQueue = [], modalOpen = false;
  function modal(title, html, btns) {
    modalQueue.push({ title: title, html: html, btns: btns || [{ label: 'Close', primary: true }] });
    if (!modalOpen) nextModal();
  }
  function nextModal() {
    var m = modalQueue.shift();
    if (!m) { $('modal').hidden = true; modalOpen = false; return; }
    modalOpen = true;
    $('modal-title').textContent = m.title;
    $('modal-body').innerHTML = m.html;
    var box = $('modal-btns');
    box.innerHTML = '';
    m.btns.forEach(function (b) {
      var btn = el('button', 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : ''), b.label);
      btn.type = 'button';
      btn.onclick = function () {
        var keep = b.cb && b.cb() === false;
        if (!keep) nextModal();
      };
      box.appendChild(btn);
    });
    $('modal').hidden = false;
    var first = box.querySelector('button.primary') || box.querySelector('button');
    if (first) first.focus();
  }

  function showEnding() {
    modal('The First Lamp',
      '<p>The last shaft closes behind your Host like an eye.</p>' +
      '<p>There is one light left in Vesperdeep now, and it is yours: a small lamp at the foot of the throne, burning low and steady. ' +
      'By it you can see the seat. By it, the seat casts a shadow, long and patient, in the shape of a queen.</p>' +
      '<p>The Auric Concord will cut no more shafts. They have nothing left to lower.</p>' +
      '<p class="dim">The realm is quiet. You may keep it as long as you like. The dark goes on down, and so can you.</p>',
      [{ label: 'Keep the chair warm', primary: true }]);
  }

  /* ---------- pages ---------- */

  var TABS = [
    { id: 'den', label: 'Denizens' },
    { id: 'work', label: 'Workings' },
    { id: 'shaft', label: 'Sunshafts', lock: 'shafts' },
    { id: 'rite', label: 'Rites', lock: 'rites' },
    { id: 'unl', label: 'Unlighting', lock: 'unlight' },
    { id: 'omen', label: 'Omens' },
    { id: 'codex', label: 'Codex' },
    { id: 'set', label: 'Realm' }
  ];
  var pages = {}, tabBtns = {}, updaters = {};
  var upgSig = '', omenDirty = true, codexDirty = true;

  function buildTabs() {
    var nav = $('tabs'), host = $('pages');
    TABS.forEach(function (t) {
      var b = el('button', 'tab', t.label);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.onclick = function () { showTab(t.id); };
      b.appendChild(el('i', 'dot'));
      nav.appendChild(b);
      tabBtns[t.id] = b;
      var p = el('div', 'page');
      p.hidden = true;
      host.appendChild(p);
      pages[t.id] = p;
    });
    updaters.den = buildDenizens(pages.den);
    updaters.work = buildWorkings(pages.work);
    updaters.shaft = buildShafts(pages.shaft);
    updaters.rite = buildRites(pages.rite);
    updaters.unl = buildUnlighting(pages.unl);
    updaters.omen = buildOmens(pages.omen);
    updaters.codex = buildCodex(pages.codex);
    updaters.set = buildSettings(pages.set);
  }

  function showTab(id) {
    var t = TABS.filter(function (x) { return x.id === id; })[0];
    if (!t || (t.lock && !S.unlocked[t.lock])) id = 'den';
    S.tab = id;
    TABS.forEach(function (x) {
      pages[x.id].hidden = x.id !== id;
      tabBtns[x.id].classList.toggle('active', x.id === id);
      tabBtns[x.id].setAttribute('aria-selected', x.id === id ? 'true' : 'false');
    });
    if (id === 'codex') S.codexUnread = 0;
    render();
  }

  /* Denizens */
  function buildDenizens(page) {
    var head = el('div', 'page-head');
    head.appendChild(el('p', 'lede', 'Bind the things that live down here. Each one gathers Gloom without being asked, and lends its weight to your Host.'));
    var modes = el('div', 'seg');
    var modeBtns = [];
    [1, 10, 25, 'max'].forEach(function (m) {
      var b = el('button', 'seg-btn', m === 'max' ? 'Max' : '×' + m);
      b.type = 'button';
      b.onclick = function () { S.opts.buy = m; render(); };
      modes.appendChild(b);
      modeBtns.push({ m: m, b: b });
    });
    head.appendChild(modes);
    page.appendChild(head);

    var rows = D.DENIZENS.map(function (d, i) {
      var row = el('div', 'row den');
      var glyph = el('div', 'glyph', d.glyph);
      var mid = el('div', 'row-mid');
      var title = el('div', 'row-title');
      var name = el('span', 'name', d.name);
      var count = el('span', 'count', '0');
      title.appendChild(name); title.appendChild(count);
      var desc = el('div', 'row-desc', d.desc);
      var info = el('div', 'row-info');
      mid.appendChild(title); mid.appendChild(desc); mid.appendChild(info);
      var btn = el('button', 'btn buy');
      btn.type = 'button';
      var bl = el('span', 'buy-label', 'Bind');
      var bc = el('span', 'buy-cost', '');
      btn.appendChild(bl); btn.appendChild(bc);
      btn.onclick = function () { buyDenizen(d); };
      row.appendChild(glyph); row.appendChild(mid); row.appendChild(btn);
      page.appendChild(row);
      return { d: d, i: i, row: row, count: count, info: info, btn: btn, bl: bl, bc: bc };
    });

    return function () {
      modeBtns.forEach(function (x) { x.b.classList.toggle('on', S.opts.buy === x.m); });
      rows.forEach(function (r) {
        var d = r.d, n = cnt(d.id);
        var vis = r.i === 0 || n > 0 || cnt(D.DENIZENS[r.i - 1].id) > 0 || S.runGloom >= d.cost * 0.25;
        r.row.hidden = !vis;
        if (!vis) return;
        var k = S.opts.buy === 'max' ? Math.max(1, maxBuy(d, n)) : S.opts.buy;
        var cost = denCost(d, n, k);
        r.count.textContent = n;
        var share = C.denGps > 0 ? Math.round(C.denOut[d.id] / C.denGps * 100) : 0;
        r.info.textContent = 'Each ' + fmt(C.denEach[d.id]) + '/s' + (n ? '  ·  together ' + fmt(C.denOut[d.id]) + '/s (' + share + '%)' : '') +
          '  ·  Might ' + fmt(Math.pow(3, r.i));
        r.bl.textContent = 'Bind ×' + k;
        r.bc.textContent = fmt(cost) + ' Gloom';
        r.btn.disabled = S.gloom < cost;
      });
    };
  }

  /* Workings */
  function buildWorkings(page) {
    page.appendChild(el('p', 'lede', 'Lasting improvements to the realm, paid for in Gloom. New workings appear as your denizens multiply.'));
    var grid = el('div', 'grid');
    var empty = el('p', 'empty', 'Nothing to work on yet. Bind more denizens.');
    var owned = el('p', 'dim small');
    page.appendChild(grid); page.appendChild(empty); page.appendChild(owned);
    var cards = [];

    function rebuild(list) {
      grid.innerHTML = '';
      cards = list.map(function (u) {
        var b = el('button', 'card');
        b.type = 'button';
        b.appendChild(el('span', 'card-name', u.name));
        b.appendChild(el('span', 'card-desc', u.desc));
        var c = el('span', 'card-cost', '');
        b.appendChild(c);
        b.onclick = function () { buyUpg(u); };
        grid.appendChild(b);
        return { u: u, b: b, c: c };
      });
    }

    return function () {
      var list = availableUpgs();
      var sig = list.map(function (u) { return u.id; }).join(',');
      if (sig !== upgSig || cards.length !== list.length) { upgSig = sig; rebuild(list); }
      cards.forEach(function (x) {
        x.c.textContent = fmt(x.u.cost) + ' Gloom';
        x.b.disabled = S.gloom < x.u.cost;
      });
      empty.hidden = list.length > 0;
      var n = 0; for (var k in S.upg) n++;
      owned.textContent = n + ' of ' + UPGS.length + ' workings complete this fathom.';
    };
  }

  function availableUpgs() {
    return UPGS.filter(function (u) { return !S.upg[u.id] && u.show(); })
      .sort(function (a, b) { return a.cost - b.cost; });
  }

  /* Sunshafts */
  function buildShafts(page) {
    page.appendChild(el('p', 'lede', 'The Auric Concord cuts Sunshafts into the realm to burn shadow for lamp-fuel. Your Host climbs each one and seals it. ' +
      'It fights on its own. Every tenth shaft is held by a Lampwarden, who must be undone in ' + BOSS_TIME + ' seconds.'));
    var box = el('div', 'shaft-box');
    var title = el('h3', 'shaft-title');
    var sub = el('div', 'shaft-sub');
    var bar = el('div', 'bar'); var fill = el('div', 'bar-fill light'); var txt = el('span', 'bar-txt');
    bar.appendChild(fill); bar.appendChild(txt);
    var tbar = el('div', 'bar thin'); var tfill = el('div', 'bar-fill time'); var ttxt = el('span', 'bar-txt');
    tbar.appendChild(tfill); tbar.appendChild(ttxt);
    var stats = el('div', 'shaft-stats');
    box.appendChild(title); box.appendChild(sub); box.appendChild(bar); box.appendChild(tbar); box.appendChild(stats);
    page.appendChild(box);

    var ctl = el('div', 'shaft-ctl');
    var prev = el('button', 'btn', '◀ Shallower'); prev.type = 'button';
    var next = el('button', 'btn', 'Deeper ▶'); next.type = 'button';
    var top = el('button', 'btn', 'To the frontier'); top.type = 'button';
    var lab = el('label', 'check');
    var cb = document.createElement('input'); cb.type = 'checkbox';
    lab.appendChild(cb); lab.appendChild(document.createTextNode(' Advance after each seal'));
    prev.onclick = function () { S.autoAdvance = false; setShaft(S.shaft - 1); render(); };
    next.onclick = function () { setShaft(S.shaft + 1); render(); };
    top.onclick = function () { S.autoAdvance = true; setShaft(S.shaftTop); render(); };
    cb.onchange = function () { S.autoAdvance = cb.checked; render(); };
    ctl.appendChild(prev); ctl.appendChild(next); ctl.appendChild(top); ctl.appendChild(lab);
    page.appendChild(ctl);
    var note = el('p', 'dim small');
    page.appendChild(note);

    return function () {
      var n = S.shaft, boss = n % 10 === 0, max = shaftMaxHp(n);
      title.textContent = shaftName(n);
      sub.textContent = boss ? 'Lampwarden of Sunshaft ' + n : (n >= S.shaftTop ? 'The frontier' : 'Already sealed once. The Host is gleaning it for Echoes.');
      box.classList.toggle('boss', boss);
      var hp = Math.max(0, S.shaftHp);
      fill.style.width = (hp / max * 100).toFixed(1) + '%';
      txt.textContent = 'Radiance ' + fmt(hp) + ' / ' + fmt(max);
      tbar.hidden = !boss;
      if (boss) {
        tfill.style.width = (S.bossTime / BOSS_TIME * 100).toFixed(1) + '%';
        ttxt.textContent = Math.ceil(S.bossTime) + 's';
      }
      var secs = max / C.might;
      stats.textContent = 'Host Might ' + fmt(C.might) + '  ·  Seal yields ' + fmt(shaftReward(n)) + ' Echoes  ·  ' +
        (secs < 1 ? 'sealed in under a second' : 'about ' + fmtTime(secs) + ' to seal');
      prev.disabled = n <= 1;
      next.disabled = n >= S.shaftTop;
      top.disabled = n >= S.shaftTop && S.autoAdvance;
      cb.checked = S.autoAdvance;
      note.textContent = 'Deepest shaft sealed, ever: ' + S.bestShaft + '.  Seals this fathom and before: ' + fmt(S.sealed) + '.' +
        (boss && secs > BOSS_TIME ? '  The Host is not yet strong enough for this Lampwarden. Bind more denizens or deepen the Rite of the Sharpened Dark.' : '');
    };
  }

  /* Rites */
  function buildRites(page) {
    page.appendChild(el('p', 'lede', 'Echoes are scraps of the living, carried down by their shadows. The Cantors can spend them on rites. Rites last until the next Unlighting.'));
    var rows = D.RITES.map(function (r) {
      var row = el('div', 'row');
      var mid = el('div', 'row-mid');
      var title = el('div', 'row-title');
      title.appendChild(el('span', 'name', r.name));
      var lvl = el('span', 'count');
      title.appendChild(lvl);
      mid.appendChild(title);
      mid.appendChild(el('div', 'row-desc', r.desc));
      var btn = el('button', 'btn buy echo'); btn.type = 'button';
      var bl = el('span', 'buy-label', 'Perform'); var bc = el('span', 'buy-cost');
      btn.appendChild(bl); btn.appendChild(bc);
      btn.onclick = function () { buyRite(r); };
      row.appendChild(mid); row.appendChild(btn);
      page.appendChild(row);
      return { r: r, lvl: lvl, btn: btn, bc: bc, bl: bl };
    });
    return function () {
      rows.forEach(function (x) {
        var l = rl(x.r.id), maxed = x.r.max && l >= x.r.max;
        x.lvl.textContent = 'Lv ' + l + (x.r.max ? ' / ' + x.r.max : '');
        x.bl.textContent = maxed ? 'Complete' : 'Perform';
        x.bc.textContent = maxed ? '' : fmt(riteCost(x.r)) + ' Echoes';
        x.btn.disabled = maxed || S.echoes < riteCost(x.r);
      });
    };
  }

  /* Unlighting */
  function buildUnlighting(page) {
    page.appendChild(el('p', 'lede', 'When the realm is heavy enough with Gloom you can let it go, and it sinks one fathom further from the sun. ' +
      'Gloom, denizens, workings, Echoes and rites are left behind. Nightglass, its settings, omens and the codex come with you.'));
    var box = el('div', 'unl-box');
    var gainEl = el('div', 'unl-gain');
    var nextEl = el('div', 'dim small');
    var btn = el('button', 'btn primary big', 'Perform the Unlighting'); btn.type = 'button';
    btn.onclick = function () {
      var g = glassGain();
      if (g < 1) return;
      modal('Let the realm go?', '<p>Vesperdeep will sink a fathom. You will begin again in a shallow Stillwell, carrying <b>' + fmt(g) +
        '</b> new Nightglass.</p><p class="dim">Each Nightglass ever earned gives +5% Gloom and Might, for good.</p>',
        [{ label: 'Not yet' }, { label: 'Let go', primary: true, cb: unlight }]);
    };
    box.appendChild(gainEl); box.appendChild(nextEl); box.appendChild(btn);
    page.appendChild(box);
    page.appendChild(el('h3', 'sub-head', 'Settings in Nightglass'));
    var have = el('p', 'dim small');
    page.appendChild(have);
    var grid = el('div', 'grid');
    page.appendChild(grid);
    var cards = D.PERKS.map(function (p) {
      var b = el('button', 'card glass'); b.type = 'button';
      b.appendChild(el('span', 'card-name', p.name));
      b.appendChild(el('span', 'card-desc', p.desc));
      var c = el('span', 'card-cost');
      b.appendChild(c);
      b.onclick = function () { buyPerk(p); };
      grid.appendChild(b);
      return { p: p, b: b, c: c };
    });
    return function () {
      var g = glassGain();
      gainEl.textContent = g >= 1 ? 'Letting go now yields ' + fmt(g) + ' Nightglass.' : 'The realm is not yet heavy enough.';
      var need = 1e9 * Math.pow(g + 1, 1 / GLASS_EXP);
      nextEl.textContent = 'Gloom gathered this fathom: ' + fmt(S.runGloom) + '.  Next Nightglass at ' + fmt(need) + '.';
      btn.disabled = g < 1;
      have.textContent = 'You hold ' + fmt(S.glass) + ' Nightglass to spend. ' + fmt(S.glassTotal) + ' earned in all (+' +
        fmt(S.glassTotal * 5) + '% Gloom and Might). Spending does not reduce that bonus.';
      cards.forEach(function (x) {
        var own = perk(x.p.id);
        x.b.classList.toggle('owned', own);
        x.c.textContent = own ? 'Set' : fmt(x.p.cost) + ' Nightglass';
        x.b.disabled = own || S.glass < x.p.cost;
      });
    };
  }

  /* Omens */
  function buildOmens(page) {
    var head = el('p', 'lede');
    page.appendChild(head);
    var grid = el('div', 'grid omens');
    page.appendChild(grid);
    var tiles = OMENS.map(function (o) {
      var t = el('div', 'omen');
      t.appendChild(el('span', 'card-name', o.name));
      t.appendChild(el('span', 'card-desc', o.desc));
      grid.appendChild(t);
      return { o: o, t: t };
    });
    return function () {
      head.textContent = 'Signs that the dark is going well. ' + C.omens + ' of ' + OMENS.length + ' seen. Each adds 1% to all Gloom (+' + C.omens + '%).';
      if (!omenDirty) return;
      omenDirty = false;
      tiles.forEach(function (x) { x.t.classList.toggle('got', !!S.omens[x.o.id]); });
    };
  }

  /* Codex */
  function buildCodex(page) {
    page.appendChild(el('p', 'lede', 'What you have pieced together about Vesperdeep, in the order you learned it.'));
    var list = el('div', 'codex');
    page.appendChild(list);
    var left = el('p', 'dim small');
    page.appendChild(left);
    return function () {
      if (!codexDirty) return;
      codexDirty = false;
      list.innerHTML = '';
      var n = 0;
      D.CODEX.forEach(function (c) {
        if (!S.codex[c.id]) return;
        n++;
        var a = el('article', 'entry');
        a.appendChild(el('h3', null, c.title));
        a.appendChild(el('p', null, c.text));
        list.appendChild(a);
      });
      left.textContent = n < D.CODEX.length ? (D.CODEX.length - n) + ' pages are still dark.' : 'The codex is complete.';
    };
  }

  /* Realm (stats and settings) */
  function buildSettings(page) {
    page.appendChild(el('h3', 'sub-head', 'The realm so far'));
    var stats = el('dl', 'stats');
    page.appendChild(stats);
    var defs = [
      ['Time on the seat', function () { return fmtTime(S.played); }],
      ['Time this fathom', function () { return fmtTime(S.runTime); }],
      ['Gloom gathered, all fathoms', function () { return fmt(S.totalGloom); }],
      ['Gathers by hand', function () { return fmt(S.clicks); }],
      ['Gloom per gather', function () { return fmt(C.click); }],
      ['Denizens bound', function () { return fmt(totalDenizens()); }],
      ['Stray Lanterns snuffed', function () { return fmt(S.lanterns); }],
      ['Deepest shaft sealed', function () { return String(S.bestShaft); }],
      ['Echoes recovered, all fathoms', function () { return fmt(S.echoesTotal); }],
      ['Unlightings', function () { return String(S.unlightings); }],
      ['Away pace', function () { return Math.round(Math.min(1, 0.5 + 0.1 * rl('sleep')) * 100) + '% for up to ' + (perk('unsleeping') ? 24 : 8) + 'h'; }]
    ].map(function (d) {
      stats.appendChild(el('dt', null, d[0]));
      var dd = el('dd'); stats.appendChild(dd);
      return { dd: dd, fn: d[1] };
    });

    page.appendChild(el('h3', 'sub-head', 'Keeping'));
    page.appendChild(el('p', 'dim small', 'The game saves to this browser every 15 seconds and when you leave. Nothing is sent anywhere. There is nothing to buy.'));
    var row = el('div', 'btn-row');
    function mk(label, fn, cls) { var b = el('button', 'btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.onclick = fn; row.appendChild(b); return b; }
    mk('Save now', function () { say(save() ? 'The Scribes have written it down.' : 'This browser refused to store the save.'); });
    mk('Export save', function () {
      modal('Export save', '<p>Copy this text and keep it somewhere safe.</p><textarea id="io" readonly rows="6"></textarea>',
        [{ label: 'Copy', cb: function () { var t = $('io'); t.select(); try { document.execCommand('copy'); } catch (e) {} return false; } },
          { label: 'Done', primary: true }]);
      $('io').value = encodeSave();
    });
    mk('Import save', function () {
      modal('Import save', '<p>Paste an exported save. It replaces the current realm.</p><textarea id="io" rows="6"></textarea><p id="io-err" class="warn"></p>',
        [{ label: 'Cancel' }, { label: 'Import', primary: true, cb: function () {
          try {
            var data = decodeSave($('io').value);
            if (!data || typeof data !== 'object' || data.v !== 1) throw new Error('bad');
            S = fresh(); merge(S, data); S.last = Date.now(); sanitize(); save();
            location.reload();
          } catch (e) { $('io-err').textContent = 'That text is not a Dark Realm save.'; return false; }
        } }]);
    });
    mk('Erase everything', function () {
      modal('Erase the realm?', '<p>This deletes all progress, including Nightglass, omens and the codex. It cannot be undone.</p>',
        [{ label: 'Keep it', primary: true }, { label: 'Erase', danger: true, cb: function () {
          wiping = true;
          try { localStorage.removeItem(KEY); } catch (e) {}
          location.reload();
        } }]);
    }, 'danger');
    page.appendChild(row);

    page.appendChild(el('h3', 'sub-head', 'Display'));
    var o1 = el('label', 'check'); var c1 = document.createElement('input'); c1.type = 'checkbox';
    o1.appendChild(c1); o1.appendChild(document.createTextNode(' Scientific notation for large numbers'));
    c1.onchange = function () { S.opts.sci = c1.checked; render(); };
    var o2 = el('label', 'check'); var c2 = document.createElement('input'); c2.type = 'checkbox';
    o2.appendChild(c2); o2.appendChild(document.createTextNode(' Drifting motes and motion'));
    c2.onchange = function () { S.opts.motion = c2.checked; applyMotion(); };
    page.appendChild(o1); page.appendChild(o2);

    return function () {
      defs.forEach(function (d) { d.dd.textContent = d.fn(); });
      c1.checked = S.opts.sci; c2.checked = S.opts.motion;
    };
  }

  /* ---------- render ---------- */

  function render() {
    $('r-gloom').textContent = fmt(S.gloom);
    $('r-gps').textContent = fmt(C.gps) + ' /s';
    $('res-echo').hidden = !S.unlocked.shafts;
    $('r-echo').textContent = fmt(S.echoes);
    $('r-might').textContent = 'Might ' + fmt(C.might);
    $('res-glass').hidden = S.glassTotal < 1;
    $('r-glass').textContent = fmt(S.glass);
    $('r-glassb').textContent = '+' + fmt(S.glassTotal * 5) + '%';
    $('fathom').textContent = 'Vesperdeep  ·  Fathom ' + (S.unlightings + 1);
    document.title = fmt(S.gloom) + ' Gloom · The Dark Realm';

    TABS.forEach(function (t) { tabBtns[t.id].hidden = !!(t.lock && !S.unlocked[t.lock]); });
    var canWork = S.tab !== 'work' && UPGS.some(function (u) { return !S.upg[u.id] && S.gloom >= u.cost && u.show(); });
    tabBtns.work.classList.toggle('has-dot', canWork);
    tabBtns.codex.classList.toggle('has-dot', S.codexUnread > 0);
    tabBtns.unl.classList.toggle('has-dot', S.tab !== 'unl' && S.unlightings === 0 && glassGain() >= 1);

    var b = [];
    if (S.buffs.hush > 0) b.push('<span class="buff">Deep Hush ×5 · ' + Math.ceil(S.buffs.hush) + 's</span>');
    if (S.buffs.teeth > 0) b.push('<span class="buff teeth">Bared Teeth ×5 · ' + Math.ceil(S.buffs.teeth) + 's</span>');
    var bh = b.join('');
    if (bh !== lastBuff) { $('buffs').innerHTML = bh; lastBuff = bh; }
    $('well-hint').hidden = S.clicks >= 15;

    if (updaters[S.tab]) updaters[S.tab]();
  }
  var lastBuff = '';

  /* ---------- the Stillwell ---------- */

  function wellClick(ev) {
    recalc();
    gain(C.click);
    S.clicks++;
    var box = $('scene-box'), r = box.getBoundingClientRect(), wr = $('well').getBoundingClientRect();
    var x = ev && ev.clientX ? ev.clientX - r.left : wr.left - r.left + wr.width / 2 + (Math.random() * 40 - 20);
    var y = ev && ev.clientY ? ev.clientY - r.top : wr.top - r.top + wr.height / 3;
    var f = el('span', 'floater', '+' + fmt(C.click));
    f.style.left = x + 'px'; f.style.top = y + 'px';
    var host = $('floaters');
    host.appendChild(f);
    if (host.children.length > 24) host.removeChild(host.firstChild);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 900);
    var w = $('well');
    w.classList.remove('pulse'); void w.offsetWidth; w.classList.add('pulse');
    if (S.clicks < 30 || S.clicks % 10 === 0) slowChecks();
    render();
  }

  /* Motes drifting into the well. Purely decorative. */
  var motes = [], motesOn = false;
  function applyMotion() {
    document.body.classList.toggle('still', !S.opts.motion);
    if (S.opts.motion && !motesOn) { motesOn = true; requestAnimationFrame(drawMotes); }
  }
  function drawMotes(ts) {
    var cv = $('motes');
    if (!S.opts.motion) { motesOn = false; cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); return; }
    requestAnimationFrame(drawMotes);
    if (document.hidden) return;
    var box = cv.parentNode, w = box.clientWidth, h = box.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var want = 30 + Math.min(70, Math.floor(totalDenizens() / 4));
    var R = Math.max(w, h) * 0.6, cx = w / 2, cy = h * 0.46;
    while (motes.length < want) motes.push({ a: Math.random() * 6.283, r: Math.random() * R, s: 0.4 + Math.random() * 1.4, z: 0.6 + Math.random() * 1.6 });
    if (motes.length > want) motes.length = want;
    var fast = S.buffs.hush > 0 ? 2.5 : 1;
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.r -= m.s * 0.35 * fast; m.a += 0.004 * m.s * fast;
      if (m.r < 30) { m.r = R; m.a = Math.random() * 6.283; }
      var x = cx + Math.cos(m.a) * m.r, y = cy + Math.sin(m.a) * m.r * 0.8;
      var alpha = Math.min(1, (R - m.r) / R * 1.6) * 0.75;
      ctx.fillStyle = 'rgba(168,150,255,' + alpha.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, m.z, 0, 6.283); ctx.fill();
    }
  }

  /* ---------- boot ---------- */

  var wiping = false;

  function boot() {
    load();
    recalc();
    buildTabs();
    $('well').addEventListener('click', wellClick);
    $('lantern').addEventListener('click', snuffLantern);
    $('modal').addEventListener('click', function (e) {
      if (e.target === $('modal') && modalQueue.length === 0) nextModal();
    });
    var isNew = S.totalGloom === 0 && S.clicks === 0;
    slowChecks();
    S.codexUnread = isNew ? 1 : S.codexUnread;
    say(isNew ? 'You wake on the floor of a throne room. The seat is empty. The Stillwell is at your feet.' : 'The seat is as you left it.');
    showTab(S.tab);
    applyMotion();
    tick();
    setInterval(tick, 100);
    window.addEventListener('beforeunload', function () { if (!wiping) save(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && !wiping) save(); });
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
    window.TDR = { state: function () { return S; }, derived: function () { return C; }, save: save, tick: tick };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
