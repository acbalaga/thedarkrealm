/* The Dark Realm: interface. The rules live in core.js. Plain script, no dependencies, runs from file://. */
(function () {
  'use strict';

  var D = window.TDR_DATA, CORE = window.TDR_CORE, NAVM = window.TDR_NAV.create();
  try { delete window.TDR_DATA; delete window.TDR_CORE; delete window.TDR_NAV; } catch (e) {}   // keep the tables and the rules out of console reach
  var CLICK_CAP = 14;       // hand gathers accepted per second
  var VERSION = window.TDR_VERSION || 'unversioned';     // written by tools/stamp-sw.js, shown in the Realm tab
  try { delete window.TDR_VERSION; } catch (e) {}

  /* Clocks are captured once so later overrides of Date.now or performance.now change nothing. */
  var wallNow = Date.now.bind(Date);
  var monoNow = (window.performance && typeof performance.now === 'function') ? performance.now.bind(performance) : wallNow;

  var $ = function (id) { return document.getElementById(id); };

  var engine = CORE.create(D, {
    wallNow: wallNow,
    monoNow: monoNow,
    random: function () { return Math.random(); },
    hidden: function () { return document.hidden === true; },
    say: function (msg) { say(msg); },
    storage: {
      get: function (k) { return localStorage.getItem(k); },
      set: function (k, v) { localStorage.setItem(k, v); },
      remove: function (k) { localStorage.removeItem(k); }
    }
  });

  var S;                    // saved state, set once the save is loaded
  var C = engine.C;         // derived values
  var UPGS = engine.UPGS, OMENS = engine.OMENS;
  var fmt = engine.fmt, fmtTime = engine.fmtTime;
  var cnt = engine.cnt, rl = engine.rl, perk = engine.perk;
  var totalDenizens = engine.totalDenizens;
  var denCost = engine.denCost, maxBuy = engine.maxBuy, riteCost = engine.riteCost;
  var shaftMaxHp = engine.shaftMaxHp, shaftReward = engine.shaftReward, shaftName = engine.shaftName;
  var glassGain = engine.glassGain, availableUpgs = engine.availableUpgs;
  var GLASS_EXP = engine.GLASS_EXP;

  /* ---------- small UI helpers ---------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* A price with its currency mark: Gloom ●, Echoes ◆, Nightglass ◇. The mark is text, hidden from
     screen readers, so colour is not the only cue. node keeps its mark and one text node across updates. */
  var MARKS = { gloom: '●', echo: '◆', glass: '◇' };
  function setPrice(node, kind, text) {
    if (!node._price) {
      var mark = el('span', 'cur' + (kind === 'echo' ? ' cur-echo' : ''), MARKS[kind] + ' ');
      mark.setAttribute('aria-hidden', 'true');
      node._price = { mark: mark, text: document.createTextNode('') };
      node.appendChild(mark); node.appendChild(node._price.text);
    }
    node._price.mark.hidden = text === '';
    if (node._price.text.nodeValue !== text) node._price.text.nodeValue = text;
  }

  /* Builds a node without ever parsing a string as HTML. props may set className, id, rows,
     readOnly and type. children is a string (a text node), a node, or an array of those. */
  function h(tag, props, children) {
    var n = document.createElement(tag), k;
    if (props) for (k in props) n[k] = props[k];
    (function add(c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) { c.forEach(add); return; }
      n.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    })(children);
    return n;
  }

  var logLines = [];
  function say(msg) {
    logLines.unshift(msg);
    if (logLines.length > 40) logLines.pop();
    var sw = $('strip-whisper');
    if (sw) sw.textContent = msg;
    var ul = $('log');
    if (!ul) return;
    var li = el('li', null, msg);
    ul.insertBefore(li, ul.firstChild);
    while (ul.children.length > 40) ul.removeChild(ul.lastChild);
  }

  var modalQueue = [], modalOpen = false;
  /* body: a node or an array of nodes, built with h(). */
  function modal(title, body, btns) {
    modalQueue.push({ title: title, body: body, btns: btns || [{ label: 'Close', primary: true }] });
    if (!modalOpen) nextModal();
  }
  function nextModal() {
    var m = modalQueue.shift();
    if (!m) { $('modal').hidden = true; modalOpen = false; return; }
    modalOpen = true;
    $('modal-title').textContent = m.title;
    $('modal-body').replaceChildren.apply($('modal-body'), [].concat(m.body));
    var box = $('modal-btns');
    box.replaceChildren();
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
    modal('The First Lamp', [
      h('p', null, 'The last shaft closes behind your Host like an eye.'),
      h('p', null, 'There is one light left in Vesperdeep now, and it is yours: a small lamp at the foot of the throne, burning low and steady. ' +
        'By it you can see the seat. By it, the seat casts a shadow, long and patient, in the shape of a queen.'),
      h('p', null, 'The Auric Concord will cut no more shafts. They have nothing left to lower.'),
      h('p', { className: 'dim' }, 'The realm is quiet. You may keep it as long as you like. The dark goes on down, and so can you.')],
      [{ label: 'Keep the chair warm', primary: true }]);
  }

  /* ---------- pages ---------- */

  /* ---------- navigation ----------
     Five destinations with sub-pages (the map lives in nav.js). On a wide screen the Seat is the left
     column and is always there. On a narrow one it is a destination of its own, and the other
     destinations show a well strip under the header so gathering never leaves the screen. */
  var BUILDERS = { den: buildDenizens, work: buildWorkings, shaft: buildShafts, rite: buildRites, unl: buildUnlighting,
    omen: buildOmens, codex: buildCodex, set: buildSettings };
  var pages = {}, updaters = {}, destBtns = {}, barBtns = {}, subBtns = [];
  var wideQuery = window.matchMedia ? matchMedia('(min-width: 861px)') : { matches: true, addEventListener: null };
  var cur = null, navSig = '', upgSig = '';

  function mountPage(def) {
    if (def.id === 'seat' || pages[def.id]) return;
    var node = el('div', 'page');
    node.hidden = true;
    $('pages').appendChild(node);
    pages[def.id] = node;
    updaters[def.id] = (def.build || BUILDERS[def.id])(node);
  }

  /* Later features register a page here: addPage('host', { id: 'soundings', label: 'Soundings', lock: 'rites', build: fn }). */
  function addPage(destId, def) {
    NAVM.addPage(destId, def);
    mountPage(def);
    navSig = '';
    if (cur) applyNav();
  }

  function buildNav() {
    var tabs = $('tabs'), bar = $('bar');
    NAVM.dests.forEach(function (d) {
      if (!d.seatOnly) {
        var t = el('button', 'tab', d.label);
        t.type = 'button';
        t.setAttribute('role', 'tab');
        t.onclick = function () { goDest(d.id); };
        t.appendChild(el('i', 'dot'));
        tabs.appendChild(t);
        destBtns[d.id] = t;
      }
      var b = el('button', 'bar-btn');
      b.type = 'button';
      var g = el('span', 'bar-glyph', d.glyph); g.setAttribute('aria-hidden', 'true');
      b.appendChild(g); b.appendChild(el('span', 'bar-label', d.label)); b.appendChild(el('i', 'dot'));
      b.onclick = function () { goDest(d.id); };
      bar.appendChild(b);
      barBtns[d.id] = b;
      d.pages.forEach(mountPage);
    });
    $('strip-whisper').onclick = function () { goDest('seat'); };
    if (wideQuery.addEventListener) wideQuery.addEventListener('change', function () { applyNav(); render(); });
  }

  function goDest(id, pageId) {
    S.nav.dest = id;
    if (pageId) S.nav.page[id] = pageId;
    applyNav();
    render();
  }
  function goPage(destId, pageId) { goDest(destId, pageId); }

  /* Works out what to show from the saved choice and what is unlocked, and shows it. */
  function applyNav() {
    cur = NAVM.resolve(S.nav, S.unlocked, wideQuery.matches);
    var d = cur.dest, p = cur.page;
    document.body.setAttribute('data-dest', d.id);
    NAVM.dests.forEach(function (x) {
      var vis = NAVM.destVisible(x, S.unlocked), on = x.id === d.id;
      if (destBtns[x.id]) {
        destBtns[x.id].hidden = !vis;
        destBtns[x.id].classList.toggle('active', on);
        destBtns[x.id].setAttribute('aria-selected', on ? 'true' : 'false');
      }
      barBtns[x.id].hidden = !vis;
      barBtns[x.id].classList.toggle('active', on);
      if (on) barBtns[x.id].setAttribute('aria-current', 'page'); else barBtns[x.id].removeAttribute('aria-current');
    });
    Object.keys(pages).forEach(function (id) { pages[id].hidden = id !== p.id; });
    var vis = NAVM.pagesOf(d, S.unlocked), sig = d.id + ':' + vis.map(function (x) { return x.id; }).join(',') + ':' + p.id;
    var sub = $('subnav');
    if (sig !== navSig) {
      navSig = sig;
      sub.replaceChildren();
      subBtns = [];
      vis.forEach(function (x) {
        var b = el('button', 'seg-btn' + (x.id === p.id ? ' on' : ''), x.label);
        b.type = 'button';
        b.onclick = function () { goPage(d.id, x.id); };
        sub.appendChild(b);
        subBtns.push({ id: x.id, b: b });
      });
      sub.hidden = vis.length < 2 || d.seatOnly;
    }
    if (p.id === 'codex') S.codexUnread = 0;
  }

  function viewing(pageId) { return !!cur && cur.page.id === pageId; }

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
      btn.onclick = function () { engine.buyDenizen(d.id); render(); };
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
        setPrice(r.bc, 'gloom', fmt(cost) + ' Gloom');
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
      grid.replaceChildren();
      cards = list.map(function (u) {
        var b = el('button', 'card');
        b.type = 'button';
        b.appendChild(el('span', 'card-name', u.name));
        b.appendChild(el('span', 'card-desc', u.desc));
        var c = el('span', 'card-cost', '');
        b.appendChild(c);
        b.onclick = function () { engine.buyUpg(u.id); render(); };
        grid.appendChild(b);
        return { u: u, b: b, c: c };
      });
    }

    return function () {
      if (engine.dirty.upgs) { upgSig = ''; engine.dirty.upgs = false; }
      var list = availableUpgs();
      var sig = list.map(function (u) { return u.id; }).join(',');
      if (sig !== upgSig || cards.length !== list.length) { upgSig = sig; rebuild(list); }
      cards.forEach(function (x) {
        setPrice(x.c, 'gloom', fmt(x.u.cost) + ' Gloom');
        x.b.disabled = S.gloom < x.u.cost;
      });
      empty.hidden = list.length > 0;
      var n = 0; for (var k in S.upg) n++;
      owned.textContent = n + ' of ' + UPGS.length + ' workings complete this fathom.';
    };
  }

  /* Sunshafts */
  function buildShafts(page) {
    page.appendChild(el('p', 'lede', 'The Auric Concord cuts Sunshafts into the realm to burn shadow for lamp-fuel. Your Host climbs each one and seals it. ' +
      'It fights on its own. Every tenth shaft is held by a Lampwarden, who must be undone in ' + engine.bossMax() + ' seconds.'));
    var box = el('div', 'shaft-box');
    var title = el('h3', 'shaft-title');
    var sub = el('div', 'shaft-sub');
    var bar = el('div', 'bar'); var fill = el('div', 'bar-fill light'); var txt = el('span', 'bar-txt');
    bar.appendChild(fill); bar.appendChild(txt);
    var tbar = el('div', 'bar thin'); var tfill = el('div', 'bar-fill time'); var ttxt = el('span', 'bar-txt');
    tbar.appendChild(tfill); tbar.appendChild(ttxt);
    var stats = el('div', 'shaft-stats');
    var stT1 = document.createTextNode(''), stMark = el('span', 'cur cur-echo', '◆ '), stNum = el('span', 'cur-echo'), stT2 = document.createTextNode('');
    stMark.setAttribute('aria-hidden', 'true');
    stats.appendChild(stT1); stats.appendChild(stMark); stats.appendChild(stNum); stats.appendChild(stT2);
    box.appendChild(title); box.appendChild(sub); box.appendChild(bar); box.appendChild(tbar); box.appendChild(stats);
    page.appendChild(box);

    var ctl = el('div', 'shaft-ctl');
    var prev = el('button', 'btn', '◀ Shallower'); prev.type = 'button';
    var next = el('button', 'btn', 'Deeper ▶'); next.type = 'button';
    var top = el('button', 'btn', 'To the frontier'); top.type = 'button';
    var lab = el('label', 'check');
    var cb = document.createElement('input'); cb.type = 'checkbox';
    lab.appendChild(cb); lab.appendChild(document.createTextNode(' Advance after each seal'));
    prev.onclick = function () { engine.setAutoAdvance(false); engine.setShaft(S.shaft - 1); render(); };
    next.onclick = function () { engine.setShaft(S.shaft + 1); render(); };
    top.onclick = function () { engine.setAutoAdvance(true); engine.setShaft(S.shaftTop); render(); };
    cb.onchange = function () { engine.setAutoAdvance(cb.checked); render(); };
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
        tfill.style.width = (S.bossTime / engine.bossMax() * 100).toFixed(1) + '%';
        ttxt.textContent = Math.ceil(S.bossTime) + 's';
      }
      var secs = max / C.might;
      stT1.nodeValue = 'Host Might ' + fmt(C.might) + '  ·  Seal yields ';
      stNum.textContent = fmt(shaftReward(n));
      stT2.nodeValue = ' Echoes  ·  ' + (secs < 1 ? 'sealed in under a second' : 'about ' + fmtTime(secs) + ' to seal');
      prev.disabled = n <= 1;
      next.disabled = n >= S.shaftTop;
      top.disabled = n >= S.shaftTop && S.autoAdvance;
      cb.checked = S.autoAdvance;
      note.textContent = 'Deepest shaft sealed, ever: ' + S.bestShaft + '.  Seals this fathom and before: ' + fmt(S.sealed) + '.' +
        (boss && secs > engine.bossMax() ? '  The Host is not yet strong enough for this Lampwarden. Bind more denizens or deepen the Rite of the Sharpened Dark.' : '') +
        (S.regroup ? '  The Host is regrouping. It will return to the frontier on its own once it can win there.' : '');
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
      btn.onclick = function () { engine.buyRite(r.id); render(); };
      row.appendChild(mid); row.appendChild(btn);
      page.appendChild(row);
      return { r: r, lvl: lvl, btn: btn, bc: bc, bl: bl };
    });
    return function () {
      rows.forEach(function (x) {
        var l = rl(x.r.id), maxed = x.r.max && l >= x.r.max;
        x.lvl.textContent = 'Lv ' + l + (x.r.max ? ' / ' + x.r.max : '');
        x.bl.textContent = maxed ? 'Complete' : 'Perform';
        setPrice(x.bc, 'echo', maxed ? '' : fmt(riteCost(x.r)) + ' Echoes');
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
      modal('Let the realm go?', [
        h('p', null, ['Vesperdeep will sink a fathom. You will begin again in a shallow Stillwell, carrying ', h('b', null, fmt(g)), ' new Nightglass.']),
        h('p', { className: 'dim' }, 'Each Nightglass ever earned gives +5% Gloom and Might, for good.')],
        [{ label: 'Not yet' }, { label: 'Let go', primary: true, cb: function () { engine.unlight(); render(); } }]);
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
      b.onclick = function () { engine.buyPerk(p.id); render(); };
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
        setPrice(x.c, 'glass', own ? 'Set' : fmt(x.p.cost) + ' Nightglass');
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
      var nm = el('span', 'card-name'), mark = el('span', 'omen-mark', '○ ');
      mark.setAttribute('aria-hidden', 'true');
      nm.appendChild(mark); nm.appendChild(document.createTextNode(o.name));
      t.appendChild(nm);
      t.appendChild(el('span', 'card-desc', o.desc));
      grid.appendChild(t);
      return { o: o, t: t, mark: mark };
    });
    return function () {
      head.textContent = 'Signs that the dark is going well. ' + C.omens + ' of ' + OMENS.length + ' seen. Each adds 1% to all Gloom (+' + C.omens + '%).';
      if (!engine.dirty.omens) return;
      engine.dirty.omens = false;
      tiles.forEach(function (x) { var got = !!S.omens[x.o.id]; x.t.classList.toggle('got', got); x.mark.textContent = got ? '✓ ' : '○ '; });
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
      if (!engine.dirty.codex) return;
      engine.dirty.codex = false;
      list.replaceChildren();
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
  function isInstalled() {
    try { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; } catch (e) { return false; }
  }
  function isIos() {
    return /iP(hone|ad|od)/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function canDownload() {
    return !!(window.Blob && window.URL && URL.createObjectURL && 'download' in document.createElement('a'));
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function downloadSave(text) {
    var d = new Date();
    var name = 'dark-realm-fathom-' + (S.unlightings + 1) + '-' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '.tdr.txt';
    try {
      var url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      var a = h('a', { href: url, download: name, hidden: true });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      engine.markExported();
    } catch (e) { say('This browser refused to make the file. Copy the text instead.'); }
  }

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
      ['The Ledger', function () { return S.marks ? S.marks + (S.marks === 1 ? ' irregularity noted' : ' irregularities noted') : 'In order'; }],
      ['Away pace', function () { return Math.round(engine.awayPace() * 100) + '% for up to ' + engine.awayCapHours() + 'h'; }]
    ].map(function (d) {
      stats.appendChild(el('dt', null, d[0]));
      var dd = el('dd'); stats.appendChild(dd);
      return { dd: dd, fn: d[1] };
    });

    page.appendChild(el('h3', 'sub-head', 'Keeping'));
    page.appendChild(el('p', 'dim small', 'The game saves to this browser every 15 seconds and when you leave. Nothing is sent anywhere. There is nothing to buy.'));
    var row = el('div', 'btn-row');
    function mk(label, fn, cls) { var b = el('button', 'btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.onclick = fn; row.appendChild(b); return b; }
    mk('Save now', function () { say(engine.save() ? 'The Scribes have written it down.' : 'This browser refused to store the save.'); });
    mk('Export save', function () {
      var ta = h('textarea', { id: 'io', readOnly: true, rows: 6 });
      ta.value = engine.exportText();
      var btns = [{ label: 'Copy', cb: function () {
        var t = ta; t.select();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).catch(function () {});
          else document.execCommand('copy');
          engine.markExported();
        } catch (e) {}
        return false;
      } }];
      if (canDownload()) btns.push({ label: 'Download file', cb: function () { downloadSave(ta.value); return false; } });
      btns.push({ label: 'Done', primary: true });
      modal('Export save', [h('p', null, 'Copy this text, or download it as a file, and keep it somewhere safe.'), ta], btns);
    });
    mk('Import save', function () {
      var ta = h('textarea', { id: 'io', rows: 6 }), err = h('p', { id: 'io-err', className: 'warn' });
      var file = h('input', { type: 'file', accept: '.txt,.tdr.txt,text/plain' });
      file.onchange = function () {
        var f = file.files && file.files[0];
        if (!f) return;
        if (f.size > engine.MAX_SAVE) { err.textContent = 'That file is too large to be a save.'; return; }
        var fr = new FileReader();
        fr.onload = function () { ta.value = String(fr.result); err.textContent = 'File read. Press Import to use it.'; };
        fr.onerror = function () { err.textContent = 'That file could not be read.'; };
        fr.readAsText(f);
      };
      modal('Import save', [h('p', null, 'Paste an exported save, or choose the file. It replaces the current realm, which is kept under Backups.'), ta, file, err],
        [{ label: 'Cancel' }, { label: 'Import', primary: true, cb: function () {
          var r = engine.importText(ta.value);
          S = engine.S;
          if (!r.ok) { err.textContent = r.error; return false; }
          wiping = true;
          location.reload();
        } }]);
    });
    mk('Erase everything', function () {
      modal('Erase the realm?', h('p', null, 'This deletes all progress, including Nightglass, omens and the codex. One sealed backup is kept under Backups until you discard it.'),
        [{ label: 'Keep it', primary: true }, { label: 'Erase', danger: true, cb: function () {
          wiping = true;
          engine.erase();
          location.reload();
        } }]);
    }, 'danger');
    page.appendChild(row);

    var notice = el('p', 'dim small');
    page.appendChild(notice);
    var storageLine = el('p', 'dim small', 'Storage: checking');
    page.appendChild(storageLine);
    try {
      if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(function (ok) {
        storageLine.textContent = ok ? 'Storage: persistent' : 'Storage: may be cleared by the browser';
      }).catch(function () { storageLine.textContent = ''; });
      else storageLine.textContent = '';
    } catch (e) { storageLine.textContent = ''; }

    page.appendChild(el('h3', 'sub-head', 'Backups'));
    var bakBox = el('div', 'backups');
    page.appendChild(bakBox);
    var bakSig = null, bakAges = [];
    var SLOT_LABELS = { daily: 'The last save of the previous day', unlight: 'Before the last Unlighting', 'import': 'Before the last import, restore or erase' };
    var ASIDE_LABELS = { rejected: 'Set aside: failed its seal', unreadable: 'Set aside: could not be read' };
    function refreshBackups() {
      var list = engine.listBackups(), aside = engine.listSetAside(), now = wallNow();
      var sig = list.map(function (b) { return b.slot + ':' + b.savedAt; }).join('|') + '#' + aside.map(function (a) { return a.which + a.text.length; }).join('|');
      if (sig !== bakSig) {
        bakSig = sig; bakAges = [];
        bakBox.replaceChildren();
        if (!list.length && !aside.length) bakBox.appendChild(el('p', 'dim small', 'No backups yet. One is made each day, before each Unlighting, and before an import or erase.'));
        list.forEach(function (b) {
          var age = el('span', 'dim small');
          bakAges.push({ node: age, at: b.savedAt });
          var r = el('div', 'btn-row');
          r.appendChild(h('span', null, [SLOT_LABELS[b.slot], ' · Fathom ' + b.fathom + ' · ' + fmt(b.gloom) + ' Gloom · ', age]));
          var btn = el('button', 'btn', 'Restore'); btn.type = 'button';
          btn.onclick = function () {
            modal('Restore this backup?', h('p', null, 'The realm you have now is kept under "Before the last import, restore or erase". Nothing is lost.'),
              [{ label: 'Cancel' }, { label: 'Restore', primary: true, cb: function () {
                var res = engine.restoreBackup(b.slot);
                S = engine.S;
                if (!res.ok) { say(res.error); return; }
                wiping = true;
                location.reload();
              } }]);
          };
          r.appendChild(btn);
          bakBox.appendChild(r);
        });
        aside.forEach(function (a) {
          var r = el('div', 'btn-row');
          r.appendChild(el('span', null, ASIDE_LABELS[a.which]));
          var ex = el('button', 'btn', 'Export'); ex.type = 'button';
          ex.onclick = function () {
            var t = h('textarea', { readOnly: true, rows: 6 }); t.value = a.text;
            modal('Set-aside copy', [h('p', null, 'This copy is not played and cannot be restored. Keep the text if you want to look at it.'), t], [{ label: 'Done', primary: true }]);
          };
          var dc = el('button', 'btn danger', 'Discard'); dc.type = 'button';
          dc.onclick = function () {
            modal('Discard this copy?', h('p', null, 'It is deleted from this browser.'),
              [{ label: 'Keep it', primary: true }, { label: 'Discard', danger: true, cb: function () { engine.discardSetAside(a.which); refreshBackups(); } }]);
          };
          r.appendChild(ex); r.appendChild(dc);
          bakBox.appendChild(r);
        });
      }
      bakAges.forEach(function (x) { x.node.textContent = fmtTime(Math.max(0, (now - x.at) / 1000)) + ' ago'; });
    }

    page.appendChild(el('h3', 'sub-head', 'Display'));
    var o1 = el('label', 'check'); var c1 = document.createElement('input'); c1.type = 'checkbox';
    o1.appendChild(c1); o1.appendChild(document.createTextNode(' Scientific notation for large numbers'));
    c1.onchange = function () { S.opts.sci = c1.checked; render(); };
    var o2 = el('label', 'check'); var c2 = document.createElement('input'); c2.type = 'checkbox';
    o2.appendChild(c2); o2.appendChild(document.createTextNode(' Drifting motes and motion'));
    c2.onchange = function () { S.opts.motion = c2.checked; applyMotion(); };
    page.appendChild(o1); page.appendChild(o2);

    page.appendChild(el('h3', 'sub-head', 'Version'));
    var upRow = el('div', 'btn-row');
    var upBtn = el('button', 'btn primary', 'Apply update'); upBtn.type = 'button'; upBtn.hidden = true;
    upBtn.onclick = applyUpdate;
    upRow.appendChild(upBtn);
    page.appendChild(upRow);
    page.appendChild(el('p', 'dim small', 'Version ' + VERSION));

    return function () {
      defs.forEach(function (d) { d.dd.textContent = d.fn(); });
      c1.checked = S.opts.sci; c2.checked = S.opts.motion;
      upBtn.hidden = !waitingWorker;
      refreshBackups();
      var stale = engine.backupStale(S.played, isInstalled(), S.exportedAt, wallNow());
      notice.hidden = !stale;
      if (stale) notice.textContent = 'This realm lives only in this browser, and browsers clear unused sites. Export a copy.' +
        (isIos() ? ' Adding the game to the Home Screen keeps the save for longer.' : '');
    };
  }

  /* ---------- updates ---------- */

  /* A new service worker waits until the player says so. Progress is saved first. */
  var waitingWorker = null, applying = false;
  function offerUpdate(worker) {
    if (waitingWorker || !navigator.serviceWorker.controller) return;   // the first install is not an update
    waitingWorker = worker;
    say('A newer realm is ready. Apply it from the Realm tab.');
  }
  function applyUpdate() {
    if (!waitingWorker) return;
    applying = true;
    engine.save();
    waitingWorker.postMessage({ type: 'apply' });
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

    applyNav();
    var canWork = !viewing('work') && UPGS.some(function (u) { return !S.upg[u.id] && S.gloom >= u.cost && u.show(); });
    var unlReady = !viewing('unl') && S.unlightings === 0 && glassGain() >= 1;
    badge('realm', canWork);
    badge('ledger', S.codexUnread > 0 || (!viewing('set') && !!waitingWorker));
    badge('deep', unlReady);
    // The one gold badge: a lantern is passing while the player is somewhere that cannot show it.
    barBtns.seat.classList.toggle('has-dot', !!engine.lantern && cur.dest.id !== 'seat');
    barBtns.seat.classList.add('dot-above');

    setBuff('hush', 'Deep Hush', S.buffs.hush);
    setBuff('teeth', 'Bared Teeth', S.buffs.teeth);
    $('well-hint').hidden = S.clicks >= 15;
    syncLantern();
    var title = fmt(S.gloom) + ' Gloom · The Dark Realm';
    if (document.title !== title) document.title = title;

    if (cur && updaters[cur.page.id]) updaters[cur.page.id]();
  }

  function badge(destId, on) {
    if (destBtns[destId]) destBtns[destId].classList.toggle('has-dot', on);
    barBtns[destId].classList.toggle('has-dot', on);
  }
  /* Two chips that are kept and updated in place, never rebuilt. Hush sits above Teeth. */
  var buffEls = { hush: el('span', 'buff'), teeth: el('span', 'buff teeth') };
  function setBuff(key, label, secs) {
    var n = buffEls[key], box = $('buffs');
    if (secs > 0) {
      var t = label + ' ×5 · ' + Math.ceil(secs) + 's';
      if (n.textContent !== t) n.textContent = t;
      if (n.parentNode !== box) { if (key === 'hush') box.insertBefore(n, box.firstChild); else box.appendChild(n); }
    } else if (n.parentNode) n.parentNode.removeChild(n);
  }

  /* ---------- the Stillwell ---------- */

  /* Only real input events count, and only so many per second. */
  var clickTimes = [];
  function clickAllowed(ev) {
    if (!ev || ev.isTrusted !== true) return false;
    var t = monoNow();
    while (clickTimes.length && t - clickTimes[0] > 1000) clickTimes.shift();
    if (clickTimes.length >= CLICK_CAP) return false;
    clickTimes.push(t);
    return true;
  }

  /* Holding Enter or Space on a focused button fires trusted clicks at the keyboard repeat rate.
     Only a fresh press may act. Pointer and touch input are not affected. */
  function guardRepeat(node) {
    node.addEventListener('keydown', function (ev) {
      if (ev.repeat && (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar')) ev.preventDefault();
    });
  }

  /* A gained amount floats up from where the pointer was, or from the anchor when there was no pointer. */
  function floatGain(amount, ev, boxEl, anchor, host, cls) {
    var r = boxEl.getBoundingClientRect(), wr = anchor.getBoundingClientRect();
    var x = ev && ev.clientX ? ev.clientX - r.left : wr.left - r.left + wr.width / 2 + (Math.random() * 40 - 20);
    var y = ev && ev.clientY ? ev.clientY - r.top : wr.top - r.top + wr.height / 3;
    var f = el('span', cls, '+' + fmt(amount));
    f.style.left = x + 'px'; f.style.top = y + 'px';
    host.appendChild(f);
    if (host.children.length > 24) host.removeChild(host.firstChild);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 900);
  }

  /* The Stillwell in the scene and the small one in the well strip share this handler, so they share
     the same trust and rate checks. */
  function wellClick(ev) {
    if (!clickAllowed(ev)) return;
    var amount = engine.gather(true);
    if (!amount) return;
    if (ev && ev.currentTarget && ev.currentTarget.id === 'strip-well') {
      floatGain(amount, ev, $('strip'), $('strip-well'), $('strip-floaters'), 'floater small');
    } else {
      floatGain(amount, ev, $('scene-box'), $('well'), $('floaters'), 'floater');
      var w = $('well');
      w.classList.remove('pulse'); void w.offsetWidth; w.classList.add('pulse');
    }
    render();
  }

  /* Stray lanterns: the rules decide when one spawns and what it yields. This only draws it.
     The scene may be hidden (another destination on a narrow screen). The animation is fitted when the
     scene is on screen, starting part way through if the lantern has already been drifting. */
  var lanternShown = false, lanternPathCur = 'ltr', lanternTotal = 14, lanternFitW = -1, lanternHang = 0.4;
  function syncLantern() {
    var L = engine.lantern, on = !!L, lan = $('lantern'), box = $('scene-box');
    if (on && !lanternShown) {
      lanternPathCur = S.opts.motion ? engine.lanternPath(Math.random()) : 'still';
      lanternTotal = L.life;
      lanternHang = 0.30 + Math.random() * 0.32;
      lan.style.setProperty('--y', (12 + Math.random() * 55) + '%');
      lan.style.setProperty('--x', (lanternPathCur === 'drop' ? 12 + Math.random() * 68 : 15 + Math.random() * 65) + '%');
      lan.hidden = false;
      lanternFitW = -1;
    }
    if (on) {
      var w = box.clientWidth;
      if (w === 0) lanternFitW = -1;
      else if (w !== lanternFitW) {
        lanternFitW = w;
        ['path-ltr', 'path-rtl', 'path-drop', 'path-still'].forEach(function (c) { lan.classList.remove(c); });
        void lan.offsetWidth;
        /* The motion is CSS. These properties say where: the scene width for the crossings, a height to
           hang at, and how far into its life the lantern already is. */
        lan.style.setProperty('--w', w + 'px');
        lan.style.setProperty('--hang', Math.round(box.clientHeight * lanternHang) + 'px');
        lan.style.setProperty('--late', Math.max(0, lanternTotal - L.life).toFixed(2));
        lan.classList.add('path-' + lanternPathCur);
      }
    } else if (lanternShown) lan.hidden = true;
    lanternShown = on;
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

  function showAway(r) {
    var items = [h('li', null, [h('b', null, fmt(r.gloom)), ' Gloom gathered'])];
    if (r.echoes > 0) items.push(h('li', null, [h('b', null, fmt(r.echoes)), ' Echoes recovered']));
    if (r.bestShaft > 0) items.push(h('li', null, ['Sunshafts sealed down to ', h('b', null, String(r.bestShaft))]));
    modal('While the realm slept', [
      h('p', null, ['You were away for ', h('b', null, fmtTime(r.sec)), '. The realm kept working at ' + Math.round(r.pace * 100) +
        '% of its pace' + (r.sec > r.credited ? ', for the first ' + r.capHours + ' hours' : '') + '.']),
      h('ul', { className: 'away' }, items)],
      [{ label: 'Take the seat', primary: true }]);
  }

  function frame() {
    if (engine.halted) return;
    var r = engine.tick();
    if (r.away) showAway(r.away);
    if (r.ending) showEnding();
    render();
  }

  function boot() {
    var loaded = engine.load();
    S = engine.S;
    engine.recalc();
    buildNav();
    guardRepeat($('well'));
    guardRepeat($('lantern'));
    $('well').addEventListener('click', wellClick);
    guardRepeat($('strip-well'));
    $('strip-well').addEventListener('click', wellClick);
    $('lantern').addEventListener('click', function (ev) {
      if (engine.snuffLantern(!!ev && ev.isTrusted === true)) render();
    });
    $('modal').addEventListener('click', function (e) {
      if (e.target === $('modal') && modalQueue.length === 0) nextModal();
    });
    var isNew = S.totalGloom === 0 && S.clicks === 0;
    engine.slowChecks();
    S.codexUnread = isNew ? 1 : S.codexUnread;
    say(isNew ? 'You wake on the floor of a throne room. The seat is empty. The Stillwell is at your feet.' : 'The seat is as you left it.');
    if (loaded.note) say(loaded.note);
    applyNav();
    applyMotion();
    engine.start();
    frame();
    setInterval(frame, 100);
    function checkReminder() {
      if (engine.halted) return;
      if (engine.reminderDue(S.played, isInstalled(), S.exportedAt, S.remindedAt, wallNow())) {
        say('This realm lives only in this browser. Browsers clear unused sites. Export a copy from Keeping.');
        engine.markReminded();
      }
    }
    checkReminder();
    setInterval(checkReminder, 60000);
    function keep() { if (!wiping) engine.save(); }
    window.addEventListener('beforeunload', keep);
    window.addEventListener('pagehide', keep);            // the reliable one on phones and Home Screen apps
    document.addEventListener('visibilitychange', function () { if (document.hidden) keep(); else frame(); });
    /* A second window on the same save would overwrite this one and double the away credit. */
    window.addEventListener('storage', function (e) {
      var act = engine.storageAction(e.key, e.newValue);
      if (!act || engine.halted) return;
      engine.halt();
      modalQueue.length = 0;
      if (act === 'erased') {
        modal('The realm was erased in another window.', h('p', null, 'This window has stopped. Nothing here will be saved over the empty seat.'),
          [{ label: 'Begin again', primary: true, cb: function () { wiping = true; location.reload(); return false; } }]);
      } else {
        modal('The realm is open elsewhere', h('p', null, 'Another window or tab has taken the seat and is saving this realm. This one has stopped so the two do not overwrite each other.'),
          [{ label: 'Reload here', primary: true, cb: function () { location.reload(); return false; } }]);
      }
    });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      /* register() is a script-URL sink. Trusted Types only lets this one fixed URL through. */
      var swUrl = 'sw.js';
      if (window.trustedTypes && trustedTypes.createPolicy) {
        swUrl = trustedTypes.createPolicy('tdr', {
          createScriptURL: function (u) { if (u === 'sw.js') return u; throw new TypeError('blocked'); }
        }).createScriptURL('sw.js');
      }
      navigator.serviceWorker.register(swUrl).then(function (reg) {
        if (reg.waiting) offerUpdate(reg.waiting);
        reg.addEventListener('updatefound', function () {
          var w = reg.installing;
          if (!w) return;
          w.addEventListener('statechange', function () { if (w.state === 'installed') offerUpdate(w); });
        });
      }).catch(function () {});
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!applying) return;
        applying = false;
        location.reload();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
