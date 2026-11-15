/* The Dark Realm: game rules. No interface code and no direct access to the browser.
   Everything impure (clocks, randomness, storage, the Whispers log) arrives through env,
   so the same rules run in a page and in a test. Plain script, runs from file://. */
(function () {
  'use strict';

  var KEY = 'thedarkrealm.save.v2';
  var OLD_KEY = 'thedarkrealm.save.v1';
  var SAVE_TAG = 'TDR2';
  var LEGACY_UNTIL = Date.UTC(2027, 5, 30, 23, 59, 59);   // 2027-06-30: after this the v1 save is retired, not read
  var MAX_SAVE = 200000;    // characters; a real save is a few KB
  var CLICK_CAP = 14;       // hand gathers accepted per second (the interface enforces it)
  var BIG = 1e300;
  var GROWTH = 1.15;        // denizen cost growth per owned
  var MARCH = 0.25;         // seconds the Host needs between shafts
  var BOSS_TIME = 45;       // seconds allowed against a Lampwarden
  var FINAL_SHAFT = 150;
  var GLASS_EXP = 0.3;      // Nightglass = (run Gloom / 1e9) ^ this
  var NAV_DESTS = ['seat', 'realm', 'host', 'deep', 'ledger'];
  // Where each page of the first interface (one flat row of tabs) lives in the five destinations.
  var OLD_TABS = { den: ['realm', 'den'], work: ['realm', 'work'], shaft: ['host', 'shaft'], rite: ['host', 'rite'],
    unl: ['deep', 'unl'], omen: ['ledger', 'omen'], codex: ['ledger', 'codex'], set: ['ledger', 'set'] };

  /* ---------- seeded randomness ----------
     Use rng(label, counter) for anything a reload could otherwise reroll: daily picks, a fathom's
     Current, a Petition. It is a pure function of the saved seed, the label and the counter, and it
     stores nothing. Use env.random for cosmetics and Stray Lantern timing, which should differ per run. */
  function hash32(str) {
    var h = 2166136261 >>> 0, i;
    for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }
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
  function pick(r, list) { return list[Math.floor(r() * list.length)]; }
  function shuffle(r, list) {
    var a = list.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  /* pairs: [[item, weight], ...]. Weights of zero or less are never picked. */
  function weighted(r, pairs) {
    var total = 0, i, x;
    for (i = 0; i < pairs.length; i++) if (pairs[i][1] > 0) total += pairs[i][1];
    if (total <= 0) return undefined;
    x = r() * total;
    for (i = 0; i < pairs.length; i++) {
      if (pairs[i][1] <= 0) continue;
      if (x < pairs[i][1]) return pairs[i][0];
      x -= pairs[i][1];
    }
    for (i = pairs.length - 1; i >= 0; i--) if (pairs[i][1] > 0) return pairs[i][0];
  }

  /* env: { wallNow, monoNow, random, say, storage: { get, set, remove } } */
  function create(D, env) {
    var wallNow = env.wallNow, monoNow = env.monoNow, store = env.storage;
    var lastSayAt = -1e9;     // monotonic ms of the latest Whisper, so chatter never crowds one
    function say(msg, kind) { lastSayAt = monoNow(); env.say(msg, kind); }

    var S;                    // saved state
    var C = {};               // derived values, rebuilt every tick
    var dirty = { omens: true, codex: true, upgs: false };
    /* Things the interface may want to tell the player about (a toast). The rules only record them. The
       interface drains the list; it never grows past 60 if nobody is listening. */
    var events = [];
    function emit(type, data) { if (events.length < 60) { data = data || {}; data.type = type; events.push(data); } }
    function drainEvents() { var e = events; events = []; return e; }   // the interface clears these after redrawing

    /* ---------- state ---------- */

    function newSeed() { return Math.floor(env.random() * 4294967296) >>> 0; }

    /* seed: pass one to skip drawing a random number (adopt does, so loading never consumes env.random). */
    function fresh(seed) {
      return {
        v: 3,
        seed: seed === undefined ? newSeed() : seed,   // fixes the daily and per-fathom rolls, see rng()
        born: wallNow(),      // wall time this realm began. Informational only, nothing may depend on it
        gloom: 0, runGloom: 0, totalGloom: 0,
        echoes: 0, echoesTotal: 0, runEchoes: 0, ritesKept: {},
        glass: 0, glassTotal: 0, unlightings: 0,
        den: {}, upg: {}, rites: {}, perks: {}, omens: {}, codex: {},
        codexSeq: 0,          // how many pages have ever been unlocked: each page stores the number it got
        codexNew: {},         // pages unlocked and not yet opened
        shaft: 1, shaftTop: 1, bestShaft: 0, shaftHp: shaftMaxHp(1), bossTime: BOSS_TIME, march: 0,
        autoAdvance: true, regroup: false, sealed: 0,
        clicks: 0, lanterns: 0, lanternSpawns: 0, streak: 0, bestStreak: 0, processions: 0, wardenLamps: 0, played: 0, runTime: 0,
        buffs: { hush: 0, teeth: 0 },
        lanternIn: 75,
        unlocked: { shafts: false, rites: false, unlight: false },
        ended: false,
        seen: wallNow(),      // latest wall-clock time this realm has observed
        debt: 0,              // seconds of away time forfeited after the clock ran backwards
        marks: 0,             // times the save failed its seal or its audit
        exportedAt: 0,        // wall ms of the last export (copy or file); 0 = never
        remindedAt: 0,        // wall ms the backup reminder was last shown; 0 = never
        opts: { sci: false, motion: !(env.prefersReducedMotion && env.prefersReducedMotion()), buy: 1, keys: true, chatter: true },
        nav: { dest: 'seat', page: { realm: 'den', host: 'shaft', deep: 'unl', ledger: 'omen' } }   // where the player was, per destination
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
      var s = fresh(0), now = wallNow();
      if (!o || typeof o !== 'object') { s.seed = newSeed(); return s; }
      s.seed = own(o, 'seed') ? int(o, 'seed', 0, 4294967295, 0) : newSeed();
      s.born = num(o, 'born', 0, now, now);
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
      // Echoes gained this fathom, and the Rite levels carried in by Rites Remembered. A save from
      // before these fields existed cannot say, so its Rites are treated as carried in and tracked from here.
      if (own(o, 'runEchoes')) {
        s.runEchoes = num(o, 'runEchoes', 0, s.echoesTotal, 0);
        D.RITES.forEach(function (r) { var n = int(o.ritesKept, r.id, 0, r.max || 400, 0); if (n) s.ritesKept[r.id] = n; });
      } else if (s.unlightings > 0) {
        s.runEchoes = s.echoes;
        for (var rk in s.rites) s.ritesKept[rk] = s.rites[rk];
      } else {
        s.runEchoes = s.echoesTotal;
      }
      D.PERKS.forEach(function (p) { if (flag(o.perks, p.id)) s.perks[p.id] = 1; });
      OMENS.forEach(function (m) { if (flag(o.omens, m.id)) s.omens[m.id] = 1; });
      // codex[id] is the order the page was learned in. A save from before that held 1 for every page:
      // ties keep table order, and pages unlocked from here on number above the highest found.
      var seqMax = 0;
      D.CODEX.forEach(function (c) { var n = int(o.codex, c.id, 0, 9999, 0); if (n) { s.codex[c.id] = n; if (n > seqMax) seqMax = n; } });
      s.codexSeq = Math.max(seqMax, int(o, 'codexSeq', 0, 9999, 0));
      D.CODEX.forEach(function (c) { if (s.codex[c.id] && flag(o.codexNew, c.id)) s.codexNew[c.id] = 1; });
      s.bestShaft = int(o, 'bestShaft', 0, 1e5, 0);
      s.shaftTop = int(o, 'shaftTop', 1, s.bestShaft + 1, 1);
      s.shaft = int(o, 'shaft', 1, s.shaftTop, 1);
      s.shaftHp = num(o, 'shaftHp', 0, shaftMaxHp(s.shaft), 0) || shaftMaxHp(s.shaft);
      s.bossTime = num(o, 'bossTime', 0, 600, BOSS_TIME);
      s.march = num(o, 'march', 0, MARCH, 0);
      s.autoAdvance = !own(o, 'autoAdvance') || o.autoAdvance !== false;
      s.regroup = own(o, 'regroup') && o.regroup === true;
      s.sealed = num(o, 'sealed', 0, BIG, 0);
      s.played = num(o, 'played', 0, BIG, 0);
      s.runTime = num(o, 'runTime', 0, s.played, 0);
      s.clicks = int(o, 'clicks', 0, BIG, 0);
      s.lanterns = int(o, 'lanterns', 0, BIG, 0);
      s.lanternSpawns = int(o, 'lanternSpawns', 0, BIG, 0);
      s.streak = int(o, 'streak', 0, 1e6, 0);
      s.bestStreak = int(o, 'bestStreak', 0, 1e6, 0);
      s.processions = int(o, 'processions', 0, BIG, 0);
      s.wardenLamps = int(o, 'wardenLamps', 0, BIG, 0);
      s.buffs.hush = num(o.buffs, 'hush', 0, 200, 0);
      s.buffs.teeth = num(o.buffs, 'teeth', 0, 200, 0);
      s.lanternIn = num(o, 'lanternIn', 0, 150, 75);
      ['shafts', 'rites', 'unlight'].forEach(function (k) { s.unlocked[k] = own(o.unlocked, k) && o.unlocked[k] === true; });
      s.ended = own(o, 'ended') && o.ended === true && s.bestShaft >= FINAL_SHAFT;
      s.seen = num(o, 'seen', 0, BIG, num(o, 'last', 0, now, now));   // `last` is the v1 field
      s.debt = num(o, 'debt', 0, 86400, 0);
      s.marks = int(o, 'marks', 0, 1e6, 0);
      s.exportedAt = num(o, 'exportedAt', 0, now, 0);
      s.remindedAt = num(o, 'remindedAt', 0, now, 0);
      s.opts.sci = own(o.opts, 'sci') && o.opts.sci === true;
      s.opts.motion = !own(o.opts, 'motion') || o.opts.motion !== false;
      s.opts.keys = !own(o.opts, 'keys') || o.opts.keys !== false;
      s.opts.chatter = !own(o.opts, 'chatter') || o.opts.chatter !== false;
      if (own(o.opts, 'buy') && [1, 10, 25, 'max'].indexOf(o.opts.buy) >= 0) s.opts.buy = o.opts.buy;
      if (own(o, 'nav') && o.nav !== null && typeof o.nav === 'object') {
        // Page ids are free text of a safe shape: later pages are registered by the interface, not known here.
        if (own(o.nav, 'dest') && NAV_DESTS.indexOf(o.nav.dest) >= 0) s.nav.dest = o.nav.dest;
        ['realm', 'host', 'deep', 'ledger'].forEach(function (d) {
          var v = own(o.nav, 'page') ? o.nav.page[d] : undefined;
          if (own(o.nav, 'page') && own(o.nav.page, d) && typeof v === 'string' && /^[a-z][a-z0-9]{0,15}$/.test(v)) s.nav.page[d] = v;
        });
      } else if (own(o, 'tab') && own(OLD_TABS, o.tab)) {
        s.nav.dest = OLD_TABS[o.tab][0];
        s.nav.page[OLD_TABS[o.tab][0]] = OLD_TABS[o.tab][1];
      }
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
        var sum = 0, free = startingDenizens(s);
        D.DENIZENS.forEach(function (d) {
          var f = free[d.id] || 0, n = s.den[d.id] || 0;
          if (n > f) sum += denCost(d, f, n - f, s);
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

      // Rite levels above the ones carried in were paid for in this fathom's Echoes.
      if (s.echoes > s.runEchoes) { s.echoes = s.runEchoes; fixes++; }
      var keptBad = false;
      D.RITES.forEach(function (r) {
        var have = s.rites[r.id] || 0;
        if ((s.ritesKept[r.id] || 0) > have) { if (have) s.ritesKept[r.id] = have; else delete s.ritesKept[r.id]; keptBad = true; }
      });
      if (keptBad) fixes++;
      var e = 0;
      D.RITES.forEach(function (r) { for (var l = s.ritesKept[r.id] || 0; l < (s.rites[r.id] || 0); l++) e += riteCost(r, l, s); });
      if (e > (s.runEchoes - s.echoes) * 1.01 + 1) {
        var back = {};
        for (var bk in s.ritesKept) back[bk] = s.ritesKept[bk];
        s.rites = back; fixes++;
      }

      // Hands and lanterns have physical limits.
      var maxClicks = Math.floor(s.played * CLICK_CAP + 100);
      if (s.clicks > maxClicks) { s.clicks = maxClicks; fixes++; }
      var maxLanterns = Math.floor(s.played / 20 + 5);
      if (s.lanterns > maxLanterns) { s.lanterns = maxLanterns; fixes++; }
      // Streaks, Processions and Warden's Lamps are counted out of lanterns snuffed.
      if (s.bestStreak > s.lanterns) { s.bestStreak = s.lanterns; fixes++; }
      if (s.streak > s.bestStreak) { s.streak = s.bestStreak; fixes++; }
      if (s.processions > s.lanterns / D.LANTERNS.procession.count) { s.processions = Math.floor(s.lanterns / D.LANTERNS.procession.count); fixes++; }
      if (s.wardenLamps > s.lanterns) { s.wardenLamps = s.lanterns; fixes++; }
      if (s.lanternSpawns < s.lanterns - 4 * s.processions) { s.lanternSpawns = Math.max(0, s.lanterns - 4 * s.processions); fixes++; }
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

    /* ---------- backups ----------
       Three extra sealed copies, each written inside its own try so that a full disk can never stop
       the main save. daily: the last save of the previous local day. unlight: the realm just before an
       Unlighting. import: the realm just before an import, a restore or an erase replaced it. */
    var BAK = { daily: KEY + '.bak.daily', unlight: KEY + '.bak.unlight', 'import': KEY + '.bak.import' };
    var BAK_SLOTS = ['daily', 'unlight', 'import'];
    var SET_ASIDE = { rejected: KEY + '.rejected', unreadable: KEY + '.unreadable' };

    function writeBackup(slot, text) { try { store.set(BAK[slot], text); } catch (e) {} }
    function dayOf(ms) { var d = new Date(ms); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
    var backupDay = 0;        // the local day the daily slot was last rotated for

    function rotateDaily() {
      var today = dayOf(wallNow());
      if (today === backupDay) return;
      var prev = null;
      try { prev = store.get(KEY); } catch (e) {}
      if (prev) writeBackup('daily', prev);
      backupDay = today;
    }

    var bakMemo = {};
    function backupInfo(slot) {
      var raw = null;
      try { raw = store.get(BAK[slot]); } catch (e) {}
      if (!raw) return null;
      if (bakMemo[slot] && bakMemo[slot].raw === raw) return bakMemo[slot].info;
      var info = null;
      try {
        var u = unpack(raw);
        if (u.sealed) { var t = adopt(u.data); info = { slot: slot, savedAt: t.seen, fathom: t.unlightings + 1, gloom: t.totalGloom, played: t.played }; }
      } catch (e) {}
      bakMemo[slot] = { raw: raw, info: info };
      return info;
    }
    /* The backups that exist and are sealed, read into temporary states (never into S). */
    function listBackups() {
      var out = [];
      BAK_SLOTS.forEach(function (slot) { var i = backupInfo(slot); if (i) out.push(i); });
      return out;
    }

    /* Puts a backup in place of the realm. The realm it replaces goes to the import slot first. */
    function restoreBackup(slot) {
      var raw = null, u;
      try { raw = BAK[slot] ? store.get(BAK[slot]) : null; } catch (e) {}
      if (!raw) return { ok: false, error: 'There is no such backup.' };
      try { u = unpack(raw); } catch (e) { return { ok: false, error: 'That backup could not be read.' }; }
      if (!u.sealed) return { ok: false, error: 'That backup has been altered. The Scribes refuse it.' };
      writeBackup('import', pack());
      S = adopt(u.data);
      pruneOmens();
      recalc();
      backupDay = dayOf(wallNow());
      if (!save()) return { ok: false, error: 'This browser refused to store the save.' };
      return { ok: true };
    }

    /* Copies set aside because they failed their seal or could not be read. They can be exported or
       discarded, never restored. */
    function listSetAside() {
      var out = [];
      Object.keys(SET_ASIDE).forEach(function (k) {
        var raw = null;
        try { raw = store.get(SET_ASIDE[k]); } catch (e) {}
        if (raw) out.push({ which: k, text: raw });
      });
      return out;
    }
    function discardSetAside(which) { if (SET_ASIDE[which]) { try { store.remove(SET_ASIDE[which]); } catch (e) {} } }

    /* ---------- keeping a copy ---------- */
    var REMIND_PLAYED = 7200, STALE_EXPORT_MS = 14 * 86400000, REMIND_EVERY_MS = 7 * 86400000;
    /* True when the realm lives only in this browser and has not been exported lately. */
    function backupStale(played, installed, exportedAt, now) {
      return played > REMIND_PLAYED && !installed && (!exportedAt || now - exportedAt > STALE_EXPORT_MS);
    }
    function reminderDue(played, installed, exportedAt, remindedAt, now) {
      return backupStale(played, installed, exportedAt, now) && (!remindedAt || now - remindedAt > REMIND_EVERY_MS);
    }
    function markExported() { S.exportedAt = wallNow(); }
    function markReminded() { S.remindedAt = wallNow(); }

    function save() {
      if (halted) return false;
      try { rotateDaily(); store.set(KEY, pack()); return true; }
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
        // The v1 save was never sealed, so it is the one input nothing vouches for. It is size-limited,
        // marked, rewritten as a sealed v2 save at once, and no longer read after LEGACY_UNTIL.
        if (wallNow() > LEGACY_UNTIL) {
          try { store.set(OLD_KEY + '.retired', legacy.slice(0, MAX_SAVE)); store.remove(OLD_KEY); } catch (e) {}
        } else if (legacy.length > MAX_SAVE) {
          try { store.set(OLD_KEY + '.unreadable', legacy.slice(0, MAX_SAVE)); store.remove(OLD_KEY); } catch (e) {}
          note = 'An older realm was found but it was too large to read. A new one begins.';
        } else {
          try {
            S = adopt(JSON.parse(legacy));
            S.marks = Math.max(S.marks, 1);
            note = 'An older realm was found and carried over. The Scribes have noted that it arrived unsealed.';
            pruneOmens();
            recalc();
            if (save()) store.remove(OLD_KEY);
          } catch (e) { S = fresh(); }
        }
      }
      pruneOmens();
      recalc();
      backupDay = dayOf(S.seen);
      return { note: note };
    }

    /* What the interface should do about a storage event from another window: 'taken' when another
       window is saving this realm, 'erased' when the saved realm was removed (or all storage was
       cleared), null for anything that is not about this realm. Pure, so it can be tested. */
    function storageAction(key, newValue) {
      if (key === null) return 'erased';
      if (key !== KEY) return null;
      return newValue === null ? 'erased' : 'taken';
    }

    function exportText() { return pack(); }

    /* Replaces the realm with an exported save. Returns { ok } or { ok: false, error }. */
    function importText(str) {
      var u;
      try { u = unpack(str); } catch (e) { return { ok: false, error: 'That text is not a Dark Realm save.' }; }
      if (!u.sealed) return { ok: false, error: 'That save has been altered since it was exported. The Scribes refuse it.' };
      writeBackup('import', pack());
      S = adopt(u.data);
      pruneOmens();
      recalc();
      backupDay = dayOf(wallNow());
      if (!save()) return { ok: false, error: 'This browser refused to store the save.' };
      return { ok: true };
    }

    function erase() {
      if (S) writeBackup('import', pack());
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
    /* set: the heading the Omens page groups them under. prog(x): how far along, 0 to 1, for a countable omen. */
    function omenSet(set, list, descFn, condFn, mono, prog) {
      list.forEach(function (p) {
        OMENS.push({ id: 'o' + OMENS.length, set: set, name: p[1], desc: descFn(p[0]), cond: function () { return condFn(p[0]); }, mono: !!mono,
          prog: function () { return Math.min(1, prog(p[0])); } });
      });
    }
    omenSet('Gloom gathered', [[1e3, 'A Puddle of Night'], [1e6, 'A Cellar of Night'], [1e9, 'A Lake of Night'], [1e12, 'A Sea of Night'],
      [1e15, 'A Sky of Night'], [1e18, 'An Age of Night'], [1e21, 'Night Without Edges'], [1e24, 'Night Without End']],
      function (x) { return 'Gather ' + fmtPlain(x) + ' Gloom in all.'; }, function (x) { return S.totalGloom >= x; }, true, function (x) { return S.totalGloom / x; });
    omenSet('Denizens bound at once', [[10, 'A Household'], [100, 'A Court'], [500, 'A City Below'], [1000, 'A Nation Below'], [2000, 'A World Below']],
      function (x) { return 'Have ' + x + ' denizens bound at once.'; }, function (x) { return totalDenizens() >= x; }, false, function (x) { return totalDenizens() / x; });
    omenSet('Full attendance', [[1, 'Full Attendance'], [50, 'Standing Room Only']],
      function (x) { return 'Have at least ' + x + ' of every denizen.'; },
      function (x) { return D.DENIZENS.every(function (d) { return cnt(d.id) >= x; }); }, false, function (x) { var m = Infinity; D.DENIZENS.forEach(function (d) { m = Math.min(m, cnt(d.id)); }); return m / x; });
    omenSet('Sunshafts sealed', [[10, 'First Stitch'], [25, 'Seamstress'], [50, 'Half Dark'], [75, 'Longer Chains'], [100, 'Noon, Cancelled'],
      [125, 'No Light Left Standing'], [150, 'The Last Shaft']],
      function (x) { return 'Seal Sunshaft ' + x + '.'; }, function (x) { return S.bestShaft >= x; }, true, function (x) { return S.bestShaft / x; });
    omenSet('Gathering by hand', [[100, 'Wet Hands'], [1000, 'Cold Hands'], [10000, 'No Hands Left']],
      function (x) { return 'Gather by hand ' + x + ' times.'; }, function (x) { return S.clicks >= x; }, true, function (x) { return S.clicks / x; });
    omenSet('Stray Lanterns snuffed', [[1, 'Snuffer'], [25, 'Wick-Thief'], [100, 'The Moths\' Revenge']],
      function (x) { return 'Snuff ' + x + (x === 1 ? ' Stray Lantern.' : ' Stray Lanterns.'); }, function (x) { return S.lanterns >= x; }, true, function (x) { return S.lanterns / x; });
    omenSet('Unlightings', [[1, 'Let Go'], [5, 'Practised Falling'], [10, 'Home Is Down']],
      function (x) { return 'Perform the Unlighting ' + (x === 1 ? 'once.' : x + ' times.'); }, function (x) { return S.unlightings >= x; }, true, function (x) { return S.unlightings / x; });
    omenSet('Rite levels held', [[10, 'Observant'], [50, 'Devout']],
      function (x) { return 'Hold ' + x + ' Rite levels at once.'; }, function (x) { return totalRites() >= x; }, false, function (x) { return totalRites() / x; });
    omenSet('Echoes recovered', [[1e3, 'A Thousand Small Habits'], [1e6, 'Everyone Who Ever Held a Cup']],
      function (x) { return 'Recover ' + fmtPlain(x) + ' Echoes in all.'; }, function (x) { return S.echoesTotal >= x; }, true, function (x) { return S.echoesTotal / x; });

    // Added after the first sets so no earlier omen id moves. Grouped with the lantern omens by set name.
    OMENS.push({ id: 'o' + OMENS.length, set: 'Stray Lanterns snuffed', name: 'A Line of Small Nights', desc: 'Snuff a whole Procession.', mono: true,
      cond: function () { return S.processions >= 1; }, prog: function () { return Math.min(1, S.processions); } });
    OMENS.push({ id: 'o' + OMENS.length, set: 'Stray Lanterns snuffed', name: 'Unbroken', desc: 'Snuff 10 lanterns in a row.', mono: true,
      cond: function () { return S.bestStreak >= 10; }, prog: function () { return Math.min(1, S.bestStreak / 10); } });
    OMENS.push({ id: 'o' + OMENS.length, set: 'Stray Lanterns snuffed', name: 'Borrowed Light', desc: 'Snuff a Warden\'s Lamp.', mono: true,
      cond: function () { return S.wardenLamps >= 1; }, prog: function () { return Math.min(1, S.wardenLamps); } });

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

    /* Denizens a perk grants at the start of a fathom. The audit uses it to tell what was bought. */
    function startingDenizens(s) { return s.perks.absence ? { gleaner: 15, scribe: 5 } : {}; }

    /* Cost functions take an optional state so that audit() can price a save it is checking. */
    function denCost(d, n, k, s) {
      return Math.ceil(d.cost * modsFor(s || S).cost * Math.pow(GROWTH, n) * (Math.pow(GROWTH, k) - 1) / (GROWTH - 1));
    }
    function maxBuy(d, n) {
      var base = d.cost * modsFor(S).cost * Math.pow(GROWTH, n);
      var k = Math.floor(Math.log(S.gloom * (GROWTH - 1) / base + 1) / Math.log(GROWTH));
      while (k > 0 && denCost(d, n, k) > S.gloom) k--;
      return Math.max(0, k);
    }
    function riteCost(r, level, s) {
      s = s || S;
      if (level === undefined) level = s.rites[r.id] || 0;
      return Math.ceil(r.base * Math.pow(r.g, level) * modsFor(s).riteCost);
    }

    function shaftMaxHp(n) { return 12 * Math.pow(1.25, n - 1) * (n % 10 === 0 ? 6 : 1); }
    function shaftReward(n) {
      return Math.ceil((1 + Math.floor(Math.pow(n, 1.4) / 4)) * (n % 10 === 0 ? 5 : 1) * C.echoMult);
    }
    function shaftName(n) {
      if (n % 10 !== 0) return 'Sunshaft ' + n;
      return D.BOSSES[n] || 'Lampwarden of the ' + n + 'th Chain';
    }
    function glassGain() { return Math.floor(Math.pow(S.runGloom / 1e9, GLASS_EXP) * modsFor(S).glass); }
    function awayPace() { return Math.min(1, 0.5 + awayMods().awayPace); }
    function bossMax() { return BOSS_TIME + modsFor(S).bossTime; }
    function awayCapHours() { return perk('unsleeping') ? 24 : 8; }

    function availableUpgs() {
      return UPGS.filter(function (u) { return !S.upg[u.id] && u.show(); })
        .sort(function (a, b) { return a.cost - b.cost; });
    }

    /* ---------- modifiers ----------
       Every bonus is a source: a function of the state that returns { channel: factor }. Channels
       are listed in docs/design/ECONOMY.md section 2. Multiplicative channels multiply, the additive
       ones add. A denizen's own channel is written 'den.<id>'. ctx is { present, wall }: present is
       false when the realm is being credited for time away, so a bonus can be limited to open play.
       recalc() and audit() read the same folded result, so a cost cannot drift between them. */
    var MULT = ['gloom', 'might', 'echo', 'hand', 'cost', 'riteCost', 'glass', 'lanternRate', 'lanternLife'];
    var ADD = ['awayPace', 'bossTime', 'autoHands'];
    var SOURCES = [];
    function addSource(name, fn) { SOURCES.push({ name: name, fn: fn }); }

    function mods(s, ctx) {
      var out = { den: {} }, i, k;
      for (i = 0; i < MULT.length; i++) out[MULT[i]] = 1;
      for (i = 0; i < ADD.length; i++) out[ADD[i]] = 0;
      SOURCES.forEach(function (src) {
        var r = src.fn(s, ctx);
        if (!r) return;
        for (k in r) {
          if (k.indexOf('den.') === 0) out.den[k.slice(4)] = (out.den[k.slice(4)] || 1) * r[k];
          else if (MULT.indexOf(k) >= 0) out[k] *= r[k];
          else if (ADD.indexOf(k) >= 0) out[k] += r[k];
          else throw new Error('Source ' + src.name + ' wrote unknown channel ' + k);
        }
      });
      return out;
    }

    /* The folded modifiers for a state. For the live realm this is the copy recalc() made. */
    function modsFor(s) {
      return (s === S && C.mods) ? C.mods : mods(s, { present: true, wall: wallNow() });
    }
    function awayMods() { return mods(S, { present: false, wall: wallNow() }); }

    function lvl(s, id) { return s.rites[id] || 0; }
    function omensOf(s) { var t = 0; for (var k in s.omens) t++; return t; }

    addSource('nightglass', function (s) {
      var f = 1 + 0.05 * s.glassTotal;
      return { gloom: f, might: f };
    });
    addSource('omens', function (s) { return { gloom: 1 + 0.01 * omensOf(s) }; });
    addSource('rites', function (s) {
      return {
        gloom: Math.pow(1.12, lvl(s, 'listen')),
        might: Math.pow(1.2, lvl(s, 'edge')),
        echo: Math.pow(1.15, lvl(s, 'names')),
        hand: Math.pow(1.5, lvl(s, 'hands')),
        lanternRate: 1 / Math.pow(0.9, lvl(s, 'lure')),
        awayPace: 0.1 * lvl(s, 'sleep')
      };
    });
    addSource('workings', function (s) {
      var out = { hand: s.upg.hand0 ? 2 : 1, gloom: 1 };
      D.REALM_UPGS.forEach(function (r) { if (s.upg[r.id]) out.gloom *= 1.5; });
      D.DENIZENS.forEach(function (d) {
        var n = 0;
        for (var j = 0; j < D.UPG_TIERS.length; j++) if (s.upg[d.id + '_' + j]) n++;
        out['den.' + d.id] = Math.pow(2, n);
      });
      return out;
    });
    addSource('perks', function (s) {
      var p = s.perks, out = { gloom: 1, might: 1, echo: 1, cost: p.thrift ? 0.9 : 1, autoHands: p.bound ? 4 : 0 };
      if (p.deep) out.gloom *= 2;
      if (p.keen) out.might *= 2;
      if (p.halls) out.echo *= 2;
      if (p.queen) { out.gloom *= 5; out.might *= 5; out.echo *= 5; }
      if (p.further) { out.gloom *= 10; out.might *= 10; }
      return out;
    });
    addSource('lanternBuffs', function (s) {
      return { gloom: s.buffs.hush > 0 ? 5 : 1, might: s.buffs.teeth > 0 ? 5 : 1 };
    });

    /* ---------- derived values ---------- */

    function recalc(ctx) {
      var i, d, M = mods(S, ctx || { present: true, wall: wallNow() });
      C.mods = M;
      C.omens = omensOf(S);
      C.gMult = M.gloom;

      C.denOut = {}; C.denEach = {};
      var total = 0, mightBase = 1;
      for (i = 0; i < D.DENIZENS.length; i++) {
        d = D.DENIZENS[i];
        C.denEach[d.id] = d.rate * (M.den[d.id] || 1) * M.gloom;
        C.denOut[d.id] = C.denEach[d.id] * cnt(d.id);
        total += C.denOut[d.id];
        mightBase += cnt(d.id) * Math.pow(3, i);
      }
      C.denGps = total;

      var pct = 0;
      for (i = 1; i < D.HAND_UPGS.length; i++) if (S.upg[D.HAND_UPGS[i].id]) pct += 0.02;
      C.click = M.hand * M.gloom + pct * C.denGps;
      C.gps = C.denGps + M.autoHands * C.click;
      C.might = mightBase * M.might;
      C.echoMult = M.echo;
    }

    /* ---------- core actions ---------- */

    function gain(x) { S.gloom += x; S.runGloom += x; S.totalGloom += x; }
    function addEchoes(x) { S.echoes += x; S.echoesTotal += x; S.runEchoes += x; }

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
      if (n === 0) { say('A ' + d.name + ' answers the seat.'); emit('den', { id: d.id, name: d.name }); }
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
      writeBackup('unlight', pack());
      S.glass += g; S.glassTotal += g; S.unlightings++;
      S.gloom = 0; S.runGloom = 0; S.echoes = 0; S.runEchoes = 0;
      S.den = {}; S.upg = {};
      var kept = {};
      if (perk('remember')) for (var k in S.rites) { var h = Math.floor(S.rites[k] / 2); if (h) kept[k] = h; }
      S.rites = kept;
      S.ritesKept = {};
      for (var kk in kept) S.ritesKept[kk] = kept[kk];
      var free = startingDenizens(S);
      for (var fk in free) S.den[fk] = free[fk];
      S.shaft = perk('quick') ? Math.floor(S.bestShaft / 2) + 1 : 1;
      S.shaftTop = S.shaft;
      S.shaftHp = shaftMaxHp(S.shaft); S.bossTime = bossMax(); S.march = 0;
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
      S.bossTime = bossMax();
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
          if (n % 10 === 0) { say(shaftName(n) + ' is undone. Sunshaft ' + n + ' is sealed.'); emit('boss', { n: n, name: shaftName(n) }); }
          if (n === FINAL_SHAFT && !S.ended) { S.ended = true; pendingEnding = true; }
        }
      }
      if (S.autoAdvance) S.shaft = n + 1;
      S.shaftHp = shaftMaxHp(S.shaft);
      S.bossTime = bossMax();
      S.march = MARCH;
    }

    var lastHeld = null;       // the Lampwarden that most recently turned the Host back, for the Night Report
    function failBoss() {
      lastHeld = { n: S.shaft, name: shaftName(S.shaft) };
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

    /* ---------- lanterns ----------
       Stray Lanterns, Votive Lanterns, Warden's Lamps and Processions. `lanterns` holds every lamp that is
       on screen or about to be (a Procession's later lamps wait their turn). Each is
       { id, kind, path, life, total, wait, proc }. The interface only draws them; every outcome is here. */

    var LN = D.LANTERNS;
    var lanterns = [], lampId = 0, procId = 0, procession = null, welcomeLantern = false;

    function lanternDelay() { return (70 + env.random() * 80) / modsFor(S).lanternRate; }

    /* Which kind a new lantern is. Pure: r in [0, 1). A Warden's Lamp needs a Lampwarden to be fighting. */
    function lanternKind(r, boss) {
      var x = r * 100, i;
      for (i = 0; i < LN.kinds.length; i++) {
        if (x < LN.kinds[i].w) return (LN.kinds[i].id === 'warden' && !boss) ? 'stray' : LN.kinds[i].id;
        x -= LN.kinds[i].w;
      }
      return 'stray';
    }
    function kindLife(kind) { for (var i = 0; i < LN.kinds.length; i++) if (LN.kinds[i].id === kind) return LN.kinds[i].life; return 14; }

    function addLamp(kind, path, life, wait, proc) {
      lanterns.push({ id: ++lampId, kind: kind, path: path, life: life, total: life, wait: wait || 0, proc: proc || 0 });
    }

    function bossFight() { return S.unlocked.shafts && S.shaft % 10 === 0; }

    function spawnLantern() {
      S.lanternSpawns++;
      var life = modsFor(S).lanternLife, i;
      if (S.lanternSpawns % LN.procession.every === 0 && !(env.modalOpen && env.modalOpen())) {
        procession = { id: ++procId, left: LN.procession.count };
        for (i = 0; i < LN.procession.count; i++) addLamp('stray', i % 2 ? 'rtl' : 'ltr', LN.procession.life * life, i * LN.procession.gap, procession.id);
      } else {
        var kind = S.lanterns >= LN.unlockAfter ? lanternKind(env.random(), bossFight()) : 'stray';
        addLamp(kind, kind === 'votive' ? 'drop' : (kind === 'warden' ? 'cross' : null), kindLife(kind) * life, 0, 0);
      }
      if (welcomeLantern) { welcomeLantern = false; say('A lantern was waiting for someone to come back.'); }
    }

    /* Which way a new lantern travels. Pure: the interface passes a random number in [0, 1). */
    function lanternPath(r) {
      var total = 0, i, x;
      for (i = 0; i < D.LANTERN_PATHS.length; i++) total += D.LANTERN_PATHS[i].w;
      x = r * total;
      for (i = 0; i < D.LANTERN_PATHS.length; i++) {
        if (x < D.LANTERN_PATHS[i].w) return D.LANTERN_PATHS[i].id;
        x -= D.LANTERN_PATHS[i].w;
      }
      return D.LANTERN_PATHS[D.LANTERN_PATHS.length - 1].id;
    }

    /* After the last lamp goes, the wait for the next one starts. */
    function lampsGone() { if (!lanterns.length) S.lanternIn = lanternDelay(); }

    function streakMult() { return 1 + LN.streak.step * Math.min(LN.streak.cap, S.streak); }

    /* One roll from the outcome table. share scales the amount or the duration. */
    function rollOutcome(share) {
      var big = perk('hunger'), mult = (big ? 3 : 1) * streakMult() * share, dur = (big ? 80 : 40) * streakMult() * share;
      var opts = ['spill', 'spill', 'spill', 'hush', 'hush', 'hush'];
      if (S.unlocked.shafts) opts.push('teeth', 'teeth', 'echo', 'echo');
      var pick = opts[Math.floor(env.random() * opts.length)], res;
      if (pick === 'spill') {
        var g = Math.max(C.gps * 300, 30 * C.click) * mult;
        gain(g);
        say('The lantern gutters. Spilled light curdles into ' + fmt(g) + ' Gloom.');
        res = { kind: 'spill', amount: g, duration: 0 };
      } else if (pick === 'hush') {
        S.buffs.hush = Math.max(S.buffs.hush, dur);
        say('A Deep Hush falls. All Gloom ×5 for ' + Math.round(dur) + ' seconds.');
        res = { kind: 'hush', amount: 5, duration: dur };
      } else if (pick === 'teeth') {
        S.buffs.teeth = Math.max(S.buffs.teeth, dur);
        say('The Host bares its teeth. Might ×5 for ' + Math.round(dur) + ' seconds.');
        res = { kind: 'teeth', amount: 5, duration: dur };
      } else {
        var e = shaftReward(S.shaft) * 10 * mult;
        addEchoes(e);
        say('The lantern was carrying memories. ' + fmt(e) + ' Echoes recovered.');
        res = { kind: 'echo', amount: e, duration: 0 };
      }
      return res;
    }

    /* trusted: the interface vouches that a real input event caused this call. id: which lamp (the oldest
       visible one when left out). Returns the first outcome's { kind, amount, duration } plus { lampKind, outcomes, lamp }, or null when there was nothing to snuff. */
    function snuffLantern(trusted, id) {
      if (trusted !== true) return null;
      var lamp = null, i;
      for (i = 0; i < lanterns.length; i++) if (lanterns[i].wait <= 0 && (!id || lanterns[i].id === id)) { lamp = lanterns[i]; break; }
      if (!lamp) return null;
      lanterns.splice(lanterns.indexOf(lamp), 1);
      S.lanterns++;
      var share = lamp.proc ? LN.procession.share : 1, outcomes = [], kind = lamp.kind;
      if (kind === 'warden' && !bossFight()) kind = 'stray';          // the Host is no longer fighting a Lampwarden
      if (kind === 'votive') { outcomes.push(rollOutcome(share)); outcomes.push(rollOutcome(share)); }
      else if (kind === 'warden') {
        var cut = LN.wardenShare * shaftMaxHp(S.shaft);
        S.shaftHp = Math.max(0, S.shaftHp - cut);
        S.bossTime = Math.min(bossMax(), S.bossTime + LN.wardenTime);
        S.wardenLamps++;
        say('The Warden\'s Lamp burns the Lampwarden\'s light thin.');
        outcomes.push({ kind: 'warden', amount: cut, duration: LN.wardenTime });
        if (S.shaftHp <= 1e-9) clearShaft();                              // cleared this way, it pays out as any seal does
      } else outcomes.push(rollOutcome(share));
      S.streak++;
      if (S.streak > S.bestStreak) S.bestStreak = S.streak;
      if (lamp.proc && procession && procession.id === lamp.proc && --procession.left === 0) {
        var bonus = (perk('hunger') ? 80 : 40);
        S.buffs.hush = Math.max(S.buffs.hush, bonus);
        S.processions++;
        say('The whole procession, dark. The Scribes are counting chains.');
        procession = null;
      }
      lampsGone();
      afterChange();
      return { kind: outcomes[0].kind, amount: outcomes[0].amount, duration: outcomes[0].duration, lampKind: kind, outcomes: outcomes, lamp: lamp };
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

    /* ---------- court chatter ----------
       One line every few minutes from a denizen the player owns, never repeating until the pool is spent.
       The timer is not saved. It runs only while the page is visible and no dialog is open. */
    var chatterIn = -1, usedChatter = {};
    function chatterDelay(first) { return first ? 60 + env.random() * 60 : 150 + env.random() * 210; }

    /* A line and the denizen it belongs to, or null when no owned denizen has one left. Marks it used. */
    function pickChatter() {
      var pool = [], pass, id;
      for (pass = 0; pass < 2 && !pool.length; pass++) {
        for (id in D.CHATTER) {
          if (cnt(id) < 1) continue;
          D.CHATTER[id].forEach(function (line) { if (!usedChatter[line]) pool.push({ id: id, line: line }); });
        }
        if (!pool.length) usedChatter = {};
      }
      if (!pool.length) return null;
      var pick = pool[Math.floor(env.random() * pool.length)];
      usedChatter[pick.line] = 1;
      return pick;
    }

    function chatterStep(dt) {
      if (!S.opts.chatter || S.played < 180) return;
      if ((env.hidden && env.hidden()) || (env.modalOpen && env.modalOpen())) return;
      if (chatterIn < 0) chatterIn = chatterDelay(true);
      chatterIn -= dt;
      if (chatterIn > 0) return;
      if (monoNow() - lastSayAt < 5000) { chatterIn = 10; return; }          // a Whisper just landed: wait
      var p = pickChatter();
      chatterIn = chatterDelay(false);
      if (p) say(p.line, 'chatter');
    }

    /* Whispers kept across a reload (the interface writes them under their own key). The text comes from
       storage, so it is untrusted: only an array of short strings is accepted, at most 30. */
    function parseLog(text) {
      var a;
      try { a = JSON.parse(text); } catch (e) { return []; }
      if (!Array.isArray(a)) return [];
      return a.filter(function (x) { return typeof x === 'string' && x.length > 0 && x.length <= 300; }).slice(0, 30);
    }

    /* ---------- time ---------- */

    var slowTimer = 0, saveTimer = 0;

    function step(dt) {
      recalc();
      gain(C.gps * dt);
      if (S.buffs.hush > 0) S.buffs.hush = Math.max(0, S.buffs.hush - dt);
      if (S.buffs.teeth > 0) S.buffs.teeth = Math.max(0, S.buffs.teeth - dt);
      // Lanterns neither spawn nor expire while the page is hidden. One already drifting is withdrawn.
      chatterStep(dt);
      if (env.hidden && env.hidden()) { if (lanterns.length) { lanterns = []; procession = null; S.lanternIn = 5; } }   // withdrawn, not lost: the streak is kept
      else if (lanterns.length) {
        for (var li = lanterns.length - 1; li >= 0; li--) {
          var lp = lanterns[li];
          if (lp.wait > 0) { lp.wait -= dt; continue; }
          lp.life -= dt;
          if (lp.life <= 0) {                                              // it drifted past unsnuffed
            lanterns.splice(li, 1);
            S.streak = 0;
            if (lp.proc && procession && procession.id === lp.proc) procession = null;
          }
        }
        lampsGone();
      }
      else { S.lanternIn -= dt; if (S.lanternIn <= 0 && S.totalGloom >= 50) spawnLantern(); }
      fight(dt);
      S.played += dt; S.runTime += dt;
    }

    /* Credits time the page was not running. Returns a plain report, or null when there is
       nothing to tell. bestShaft is the new deepest seal, or 0 when it did not move. */
    /* kind: 'absence' (the page was not running) or 'throttle' (the page ran slowly in the background).
       A throttled tab keeps any lantern boons running down instead of clearing them. */
    function away(sec, kind) {
      if (S.debt > 0) {
        var pay = Math.min(sec, S.debt);
        S.debt -= pay; sec -= pay;
        if (sec < 1) { say('The realm waited for its clocks to agree. Nothing was gathered meanwhile.'); return null; }
      }
      var capH = awayCapHours();
      var t = Math.min(sec, capH * 3600);
      if (sec >= 600) { S.lanternIn = Math.min(S.lanternIn, 8); welcomeLantern = true; }
      var eff = awayPace(), kept = { h: S.buffs.hush, t: S.buffs.teeth };
      S.buffs.hush = 0; S.buffs.teeth = 0;
      recalc({ present: false, wall: wallNow() });
      var g = C.gps * t * eff, e0 = S.echoesTotal, s0 = S.bestShaft;
      lastHeld = null;
      gain(g);
      fight(t * eff);
      S.played += t; S.runTime += t;
      if (kind === 'throttle') { S.buffs.hush = Math.max(0, kept.h - t); S.buffs.teeth = Math.max(0, kept.t - t); }
      recalc();
      if (g <= 0 && S.echoesTotal === e0) return null;
      return {
        sec: sec, credited: t, pace: eff, capHours: capH, gloom: g, capped: sec > t,
        echoes: S.echoesTotal - e0, bestShaft: S.bestShaft > s0 ? S.bestShaft : 0,
        held: lastHeld ? { n: lastHeld.n, name: lastHeld.name } : null
      };
    }

    function mergeAway(a, b) {
      return {
        sec: a.sec + b.sec, credited: a.credited + b.credited, pace: b.pace, capHours: b.capHours, capped: a.capped || b.capped,
        gloom: a.gloom + b.gloom, echoes: a.echoes + b.echoes, bestShaft: Math.max(a.bestShaft, b.bestShaft), held: b.held || a.held
      };
    }

    /* Time while the page runs is measured on the monotonic clock, so changing the device clock
       cannot speed the game up. Wall-clock time only counts for the gap while the page was not
       running, and that gap goes through away(): capped, and at the away pace. */
    var monoLast = 0;

    function start() { monoLast = monoNow(); }

    function tick() {
      if (halted) return { away: null, ending: false };
      var w = wallNow(), m = monoNow(), rep = null, thr = null, abs = null;
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
      if (dm > 90) thr = away(dm, 'throttle'); else step(dm);
      if (gap > 60) abs = away(gap, 'absence');
      // A report is for an absence of five minutes or more. A throttled tab and shorter gaps are credited
      // with one Whisper, so nothing interrupts the player who is here.
      if (abs && abs.sec >= 300) rep = thr ? mergeAway(thr, abs) : abs;
      else {
        var q = thr && abs ? mergeAway(thr, abs) : (thr || abs);
        if (q) say('The realm kept working. ' + fmtTime(q.sec) + '.');
      }
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
        emit('unlock', { what: 'Sunshafts', go: { dest: 'host', page: 'shaft' } });
      }
      if (!u.rites && S.echoesTotal >= 1) {
        u.rites = true; say('The first Echo comes home. The Cantors know rites that feed on these.');
        emit('unlock', { what: 'Rites', go: { dest: 'host', page: 'rite' } });
      }
      if (!u.unlight && (S.runGloom >= 1e7 || S.unlightings > 0)) {
        u.unlight = true; say('The realm is growing heavy. The oldest page of the Ledger describes what to do about that.');
        emit('unlock', { what: 'The Unlighting', go: { dest: 'deep', page: 'unl' } });
      }

      // After a failed Lampwarden the Host returns on its own once it can win.
      if (S.regroup && shaftMaxHp(S.shaftTop) / C.might < bossMax() * 0.8) {
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
        if (!S.omens[o.id] && o.cond()) { S.omens[o.id] = 1; say('Omen: ' + o.name + '.'); dirty.omens = true; emit('omen', { id: o.id, name: o.name }); }
      });

      var f = {
        total: S.totalGloom, denizens: totalDenizens(), den: {}, lanterns: S.lanterns, shaftsOpen: u.shafts,
        echoesTotal: S.echoesTotal, best: S.bestShaft, unlightOpen: u.unlight, unlightings: S.unlightings, glassTotal: S.glassTotal,
        // Later systems fill these in. Until they exist they are zero, so their pages cannot unlock.
        skyOpen: 0, sky: { moonless: 0, lidless: 0, longestnight: 0, longestday: 0, balance: 0, eclipse: 0 },
        petitions: 0, vigils: 0, litanies: 0, soundings: 0,
        sets: { table: 0, survey: 0, loft: 0, lamp: 0, queen: 0, bed: 0 },
        currents: 0, vowsOpen: 0, paneLit: 0, end: S.ended ? 1 : 0, elderBell: 0
      };
      D.DENIZENS.forEach(function (d) { f.den[d.id] = cnt(d.id); });
      D.CODEX.forEach(function (c) {
        if (!S.codex[c.id] && D.LIVE_SYSTEMS.indexOf(c.sys || 'core') >= 0 && c.when(f)) {
          S.codexSeq++; S.codex[c.id] = S.codexSeq; S.codexNew[c.id] = 1; dirty.codex = true;
          if (c.id !== 'waking') { say('Codex: ' + c.title + '.'); emit('codex', { id: c.id, title: c.title }); }
        }
      });
    }

    /* ---------- the codex ---------- */
    function codexUnread() { var n = 0; for (var k in S.codexNew) n++; return n; }
    function markCodexRead(id) { delete S.codexNew[id]; }
    function markAllCodexRead() { S.codexNew = {}; }
    /* Pages in live systems only: the ones the player could know about. */
    function codexLive() { return D.CODEX.filter(function (c) { return D.LIVE_SYSTEMS.indexOf(c.sys || 'core') >= 0; }); }

    /* ---------- the Night Report ---------- */

    /* What is waiting for the player on return. Each provider gives { id, text, go } or null.
       Later systems append here (offers, a slack line, the sky). */
    var WAITING = [
      function () {
        var n = availableUpgs().filter(function (u) { return S.gloom >= u.cost; }).length;
        return n ? { id: 'working', text: n + (n === 1 ? ' working can be completed.' : ' workings can be completed.'), go: { dest: 'realm', page: 'work' } } : null;
      },
      function () { return facts().unlight ? { id: 'unlight', text: 'The realm is heavy enough to let go.', go: { dest: 'deep', page: 'unl' } } : null; }
    ];
    function waiting() {
      var out = [];
      WAITING.forEach(function (fn) { var w = fn(); if (w) out.push(w); });
      return out;
    }
    /* When the realm stops working if the player leaves at nowMs. */
    function returnAt(nowMs) { return nowMs + awayCapHours() * 3600000; }

    /* ---------- what to do next ---------- */

    /* The facts the Seat's objective strip chooses from. Pure reads of the state. */
    function facts() {
      var f = { denizens: totalDenizens(), work: null, boss: null, unlight: false, nextDen: null, rite: false, omen: null }, i;
      var ups = availableUpgs();
      for (i = 0; i < ups.length; i++) if (S.gloom >= ups[i].cost) { f.work = ups[i].name; break; }
      if (S.unlocked.shafts && S.shaftTop % 10 === 0) {
        var need = shaftMaxHp(S.shaftTop) / C.might / bossMax();
        if (need > 1) f.boss = { mult: need, name: shaftName(S.shaftTop) };
      }
      f.unlight = S.unlocked.unlight && S.unlightings === 0 && glassGain() >= 1;
      for (i = 0; i < D.DENIZENS.length; i++) {
        var d = D.DENIZENS[i];
        if (cnt(d.id) > 0) continue;
        var cost = denCost(d, 0, 1), eta = S.gloom >= cost ? 0 : (C.gps > 0 ? (cost - S.gloom) / C.gps : -1);
        if (eta >= 0 && eta <= 600) f.nextDen = { name: d.name, when: eta === 0 ? 'reach' : fmtTime(eta) };
        break;
      }
      if (S.unlocked.rites) {
        for (i = 0; i < D.RITES.length; i++) {
          var r = D.RITES[i];
          if (S.echoes >= riteCost(r) && !(r.max && rl(r.id) >= r.max)) { f.rite = true; break; }
        }
      }
      var best = 0;
      OMENS.forEach(function (o) {
        if (S.omens[o.id]) return;
        var q = o.prog();
        if (q >= 0.75 && q < 1 && q > best) { best = q; f.omen = { name: o.name, ratio: q }; }
      });
      return f;
    }

    /* { id, text, go } for the first applicable objective. */
    function objective() {
      var f = facts();
      for (var i = 0; i < D.OBJECTIVES.length; i++) {
        var o = D.OBJECTIVES[i];
        if (o.when(f)) return { id: o.id, text: o.text(f), go: o.go };
      }
      return { id: 'quiet', text: 'The realm is quiet.', go: null };
    }

    /* "in 3m 20s" for how long until have reaches cost at income per second. Empty when it cannot be said. */
    function eta(have, cost, income) {
      if (have >= cost || !(income > 0)) return '';
      var sec = (cost - have) / income;
      return sec > 86400 ? 'over a day' : 'in ' + fmtTime(sec);
    }

    /* A rolling rate over the last windowSec seconds of samples (total, time in seconds). */
    function rateMeter(windowSec) {
      var s = [];
      return {
        sample: function (total, t) { s.push([t, total]); while (s.length > 1 && t - s[0][0] > windowSec) s.shift(); },
        rate: function () {
          if (s.length < 2) return 0;
          var a = s[0], b = s[s.length - 1], dt = b[0] - a[0];
          return dt > 0 ? Math.max(0, (b[1] - a[1]) / dt) : 0;
        },
        reset: function () { s = []; }
      };
    }

    /* The factors that make up a channel right now, by source, for the "Why" popover. */
    var SOURCE_LABELS = { nightglass: 'Nightglass', omens: 'Omens', rites: 'Rites', workings: 'Workings', perks: 'Nightglass perks', lanternBuffs: 'Lantern boon' };
    function breakdown(channel) {
      var out = [], add = ADD.indexOf(channel) >= 0, ctx = { present: true, wall: wallNow() };
      SOURCES.forEach(function (src) {
        var r = src.fn(S, ctx);
        if (!r || r[channel] === undefined) return;
        if (add ? r[channel] !== 0 : Math.abs(r[channel] - 1) > 1e-9) out.push({ name: SOURCE_LABELS[src.name] || src.name, value: r[channel] });
      });
      return out;
    }

    /* ---------- the engine ---------- */

    var engine = {
      KEY: KEY, MAX_SAVE: MAX_SAVE, BOSS_TIME: BOSS_TIME, GLASS_EXP: GLASS_EXP, FINAL_SHAFT: FINAL_SHAFT, MARCH: MARCH,
      C: C, UPGS: UPGS, OMENS: OMENS, dirty: dirty,
      // time
      start: start, tick: tick, step: step, away: away, slowChecks: slowChecks, recalc: recalc, fight: fight,
      // actions
      buyDenizen: buyDenizen, buyUpg: buyUpg, buyRite: buyRite, buyPerk: buyPerk, unlight: unlight,
      lanternPath: lanternPath, lanternKind: lanternKind, setShaft: setShaft, setAutoAdvance: setAutoAdvance, gather: gather, snuffLantern: snuffLantern,
      // save
      load: load, save: save, exportText: exportText, importText: importText, erase: erase,
      listBackups: listBackups, restoreBackup: restoreBackup, listSetAside: listSetAside, discardSetAside: discardSetAside,
      backupStale: backupStale, reminderDue: reminderDue, markExported: markExported, markReminded: markReminded,
      halt: function () { halted = true; }, storageAction: storageAction,
      // reads
      cnt: cnt, rl: rl, perk: perk, totalDenizens: totalDenizens, totalRites: totalRites,
      denCost: denCost, maxBuy: maxBuy, riteCost: riteCost, shaftMaxHp: shaftMaxHp, shaftReward: shaftReward,
      shaftName: shaftName, glassGain: glassGain, awayPace: awayPace, awayCapHours: awayCapHours, bossMax: bossMax,
      availableUpgs: availableUpgs, fmt: fmt, fmtTime: fmtTime,
      // modifiers and seeded randomness
      addSource: addSource, mods: mods, breakdown: breakdown, pickChatter: pickChatter, parseLog: parseLog, LOG_KEY: 'thedarkrealm.log.v1',
      codexUnread: codexUnread, markCodexRead: markCodexRead, markAllCodexRead: markAllCodexRead, codexLive: codexLive,
      waiting: waiting, returnAt: returnAt, mergeAway: mergeAway,
      facts: facts, objective: objective, eta: eta, rateMeter: rateMeter, drainEvents: drainEvents,
      rng: function (label, counter) { return mulberry32(hash32(S.seed + ':' + label + ':' + counter)); },
      pick: pick, shuffle: shuffle, weighted: weighted,
      // internals the tests exercise
      fresh: fresh, adopt: adopt, audit: audit, seal: seal, pack: pack, unpack: unpack
    };
    Object.defineProperty(engine, 'S', { get: function () { return S; } });
    Object.defineProperty(engine, 'lantern', { get: function () { for (var i = 0; i < lanterns.length; i++) if (lanterns[i].wait <= 0) return lanterns[i]; return null; } });
    Object.defineProperty(engine, 'lanterns', { get: function () { return lanterns; } });
    Object.defineProperty(engine, 'halted', { get: function () { return halted; } });
    return engine;
  }

  window.TDR_CORE = { create: create };
})();
