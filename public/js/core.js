/* The Dark Realm: game rules. No interface code and no direct access to the browser.
   Everything impure (clocks, randomness, storage, the Whispers log) arrives through env,
   so the same rules run in a page and in a test. Plain script, runs from file://. */
(function () {
  'use strict';

  var KEY = 'thedarkrealm.save.v2';
  var OLD_KEY = 'thedarkrealm.save.v1';
  var SAVE_TAG = 'TDR2';
  var MAX_SAVE = 200000;    // characters; a real save is a few KB
  var CLICK_CAP = 14;       // hand gathers accepted per second (the interface enforces it)
  var BIG = 1e300;
  var GROWTH = 1.15;        // denizen cost growth per owned
  var MARCH = 0.25;         // seconds the Host needs between shafts
  var BOSS_TIME = 45;       // seconds allowed against a Lampwarden
  var FINAL_SHAFT = 150;
  var GLASS_EXP = 0.3;      // Nightglass = (run Gloom / 1e9) ^ this
  var TAB_IDS = ['den', 'work', 'shaft', 'rite', 'unl', 'omen', 'codex', 'set'];

  /* env: { wallNow, monoNow, random, say, storage: { get, set, remove } } */
  function create(D, env) {
    var wallNow = env.wallNow, monoNow = env.monoNow, say = env.say, store = env.storage;

    var S;                    // saved state
    var C = {};               // derived values, rebuilt every tick
    var dirty = { omens: true, codex: true, upgs: false };   // the interface clears these after redrawing

    /* ---------- state ---------- */

    function fresh() {
      return {
        v: 2,
        gloom: 0, runGloom: 0, totalGloom: 0,
        echoes: 0, echoesTotal: 0,
        glass: 0, glassTotal: 0, unlightings: 0,
        den: {}, upg: {}, rites: {}, perks: {}, omens: {}, codex: {},
        codexUnread: 0,
        shaft: 1, shaftTop: 1, bestShaft: 0, shaftHp: shaftMaxHp(1), bossTime: BOSS_TIME, march: 0,
        autoAdvance: true, regroup: false, sealed: 0,
        clicks: 0, lanterns: 0, played: 0, runTime: 0,
        buffs: { hush: 0, teeth: 0 },
        lanternIn: 75,
        unlocked: { shafts: false, rites: false, unlight: false },
        ended: false,
        seen: wallNow(),      // latest wall-clock time this realm has observed
        debt: 0,              // seconds of away time forfeited after the clock ran backwards
        marks: 0,             // times the save failed its seal or its audit
        opts: { sci: false, motion: true, buy: 1 },
        tab: 'den'
      };
    }

    /* ---------- save integrity ---------- */

    function own(o, k) { return o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }
    function num(o, k, lo, hi, def) {
      var x = own(o, k) ? o[k] : undefined;
      return (typeof x === 'number' && isFinite(x)) ? Math.min(hi, Math.max(lo, x)) : def;
    }
    function int(o, k, lo, hi, def) { return Math.floor(num(o, k, lo, hi, def)); }
    function flag(o, k) { return own(o, k) && !!o[k]; }

    /* Builds a state from untrusted data by copying known fields only. Nothing is merged,
       so keys such as __proto__ or constructor in a crafted save are never touched. */
    function adopt(o) {
      var s = fresh(), now = wallNow();
      if (!o || typeof o !== 'object') return s;
      s.totalGloom = num(o, 'totalGloom', 0, BIG, 0);
      s.runGloom = num(o, 'runGloom', 0, BIG, 0);
      s.gloom = num(o, 'gloom', 0, BIG, 0);
      s.echoesTotal = num(o, 'echoesTotal', 0, BIG, 0);
      s.echoes = num(o, 'echoes', 0, BIG, 0);
      s.glassTotal = int(o, 'glassTotal', 0, BIG, 0);
      s.glass = int(o, 'glass', 0, BIG, 0);
      s.unlightings = int(o, 'unlightings', 0, 1e6, 0);
      D.DENIZENS.forEach(function (d) { var n = int(o.den, d.id, 0, 5000, 0); if (n) s.den[d.id] = n; });
      UPGS.forEach(function (u) { if (flag(o.upg, u.id)) s.upg[u.id] = 1; });
      D.RITES.forEach(function (r) { var n = int(o.rites, r.id, 0, r.max || 400, 0); if (n) s.rites[r.id] = n; });
      D.PERKS.forEach(function (p) { if (flag(o.perks, p.id)) s.perks[p.id] = 1; });
      OMENS.forEach(function (m) { if (flag(o.omens, m.id)) s.omens[m.id] = 1; });
      D.CODEX.forEach(function (c) { if (flag(o.codex, c.id)) s.codex[c.id] = 1; });
      s.codexUnread = int(o, 'codexUnread', 0, 99, 0);
      s.bestShaft = int(o, 'bestShaft', 0, 1e5, 0);
      s.shaftTop = int(o, 'shaftTop', 1, s.bestShaft + 1, 1);
      s.shaft = int(o, 'shaft', 1, s.shaftTop, 1);
      s.shaftHp = num(o, 'shaftHp', 0, shaftMaxHp(s.shaft), 0) || shaftMaxHp(s.shaft);
      s.bossTime = num(o, 'bossTime', 0, BOSS_TIME, BOSS_TIME);
      s.march = num(o, 'march', 0, MARCH, 0);
      s.autoAdvance = !own(o, 'autoAdvance') || o.autoAdvance !== false;
      s.regroup = own(o, 'regroup') && o.regroup === true;
      s.sealed = num(o, 'sealed', 0, BIG, 0);
      s.played = num(o, 'played', 0, BIG, 0);
      s.runTime = num(o, 'runTime', 0, s.played, 0);
      s.clicks = int(o, 'clicks', 0, BIG, 0);
      s.lanterns = int(o, 'lanterns', 0, BIG, 0);
      s.buffs.hush = num(o.buffs, 'hush', 0, 80, 0);
      s.buffs.teeth = num(o.buffs, 'teeth', 0, 80, 0);
      s.lanternIn = num(o, 'lanternIn', 0, 150, 75);
      ['shafts', 'rites', 'unlight'].forEach(function (k) { s.unlocked[k] = own(o.unlocked, k) && o.unlocked[k] === true; });
      s.ended = own(o, 'ended') && o.ended === true && s.bestShaft >= FINAL_SHAFT;
      s.seen = num(o, 'seen', 0, BIG, num(o, 'last', 0, now, now));   // `last` is the v1 field
      s.debt = num(o, 'debt', 0, 86400, 0);
      s.marks = int(o, 'marks', 0, 1e6, 0);
      s.opts.sci = own(o.opts, 'sci') && o.opts.sci === true;
      s.opts.motion = !own(o.opts, 'motion') || o.opts.motion !== false;
      if (own(o.opts, 'buy') && [1, 10, 25, 'max'].indexOf(o.opts.buy) >= 0) s.opts.buy = o.opts.buy;
      if (own(o, 'tab') && TAB_IDS.indexOf(o.tab) >= 0) s.tab = o.tab;
      if (audit(s) > 0) s.marks++;
      return s;
    }

    /* Checks a state against the game's own bookkeeping and repairs what cannot be true.
       Returns how many repairs were needed. An honest save needs none. */
    function audit(s) {
      var fixes = 0, i, p;
      function any(o) { for (var k in o) return true; return false; }

      // Nightglass only comes from an Unlighting, and perks only from Nightglass.
      if (s.unlightings === 0 && (s.glassTotal > 0 || s.glass > 0 || any(s.perks))) { s.glassTotal = 0; s.glass = 0; s.perks = {}; fixes++; }
      var spentGlass = 0;
      D.PERKS.forEach(function (q) { if (s.perks[q.id]) spentGlass += q.cost; });
      if (spentGlass > s.glassTotal) {
        for (i = D.PERKS.length - 1; i >= 0 && spentGlass > s.glassTotal; i--) {
          p = D.PERKS[i];
          if (s.perks[p.id]) { delete s.perks[p.id]; spentGlass -= p.cost; }
        }
        fixes++;
      }
      if (s.glass > s.glassTotal - spentGlass) { s.glass = s.glassTotal - spentGlass; fixes++; }

      // Lifetime totals against time on the seat. The ceilings sit far above what the fastest
      // possible play reaches, so they only catch numbers that were typed in.
      var maxGloom = Math.pow(10, Math.min(300, 7 + s.played / 400));
      if (s.totalGloom > maxGloom) { s.totalGloom = maxGloom; fixes++; }
      var maxEchoes = Math.pow(10, Math.min(300, 4 + s.played / 900));
      if (s.echoesTotal > maxEchoes) { s.echoesTotal = maxEchoes; fixes++; }
      var maxShaft = Math.floor(30 + s.played / 20);
      if (s.bestShaft > maxShaft) {
        s.bestShaft = maxShaft; fixes++;
        s.shaftTop = Math.min(s.shaftTop, maxShaft + 1);
        s.shaft = Math.min(s.shaft, s.shaftTop);
        s.shaftHp = shaftMaxHp(s.shaft);
        if (s.bestShaft < FINAL_SHAFT) s.ended = false;
      }

      if (s.runGloom > s.totalGloom) { s.runGloom = s.totalGloom; fixes++; }
      if (s.gloom > s.runGloom) { s.gloom = s.runGloom; fixes++; }
      if (s.echoes > s.echoesTotal) { s.echoes = s.echoesTotal; fixes++; }

      // A denizen working needs the denizens it is for.
      var stripped = false;
      D.DENIZENS.forEach(function (d) {
        D.UPG_TIERS.forEach(function (t, j) {
          if (s.upg[d.id + '_' + j] && (s.den[d.id] || 0) < t.at) { delete s.upg[d.id + '_' + j]; stripped = true; }
        });
      });
      if (stripped) fixes++;

      // Everything bound and built this fathom was paid for out of this fathom's Gloom.
      function spentGloom() {
        var disc = s.perks.thrift ? 0.9 : 1, sum = 0;
        D.DENIZENS.forEach(function (d) {
          var free = s.perks.absence ? (d.id === 'gleaner' ? 15 : d.id === 'scribe' ? 5 : 0) : 0, n = s.den[d.id] || 0;
          if (n > free) sum += d.cost * disc * (Math.pow(GROWTH, n) - Math.pow(GROWTH, free)) / (GROWTH - 1);
        });
        UPGS.forEach(function (u) { if (s.upg[u.id]) sum += u.cost; });
        return sum;
      }
      function slack(x) { return x * 1.01 + s.runGloom * 1e-9 + 1; }
      var spent = spentGloom();
      if (spent > slack(s.runGloom - s.gloom)) {
        fixes++;
        for (i = D.DENIZENS.length - 1; i >= 0 && spent > slack(s.runGloom); i--) {
          var d = D.DENIZENS[i];
          delete s.den[d.id];
          for (var j = 0; j < D.UPG_TIERS.length; j++) delete s.upg[d.id + '_' + j];
          spent = spentGloom();
        }
        if (spent > slack(s.runGloom)) { s.upg = {}; spent = spentGloom(); }
        s.gloom = Math.max(0, Math.min(s.gloom, s.runGloom - spent));
      }

      // Before the first Unlighting, every Rite level was paid for in Echoes.
      if (s.unlightings === 0) {
        var e = 0;
        D.RITES.forEach(function (r) { e += r.base * (Math.pow(r.g, s.rites[r.id] || 0) - 1) / (r.g - 1); });
        if (e > (s.echoesTotal - s.echoes) * 1.01 + 1) { s.rites = {}; fixes++; }
      }

      // Hands and lanterns have physical limits.
      var maxClicks = Math.floor(s.played * CLICK_CAP + 100);
      if (s.clicks > maxClicks) { s.clicks = maxClicks; fixes++; }
      var maxLanterns = Math.floor(s.played / 35 + 5);
      if (s.lanterns > maxLanterns) { s.lanterns = maxLanterns; fixes++; }
      return fixes;
    }

    /* Omens tied to lifetime counters can be re-checked. Runs once S is in place. */
    function pruneOmens() {
      var cut = false;
      OMENS.forEach(function (o) { if (o.mono && S.omens[o.id] && !o.cond()) { delete S.omens[o.id]; cut = true; } });
      if (cut) S.marks++;
    }

    /* A keyed checksum (cyrb53). It makes hand-editing a save fail its seal. It is not
       cryptography: the key ships in this file, so the audit above is the real defence. */
    var SALT = 'vesperdeep/stillwell/ysmerel';
    function seal(str) {
      var h1 = 0xdeadbeef ^ 0x51ab, h2 = 0x41c6ce57 ^ 0x51ab, t = SALT + str + SALT;
      for (var i = 0, ch; i < t.length; i++) {
        ch = t.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return (h2 >>> 0).toString(36) + '-' + (h1 >>> 0).toString(36);
    }

    function pack() {
      var body = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
      return SAVE_TAG + '.' + body + '.' + seal(body);
    }

    /* Returns { data, sealed } or throws if the text is not a save at all. */
    function unpack(str) {
      str = String(str).trim();
      if (str.length > MAX_SAVE) throw new Error('size');
      var m = /^TDR2\.([A-Za-z0-9+\/=]+)\.([a-z0-9-]+)$/.exec(str);
      if (!m) throw new Error('format');
      return { data: JSON.parse(decodeURIComponent(escape(atob(m[1])))), sealed: seal(m[1]) === m[2] };
    }

    var halted = false, saveWarned = false;

    function save() {
      if (halted) return false;
      try { store.set(KEY, pack()); return true; }
      catch (e) {
        if (!saveWarned) { saveWarned = true; say('This browser is refusing to store the save. Export it from the Realm tab to keep your progress.'); }
        return false;
      }
    }

    /* Returns { note }: a line for the Whispers when the stored realm could not be played. */
    function load() {
      var raw = null, legacy = null, note = null;
      try { raw = store.get(KEY); if (!raw) legacy = store.get(OLD_KEY); } catch (e) {}
      S = fresh();
      if (raw) {
        try {
          var u = unpack(raw);
          if (u.sealed) S = adopt(u.data);
          else {
            // Edited outside the game. It is set aside, not played. Nothing is destroyed.
            try { store.set(KEY + '.rejected', raw.slice(0, MAX_SAVE)); } catch (e1) {}
            note = 'The saved realm was altered outside the game. The Scribes have set it aside, and a new one begins.';
          }
        } catch (e) {
          try { store.set(KEY + '.unreadable', raw.slice(0, MAX_SAVE)); } catch (e2) {}
          note = 'The saved realm could not be read. A new one begins.';
        }
      } else if (legacy) {
        try { S = adopt(JSON.parse(legacy)); store.remove(OLD_KEY); } catch (e) { S = fresh(); }
      }
      pruneOmens();
      return { note: note };
    }

    function exportText() { return pack(); }

    /* Replaces the realm with an exported save. Returns { ok } or { ok: false, error }. */
    function importText(str) {
      var u;
      try { u = unpack(str); } catch (e) { return { ok: false, error: 'That text is not a Dark Realm save.' }; }
      if (!u.sealed) return { ok: false, error: 'That save has been altered since it was exported. The Scribes refuse it.' };
      S = adopt(u.data);
      pruneOmens();
      if (!save()) return { ok: false, error: 'This browser refused to store the save.' };
      return { ok: true };
    }

    function erase() {
      try { store.remove(KEY); store.remove(OLD_KEY); } catch (e) {}
    }

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

    var UPGS = [];
    function addUpg(u) { UPGS.push(u); }

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
    /* mono: the condition reads a lifetime counter that never falls, so it can be re-verified on load. */
    function omenSet(list, descFn, condFn, mono) {
      list.forEach(function (p) {
        OMENS.push({ id: 'o' + OMENS.length, name: p[1], desc: descFn(p[0]), cond: function () { return condFn(p[0]); }, mono: !!mono });
      });
    }
    omenSet([[1e3, 'A Puddle of Night'], [1e6, 'A Cellar of Night'], [1e9, 'A Lake of Night'], [1e12, 'A Sea of Night'],
      [1e15, 'A Sky of Night'], [1e18, 'An Age of Night'], [1e21, 'Night Without Edges'], [1e24, 'Night Without End']],
      function (x) { return 'Gather ' + fmtPlain(x) + ' Gloom in all.'; }, function (x) { return S.totalGloom >= x; }, true);
    omenSet([[10, 'A Household'], [100, 'A Court'], [500, 'A City Below'], [1000, 'A Nation Below'], [2000, 'A World Below']],
      function (x) { return 'Have ' + x + ' denizens bound at once.'; }, function (x) { return totalDenizens() >= x; });
    omenSet([[1, 'Full Attendance'], [50, 'Standing Room Only']],
      function (x) { return 'Have at least ' + x + ' of every denizen.'; },
      function (x) { return D.DENIZENS.every(function (d) { return cnt(d.id) >= x; }); });
    omenSet([[10, 'First Stitch'], [25, 'Seamstress'], [50, 'Half Dark'], [75, 'Longer Chains'], [100, 'Noon, Cancelled'],
      [125, 'No Light Left Standing'], [150, 'The Last Shaft']],
      function (x) { return 'Seal Sunshaft ' + x + '.'; }, function (x) { return S.bestShaft >= x; }, true);
    omenSet([[100, 'Wet Hands'], [1000, 'Cold Hands'], [10000, 'No Hands Left']],
      function (x) { return 'Gather by hand ' + x + ' times.'; }, function (x) { return S.clicks >= x; }, true);
    omenSet([[1, 'Snuffer'], [25, 'Wick-Thief'], [100, 'The Moths\' Revenge']],
      function (x) { return 'Snuff ' + x + (x === 1 ? ' Stray Lantern.' : ' Stray Lanterns.'); }, function (x) { return S.lanterns >= x; }, true);
    omenSet([[1, 'Let Go'], [5, 'Practised Falling'], [10, 'Home Is Down']],
      function (x) { return 'Perform the Unlighting ' + (x === 1 ? 'once.' : x + ' times.'); }, function (x) { return S.unlightings >= x; }, true);
    omenSet([[10, 'Observant'], [50, 'Devout']],
      function (x) { return 'Hold ' + x + ' Rite levels at once.'; }, function (x) { return totalRites() >= x; });
    omenSet([[1e3, 'A Thousand Small Habits'], [1e6, 'Everyone Who Ever Held a Cup']],
      function (x) { return 'Recover ' + fmtPlain(x) + ' Echoes in all.'; }, function (x) { return S.echoesTotal >= x; }, true);

    function fmtPlain(x) {
      var names = { 1e3: 'a thousand', 1e6: 'a million', 1e9: 'a billion', 1e12: 'a trillion', 1e15: 'a quadrillion',
        1e18: 'a quintillion', 1e21: 'a sextillion', 1e24: 'a septillion' };
      return names[x] || String(x);
    }

    var DEN_BY = {}, RITE_BY = {}, PERK_BY = {}, UPG_BY = {};
    D.DENIZENS.forEach(function (d) { DEN_BY[d.id] = d; });
    D.RITES.forEach(function (r) { RITE_BY[r.id] = r; });
    D.PERKS.forEach(function (p) { PERK_BY[p.id] = p; });
    UPGS.forEach(function (u) { UPG_BY[u.id] = u; });

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
    function awayPace() { return Math.min(1, 0.5 + 0.1 * rl('sleep')); }
    function awayCapHours() { return perk('unsleeping') ? 24 : 8; }

    function availableUpgs() {
      return UPGS.filter(function (u) { return !S.upg[u.id] && u.show(); })
        .sort(function (a, b) { return a.cost - b.cost; });
    }

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

    function afterChange() { recalc(); slowChecks(); }

    function buyDenizen(id) {
      var d = DEN_BY[id];
      if (!d) return false;
      var n = cnt(d.id), k = S.opts.buy === 'max' ? maxBuy(d, n) : S.opts.buy;
      if (k < 1) return false;
      var cost = denCost(d, n, k);
      if (S.gloom < cost) return false;
      S.gloom -= cost;
      S.den[d.id] = n + k;
      if (n === 0) say('A ' + d.name + ' answers the seat.');
      afterChange();
      return true;
    }

    function buyUpg(id, quiet) {
      var u = UPG_BY[id];
      if (!u || S.upg[u.id] || S.gloom < u.cost || !u.show()) return false;
      S.gloom -= u.cost;
      S.upg[u.id] = 1;
      if (!quiet) afterChange();
      return true;
    }

    function buyRite(id) {
      var r = RITE_BY[id];
      if (!r) return false;
      var c = riteCost(r);
      if (S.echoes < c || (r.max && rl(r.id) >= r.max)) return false;
      S.echoes -= c;
      S.rites[r.id] = rl(r.id) + 1;
      afterChange();
      return true;
    }

    function buyPerk(id) {
      var p = PERK_BY[id];
      if (!p || perk(p.id) || S.glass < p.cost) return false;
      S.glass -= p.cost;
      S.perks[p.id] = 1;
      say('Set in Nightglass: ' + p.name + '.');
      afterChange();
      return true;
    }

    function unlight() {
      var g = glassGain();
      if (g < 1) return false;
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
      S.autoAdvance = true; S.regroup = false;
      S.buffs.hush = 0; S.buffs.teeth = 0;
      S.runTime = 0;
      say('The realm lets go. A fathom down, the dark is closer-grained. You carry ' + fmt(g) + ' Nightglass.');
      dirty.upgs = true;
      afterChange();
      save();
      return true;
    }

    /* ---------- sunshafts ---------- */

    /* Puts the Host on shaft n without touching the regroup flag. */
    function placeShaft(n) {
      S.shaft = Math.max(1, Math.min(n, S.shaftTop));
      S.shaftHp = shaftMaxHp(S.shaft);
      S.bossTime = BOSS_TIME;
      S.march = 0;
    }

    /* The player's choice of shaft. It ends any regroup. */
    function setShaft(n) { S.regroup = false; placeShaft(n); }

    function setAutoAdvance(on) { S.autoAdvance = !!on; S.regroup = false; }

    var pendingEnding = false;

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
      S.regroup = true;
      placeShaft(S.shaft - 1);
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

    var lantern = null;       // { life } while one is drifting past, otherwise null

    function lanternDelay() { return (70 + env.random() * 80) * Math.pow(0.9, rl('lure')); }

    function spawnLantern() { lantern = { life: 14 }; }

    function hideLantern() { lantern = null; S.lanternIn = lanternDelay(); }

    /* trusted: the interface vouches that a real input event caused this call.
       Returns { kind, amount, duration } or null when there was nothing to snuff. */
    function snuffLantern(trusted) {
      if (trusted !== true || !lantern) return null;
      hideLantern();
      S.lanterns++;
      var big = perk('hunger'), mult = big ? 3 : 1, dur = big ? 80 : 40;
      var opts = ['spill', 'spill', 'spill', 'hush', 'hush', 'hush'];
      if (S.unlocked.shafts) opts.push('teeth', 'teeth', 'echo', 'echo');
      var pick = opts[Math.floor(env.random() * opts.length)];
      var res;
      if (pick === 'spill') {
        var g = Math.max(C.gps * 300, 30 * C.click) * mult;
        gain(g);
        say('The lantern gutters. Spilled light curdles into ' + fmt(g) + ' Gloom.');
        res = { kind: 'spill', amount: g, duration: 0 };
      } else if (pick === 'hush') {
        S.buffs.hush = dur;
        say('A Deep Hush falls. All Gloom ×5 for ' + dur + ' seconds.');
        res = { kind: 'hush', amount: 5, duration: dur };
      } else if (pick === 'teeth') {
        S.buffs.teeth = dur;
        say('The Host bares its teeth. Might ×5 for ' + dur + ' seconds.');
        res = { kind: 'teeth', amount: 5, duration: dur };
      } else {
        var e = shaftReward(S.shaft) * 10 * mult;
        addEchoes(e);
        say('The lantern was carrying memories. ' + fmt(e) + ' Echoes recovered.');
        res = { kind: 'echo', amount: e, duration: 0 };
      }
      afterChange();
      return res;
    }

    /* A hand gather. trusted: the interface vouches for the input event and its rate.
       Returns the Gloom gathered, or 0 when refused. */
    function gather(trusted) {
      if (trusted !== true) return 0;
      recalc();
      gain(C.click);
      S.clicks++;
      var amount = C.click;
      if (S.clicks < 30 || S.clicks % 10 === 0) slowChecks();
      return amount;
    }

    /* ---------- time ---------- */

    var slowTimer = 0, saveTimer = 0;

    function step(dt) {
      recalc();
      gain(C.gps * dt);
      if (S.buffs.hush > 0) S.buffs.hush = Math.max(0, S.buffs.hush - dt);
      if (S.buffs.teeth > 0) S.buffs.teeth = Math.max(0, S.buffs.teeth - dt);
      if (lantern) { lantern.life -= dt; if (lantern.life <= 0) hideLantern(); }
      else { S.lanternIn -= dt; if (S.lanternIn <= 0 && S.totalGloom >= 50) spawnLantern(); }
      fight(dt);
      S.played += dt; S.runTime += dt;
    }

    /* Credits time the page was not running. Returns a plain report, or null when there is
       nothing to tell. bestShaft is the new deepest seal, or 0 when it did not move. */
    function away(sec) {
      if (S.debt > 0) {
        var pay = Math.min(sec, S.debt);
        S.debt -= pay; sec -= pay;
        if (sec < 1) { say('The realm waited for its clocks to agree. Nothing was gathered meanwhile.'); return null; }
      }
      var capH = awayCapHours();
      var t = Math.min(sec, capH * 3600);
      var eff = awayPace();
      S.buffs.hush = 0; S.buffs.teeth = 0;
      recalc();
      var g = C.gps * t * eff, e0 = S.echoesTotal, s0 = S.bestShaft;
      gain(g);
      fight(t * eff);
      S.played += t; S.runTime += t;
      if (g <= 0 && S.echoesTotal === e0) return null;
      return {
        sec: sec, credited: t, pace: eff, capHours: capH, gloom: g,
        echoes: S.echoesTotal - e0, bestShaft: S.bestShaft > s0 ? S.bestShaft : 0
      };
    }

    function mergeAway(a, b) {
      return {
        sec: a.sec + b.sec, credited: a.credited + b.credited, pace: b.pace, capHours: b.capHours,
        gloom: a.gloom + b.gloom, echoes: a.echoes + b.echoes, bestShaft: Math.max(a.bestShaft, b.bestShaft)
      };
    }

    /* Time while the page runs is measured on the monotonic clock, so changing the device clock
       cannot speed the game up. Wall-clock time only counts for the gap while the page was not
       running, and that gap goes through away(): capped, and at the away pace. */
    var monoLast = 0;

    function start() { monoLast = monoNow(); }

    function tick() {
      if (halted) return { away: null, ending: false };
      var w = wallNow(), m = monoNow(), rep = null, more;
      var dm = Math.max(0, (m - monoLast) / 1000);
      monoLast = m;
      if (w < S.seen - 120000) {
        // The device clock went backwards. Forfeit that much future away time, so that
        // winding the clock forward and back again gains nothing.
        S.debt = Math.min(86400, S.debt + (S.seen - w) / 1000);
        S.seen = w;
        say('The realm\'s clocks disagree. Time away will not count until they settle.');
      }
      var gap = Math.max(0, (w - S.seen) / 1000) - dm;
      if (dm > 90) rep = away(dm); else step(dm);
      if (gap > 60) { more = away(gap); rep = rep && more ? mergeAway(rep, more) : (rep || more); }
      S.seen = Math.max(S.seen, w);
      slowTimer += dm; saveTimer += dm;
      if (slowTimer >= 0.5) { slowTimer = 0; slowChecks(); }
      if (saveTimer >= 15) { saveTimer = 0; save(); }
      var ending = pendingEnding;
      pendingEnding = false;
      return { away: rep, ending: ending };
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

      // After a failed Lampwarden the Host returns on its own once it can win.
      if (S.regroup && shaftMaxHp(S.shaftTop) / C.might < BOSS_TIME * 0.8) {
        S.regroup = false; S.autoAdvance = true;
        placeShaft(S.shaftTop);
        say('The Host has grown heavier. It climbs again.');
      }

      if (perk('steward')) {
        var bought = false;
        for (var i = 0; i < UPGS.length; i++) {
          var up = UPGS[i];
          if (!S.upg[up.id] && up.show() && S.gloom >= up.cost) { buyUpg(up.id, true); bought = true; }
        }
        if (bought) recalc();
      }

      OMENS.forEach(function (o) {
        if (!S.omens[o.id] && o.cond()) { S.omens[o.id] = 1; say('Omen: ' + o.name + '.'); dirty.omens = true; }
      });

      var f = {
        total: S.totalGloom, denizens: totalDenizens(), den: {}, lanterns: S.lanterns, shaftsOpen: u.shafts,
        echoesTotal: S.echoesTotal, best: S.bestShaft, unlightOpen: u.unlight, unlightings: S.unlightings, glassTotal: S.glassTotal
      };
      D.DENIZENS.forEach(function (d) { f.den[d.id] = cnt(d.id); });
      D.CODEX.forEach(function (c) {
        if (!S.codex[c.id] && c.when(f)) {
          S.codex[c.id] = 1; dirty.codex = true;
          if (S.tab !== 'codex') S.codexUnread++;
          if (c.id !== 'waking') say('Codex: ' + c.title + '.');
        }
      });
    }

    /* ---------- the engine ---------- */

    var engine = {
      KEY: KEY, BOSS_TIME: BOSS_TIME, GLASS_EXP: GLASS_EXP, FINAL_SHAFT: FINAL_SHAFT, MARCH: MARCH,
      C: C, UPGS: UPGS, OMENS: OMENS, dirty: dirty,
      // time
      start: start, tick: tick, step: step, away: away, slowChecks: slowChecks, recalc: recalc, fight: fight,
      // actions
      buyDenizen: buyDenizen, buyUpg: buyUpg, buyRite: buyRite, buyPerk: buyPerk, unlight: unlight,
      setShaft: setShaft, setAutoAdvance: setAutoAdvance, gather: gather, snuffLantern: snuffLantern,
      // save
      load: load, save: save, exportText: exportText, importText: importText, erase: erase,
      halt: function () { halted = true; },
      // reads
      cnt: cnt, rl: rl, perk: perk, totalDenizens: totalDenizens, totalRites: totalRites,
      denCost: denCost, maxBuy: maxBuy, riteCost: riteCost, shaftMaxHp: shaftMaxHp, shaftReward: shaftReward,
      shaftName: shaftName, glassGain: glassGain, awayPace: awayPace, awayCapHours: awayCapHours,
      availableUpgs: availableUpgs, fmt: fmt, fmtTime: fmtTime,
      // internals the tests exercise
      fresh: fresh, adopt: adopt, audit: audit, seal: seal, pack: pack, unpack: unpack
    };
    Object.defineProperty(engine, 'S', { get: function () { return S; } });
    Object.defineProperty(engine, 'lantern', { get: function () { return lantern; } });
    Object.defineProperty(engine, 'halted', { get: function () { return halted; } });
    return engine;
  }

  window.TDR_CORE = { create: create };
})();
