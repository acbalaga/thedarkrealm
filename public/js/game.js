/* The Dark Realm: interface. The rules live in core.js. Plain script, no dependencies, runs from file://. */
(function () {
  'use strict';

  var D = window.TDR_DATA, CORE = window.TDR_CORE, NAVM = window.TDR_NAV.create(), TOASTQ = window.TDR_TOAST.createQueue(5);
  try { delete window.TDR_DATA; delete window.TDR_CORE; delete window.TDR_NAV; delete window.TDR_TOAST; } catch (e) {}   // keep the tables and the rules out of console reach
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
    modalOpen: function () { return modalOpen; },
    prefersReducedMotion: function () { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); },
    say: function (msg, kind) { say(msg, kind); },
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

  /* Distance to a price: a 2 px underline filled to have / cost in the currency's colour, and "in 3m 20s"
     when the income is known. Buy controls update this at most twice a second (affordNow), not every frame. */
  var affordNow = true, affordAt = 0, forceAfford = false;
  function afford(node, kind, have, cost, income) {
    if (!node._afford) {
      var bar = el('i', 'prog ' + kind), eta = el('span', 'eta');
      node.appendChild(bar); node.appendChild(eta);
      node._afford = { bar: bar, eta: eta };
    }
    var pct = (cost > 0 ? Math.min(1, have / cost) : 1) * 100;
    node._afford.bar.style.width = pct.toFixed(1) + '%';
    var t = kind === 'glass' ? '' : engine.eta(have, cost, income);
    if (node._afford.eta.textContent !== t) node._afford.eta.textContent = t;
  }
  function buyAgain() { forceAfford = true; render(); }

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
  /* kind: 'chatter' lines are dimmer. They are never announced (the log is not a live region). */
  function say(msg, kind) {
    logLines.unshift(msg);
    if (logLines.length > 40) logLines.pop();
    var sw = $('strip-whisper');
    if (sw) sw.textContent = msg;
    var ul = $('log');
    if (!ul) return;
    var li = el('li', kind === 'chatter' ? 'chatter' : null, msg);
    ul.insertBefore(li, ul.firstChild);
    while (ul.children.length > 40) ul.removeChild(ul.lastChild);
  }

  /* One polite live region for things worth announcing. Routine Whispers are not announced. */
  function live(msg) {
    var n = $('live');
    if (!n) return;
    n.textContent = '';
    setTimeout(function () { n.textContent = msg; }, 30);
  }

  /* ---------- toasts ----------
     One at a time, four seconds each, paused while the pointer or focus is on it, held while a dialog is
     open. The rules already write their own Whisper for the events that raise toasts, so only toasts raised
     here (an update, a reminder) ask for a Whisper of their own with whisper: true. */
  var toastShown = false, toastLeft = 0, toastPaused = false, toastTimer = 0;
  function toast(t) {
    if (t.whisper) say(t.title + (t.text ? ' · ' + t.text : '') + '.');
    TOASTQ.push(t);
    flushToasts();
  }
  function flushToasts() {
    if (toastShown) return;
    var t = TOASTQ.next(modalOpen);
    if (!t) return;
    toastShown = true; toastLeft = 4000;
    var box = el('div', 'toast k-' + t.kind);
    var body = el('button', 'toast-body');
    body.type = 'button';
    body.appendChild(el('b', 'toast-title', t.title));
    if (t.text) body.appendChild(el('span', 'toast-text', t.text));
    body.onclick = function () { if (t.go) goDest(t.go.dest, t.go.page); endToast(); };
    var x = el('button', 'toast-x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', 'Dismiss');
    x.onclick = endToast;
    box.appendChild(body); box.appendChild(x);
    box.addEventListener('mouseenter', function () { toastPaused = true; });
    box.addEventListener('mouseleave', function () { toastPaused = false; });
    box.addEventListener('focusin', function () { toastPaused = true; });
    box.addEventListener('focusout', function () { toastPaused = false; });
    $('toasts').replaceChildren(box);
    live(t.title + (t.text ? '. ' + t.text : ''));
    clearInterval(toastTimer);
    toastTimer = setInterval(function () {
      if (toastPaused) return;
      toastLeft -= 100;
      if (toastLeft <= 0) endToast();
    }, 100);
  }
  function endToast() {
    clearInterval(toastTimer);
    toastShown = false; toastPaused = false;
    $('toasts').replaceChildren();
    flushToasts();
  }

  /* What the rules noticed becomes a toast. */
  function onEvent(ev) {
    if (ev.type === 'omen') toast({ kind: 'omen', title: 'Omen', text: ev.name + ' · +1% Gloom', go: { dest: 'ledger', page: 'omen' } });
    else if (ev.type === 'codex') toast({ kind: 'codex', title: 'Codex', text: ev.title, go: { dest: 'ledger', page: 'codex' } });
    else if (ev.type === 'unlock') toast({ kind: 'unlock', title: 'Unlocked', text: ev.what, go: ev.go });
    else if (ev.type === 'boss') toast({ kind: 'unlock', title: 'Lampwarden undone', text: ev.name, go: { dest: 'host', page: 'shaft' } });
    else if (ev.type === 'slack') toast({ kind: 'sounding', title: 'The line has gone slack', text: 'Something is tied to it.', go: { dest: 'host', page: 'soundings' } });
    else if (ev.type === 'relic') toast({ kind: 'sounding', title: 'From the Sea', text: ev.name, go: { dest: 'host', page: 'soundings' } });
    else if (ev.type === 'keeping') toast({ kind: 'unlock', title: 'A vow is kept', text: ev.name, go: { dest: 'deep', page: 'vows' } });
    else if (ev.type === 'den') toast({ kind: 'unlock', title: 'Bound', text: ev.name, go: { dest: 'realm', page: 'den' } });
  }

  /* ---------- the Why popover ---------- */
  var whyAnchor = null;
  function hideWhy() {
    var pop = $('popover');
    if (pop.hidden) return false;
    pop.hidden = true;
    if (whyAnchor && document.contains(whyAnchor) && pop.contains(document.activeElement)) whyAnchor.focus();
    whyAnchor = null;
    return true;
  }
  function showWhy(anchor, title, channel, base) {
    var pop = $('popover');
    if (!pop.hidden && whyAnchor === anchor) { hideWhy(); return; }
    var total = engine.C.mods[channel], rows = engine.breakdown(channel);
    var list = el('ul', 'why-list');
    if (base) list.appendChild(h('li', null, [base.label, ' ', h('b', null, fmt(base.value))]));
    rows.forEach(function (r) { list.appendChild(h('li', null, [r.name + ' ', h('b', null, '\u00d7' + (r.value >= 100 ? fmt(r.value) : r.value.toFixed(2)))])); });
    if (!rows.length && !base) list.appendChild(h('li', { className: 'dim' }, 'Nothing is adding to this yet.'));
    pop.replaceChildren(h('p', { className: 'why-title' }, title), list,
      h('p', { className: 'why-total' }, ['Together ', h('b', null, '\u00d7' + (total >= 100 ? fmt(total) : total.toFixed(2)))]));
    pop.hidden = false;
    whyAnchor = anchor;
    var r = anchor.getBoundingClientRect(), w = Math.min(280, window.innerWidth - 24);
    pop.style.width = w + 'px';
    pop.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left)) + 'px';
    pop.style.top = (r.bottom + 6) + 'px';
  }

  /* Arrow keys, Home and End move between the controls of a tab list or radio group, and only the
     selected one is in the tab order. */
  function rovingKeys(container, itemSel, activate) {
    container.addEventListener('keydown', function (ev) {
      var items = [].slice.call(container.querySelectorAll(itemSel)).filter(function (n) { return !n.hidden; });
      var i = items.indexOf(document.activeElement);
      if (i < 0) return;
      var j = -1;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') j = (i + 1) % items.length;
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') j = (i - 1 + items.length) % items.length;
      else if (ev.key === 'Home') j = 0;
      else if (ev.key === 'End') j = items.length - 1;
      if (j < 0) return;
      ev.preventDefault();
      items[j].focus();
      activate(items[j]);
    });
  }
  function rovingTab(items, selected) {
    items.forEach(function (n) { n.tabIndex = n === selected ? 0 : -1; });
  }

  var modalQueue = [], modalOpen = false, modalCur = null, modalOpener = null;
  /* body: a node or an array of nodes, built with h(). opts.required: a choice the player has to make, so
     Escape and the backdrop do not close it. */
  function modal(title, body, btns, opts) {
    var entry = { title: title, body: body, btns: btns || [{ label: 'Close', primary: true }], required: !!(opts && opts.required) };
    modalQueue.push(entry);
    if (!modalOpen) nextModal();
    return entry;
  }

  /* While a dialog is open the page behind it is inert (aria-hidden where inert is not supported). */
  function setBackground(off) {
    ['top', 'bar'].map($).concat([document.querySelector('main')]).forEach(function (n) {
      if (!n) return;
      if ('inert' in n) n.inert = off;
      else if (off) n.setAttribute('aria-hidden', 'true'); else n.removeAttribute('aria-hidden');
    });
  }

  function nextModal() {
    var m = modalQueue.shift();
    if (!m) {
      $('modal').hidden = true; modalOpen = false; modalCur = null;
      setBackground(false);
      if (modalOpener && document.contains(modalOpener) && !modalOpener.hidden) modalOpener.focus();
      modalOpener = null;
      flushToasts();
      return;
    }
    if (!modalOpen) { modalOpener = document.activeElement; setBackground(true); }
    modalOpen = true; modalCur = m;
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

  /* Tab and Shift+Tab stay inside the dialog. */
  function trapFocus(ev) {
    if (ev.key !== 'Tab' || !modalOpen) return;
    var f = [].slice.call($('modal').querySelectorAll('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])')).filter(function (n) { return !n.disabled && !n.hidden && n.offsetParent !== null; });
    if (!f.length) { ev.preventDefault(); $('modal').querySelector('.modal-card').focus(); return; }
    var first = f[0], last = f[f.length - 1], at = document.activeElement;
    if (ev.shiftKey && (at === first || !$('modal').contains(at))) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && (at === last || !$('modal').contains(at))) { ev.preventDefault(); first.focus(); }
  }

  /* Escape closes a dialog that is not a required choice. */
  function closeTopModal() {
    if (modalOpen && modalCur && !modalCur.required) { nextModal(); return true; }
    return false;
  }

  function showEnding() {
    modal('The First Lamp', [
      h('p', null, 'The last shaft closes behind your Host like an eye.'),
      h('p', null, 'There is one light left in Vesperdeep now, and it is yours: a small lamp at the foot of the throne, burning low and steady. ' +
        'By it you can see the seat. By it, the seat casts a shadow, long and patient, in the shape of a queen.'),
      h('p', null, 'The Auric Concord will cut no more shafts. They have nothing left to lower.'),
      h('p', { className: 'dim' }, 'The realm is quiet. You may keep it as long as you like. The dark goes on down, and so can you.')],
      [{ label: 'Keep the chair warm', primary: true }], { required: true });
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
    node.id = 'page-' + def.id;
    node.setAttribute('role', 'tabpanel');
    node.setAttribute('aria-label', def.label);
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
        t.id = 'tab-' + d.id;
        t.setAttribute('aria-controls', 'pages');
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
    addPage('ledger', { id: 'fathoms', label: 'Fathoms', lock: 'unlight', build: buildFathoms });
    addPage('deep', { id: 'vows', label: 'Vows', lock: 'vows', build: buildVows });
    addPage('host', { id: 'soundings', label: 'Soundings', lock: 'soundings', build: buildSoundings });
    addPage('ledger', { id: 'almanac', label: 'Almanac', lock: 'shafts', build: buildAlmanac });
    $('sky-strip').onclick = function () { goDest('ledger', 'almanac'); };
    rovingKeys(tabs, '.tab', function (n) { n.click(); });
    rovingKeys($('subnav'), '.seg-btn', function (n) { n.click(); });
    if (wideQuery.addEventListener) wideQuery.addEventListener('change', function () { applyNav(); render(); });
  }

  function goDest(id, pageId) {
    // Tapping the Ledger while it has unread Codex pages lands on the Codex, one tap from the badge.
    if (id === 'ledger' && !pageId && S.nav.dest !== 'ledger' && engine.codexUnread() > 0) pageId = 'codex';
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
        destBtns[x.id].tabIndex = on ? 0 : -1;
      }
      barBtns[x.id].hidden = !vis;
      barBtns[x.id].classList.toggle('active', on);
      if (on) barBtns[x.id].setAttribute('aria-current', 'page'); else barBtns[x.id].removeAttribute('aria-current');
    });
    Object.keys(pages).forEach(function (id) { pages[id].hidden = id !== p.id; });
    var pg = $('pages');
    if (destBtns[d.id]) pg.setAttribute('aria-labelledby', 'tab-' + d.id); else pg.removeAttribute('aria-labelledby');
    pg.setAttribute('role', 'tabpanel');
    var vis = NAVM.pagesOf(d, S.unlocked), sig = d.id + ':' + vis.map(function (x) { return x.id; }).join(',') + ':' + p.id;
    var sub = $('subnav');
    if (sig !== navSig) {
      navSig = sig;
      sub.replaceChildren();
      subBtns = [];
      vis.forEach(function (x) {
        var b = el('button', 'seg-btn' + (x.id === p.id ? ' on' : ''), x.label);
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.id = 'subtab-' + x.id;
        b.setAttribute('aria-controls', 'page-' + x.id);
        b.setAttribute('aria-selected', x.id === p.id ? 'true' : 'false');
        b.tabIndex = x.id === p.id ? 0 : -1;
        b.onclick = function () { goPage(d.id, x.id); };
        sub.appendChild(b);
        subBtns.push({ id: x.id, b: b });
      });
      sub.hidden = vis.length < 2 || d.seatOnly;
      sub.setAttribute('role', 'tablist');
      sub.setAttribute('aria-label', d.label + ' pages');
    }
  }

  function viewing(pageId) { return !!cur && cur.page.id === pageId; }

  /* Denizens */
  function buildDenizens(page) {
    var head = el('div', 'page-head');
    head.appendChild(el('p', 'lede', 'Bind the things that live down here. Each one gathers Gloom without being asked, and lends its weight to your Host.'));
    var modes = el('div', 'seg');
    modes.setAttribute('role', 'radiogroup');
    modes.setAttribute('aria-label', 'How many to bind at once');
    var modeBtns = [];
    [1, 10, 25, 'max'].forEach(function (m) {
      var b = el('button', 'seg-btn', m === 'max' ? 'Max' : '×' + m);
      b.type = 'button';
      b.onclick = function () { S.opts.buy = m; render(); };
      modes.appendChild(b);
      b.setAttribute('role', 'radio');
      modeBtns.push({ m: m, b: b });
    });
    head.appendChild(modes);
    rovingKeys(modes, '.seg-btn', function (n) { n.click(); });
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
      var tog = el('label', 'check auto-toggle'), tcb = document.createElement('input'); tcb.type = 'checkbox';
      tcb.setAttribute('aria-label', 'Bind ' + d.plural + ' automatically');
      tcb.onchange = function () { if (tcb.checked) S.auto.den[d.id] = true; else delete S.auto.den[d.id]; };
      tog.appendChild(tcb); tog.appendChild(document.createTextNode(' Bind automatically'));
      mid.appendChild(tog);
      var btn = el('button', 'btn buy');
      btn.type = 'button';
      var bl = el('span', 'buy-label', 'Bind');
      var bc = el('span', 'buy-cost', '');
      btn.appendChild(bl); btn.appendChild(bc);
      btn.onclick = function () { engine.buyDenizen(d.id); buyAgain(); };
      row.appendChild(glyph); row.appendChild(mid); row.appendChild(btn);
      page.appendChild(row);
      return { d: d, i: i, row: row, count: count, info: info, btn: btn, bl: bl, bc: bc, tog: tog, tcb: tcb };
    });

    return function () {
      modeBtns.forEach(function (x) {
        var on = S.opts.buy === x.m;
        x.b.classList.toggle('on', on);
        x.b.setAttribute('aria-checked', on ? 'true' : 'false');
        x.b.tabIndex = on ? 0 : -1;
      });
      rows.forEach(function (r) {
        var d = r.d, n = cnt(d.id);
        var vis = r.i === 0 || n > 0 || cnt(D.DENIZENS[r.i - 1].id) > 0 || S.runGloom >= d.cost * 0.25;
        r.row.hidden = !vis;
        if (!vis) return;
        r.tog.hidden = !perk('usher'); r.tcb.checked = !!S.auto.den[d.id];
        var k = S.opts.buy === 'max' ? Math.max(1, maxBuy(d, n)) : S.opts.buy;
        var cost = denCost(d, n, k);
        r.count.textContent = n;
        var share = C.denGps > 0 ? Math.round(C.denOut[d.id] / C.denGps * 100) : 0;
        r.info.textContent = 'Each ' + fmt(C.denEach[d.id]) + '/s' + (n ? '  ·  together ' + fmt(C.denOut[d.id]) + '/s (' + share + '%)' : '') +
          '  ·  Might ' + fmt(Math.pow(3, r.i));
        r.bl.textContent = S.opts.buy === 'max' && maxBuy(d, n) < 1 ? 'Bind' : 'Bind ×' + k;
        setPrice(r.bc, 'gloom', fmt(cost) + ' Gloom');
        r.btn.disabled = S.gloom < cost;
        if (affordNow) afford(r.btn, 'gloom', S.gloom, cost, C.gps);
      });
    };
  }

  /* Workings */
  function buildWorkings(page) {
    page.appendChild(el('p', 'lede', 'Lasting improvements to the realm, paid for in Gloom. New workings appear as your denizens multiply.'));
    var all = el('button', 'btn', 'Complete all'); all.type = 'button'; all.hidden = true;
    all.onclick = function () { availableUpgs().forEach(function (u) { engine.buyUpg(u.id); }); buyAgain(); };
    page.appendChild(all);
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
        b.onclick = function () { engine.buyUpg(u.id); buyAgain(); };
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
        if (affordNow) afford(x.b, 'gloom', S.gloom, x.u.cost, C.gps);
      });
      empty.hidden = list.length > 0;
      all.hidden = list.filter(function (u) { return S.gloom >= u.cost; }).length < 2;
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

    var litRow = el('div', 'litanies inline');
    buildLitanies(litRow);
    page.appendChild(litRow);
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
    var why = el('button', 'btn', 'Why this Might'); why.type = 'button';
    why.setAttribute('aria-haspopup', 'dialog');
    why.onclick = function (ev) {
      ev.stopPropagation();
      showWhy(why, 'What makes up Host Might', 'might', { label: 'Denizens, the base', value: C.might / C.mods.might });
    };
    page.appendChild(why);
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
    var head = el('div', 'page-head');
    head.appendChild(el('p', 'lede', 'Echoes are scraps of the living, carried down by their shadows. The Cantors can spend them on rites. Rites last until the next Unlighting.'));
    var modes = el('div', 'seg');
    modes.setAttribute('role', 'radiogroup');
    modes.setAttribute('aria-label', 'How many levels to perform at once');
    var modeBtns = [];
    [1, 10, 25, 'max'].forEach(function (m) {
      var b = el('button', 'seg-btn', m === 'max' ? 'Max' : '\u00d7' + m);
      b.type = 'button'; b.setAttribute('role', 'radio');
      b.onclick = function () { S.opts.buyRite = m; render(); };
      modes.appendChild(b);
      modeBtns.push({ m: m, b: b });
    });
    head.appendChild(modes);
    rovingKeys(modes, '.seg-btn', function (n) { n.click(); });
    page.appendChild(head);
    var rows = D.RITES.map(function (r) {
      var row = el('div', 'row');
      var mid = el('div', 'row-mid');
      var title = el('div', 'row-title');
      title.appendChild(el('span', 'name', r.name));
      var lvl = el('span', 'count');
      title.appendChild(lvl);
      mid.appendChild(title);
      mid.appendChild(el('div', 'row-desc', r.desc));
      var tog = el('label', 'check auto-toggle'), tcb = document.createElement('input'); tcb.type = 'checkbox';
      tcb.setAttribute('aria-label', 'Perform ' + r.name + ' automatically');
      tcb.onchange = function () { if (tcb.checked) S.auto.rite[r.id] = true; else delete S.auto.rite[r.id]; };
      tog.appendChild(tcb); tog.appendChild(document.createTextNode(' Perform automatically'));
      mid.appendChild(tog);
      var btn = el('button', 'btn buy echo'); btn.type = 'button';
      var bl = el('span', 'buy-label', 'Perform'); var bc = el('span', 'buy-cost');
      btn.appendChild(bl); btn.appendChild(bc);
      btn.onclick = function () { var k = riteK(r); engine.buyRite(r.id, k); buyAgain(); };
      row.appendChild(mid); row.appendChild(btn);
      page.appendChild(row);
      return { r: r, lvl: lvl, btn: btn, bc: bc, bl: bl, tog: tog, tcb: tcb };
    });
    /* How many levels the button performs: the chosen amount, or the most affordable for Max, never past the cap. */
    function riteK(r) {
      var room = r.max ? r.max - rl(r.id) : 1e6, m = S.opts.buyRite;
      if (m === 'max') return Math.max(1, Math.min(room, engine.maxRite(r)));
      return Math.max(1, Math.min(m, room));
    }
    return function () {
      modeBtns.forEach(function (x) {
        var on = S.opts.buyRite === x.m;
        x.b.classList.toggle('on', on); x.b.setAttribute('aria-checked', on ? 'true' : 'false'); x.b.tabIndex = on ? 0 : -1;
      });
      rows.forEach(function (x) {
        var l = rl(x.r.id), maxed = x.r.max && l >= x.r.max, k = maxed ? 1 : riteK(x.r), cost = maxed ? 0 : engine.riteCostN(x.r, l, k);
        x.lvl.textContent = 'Lv ' + l + (x.r.max ? ' / ' + x.r.max : '');
        x.bl.textContent = maxed ? 'Complete' : (S.opts.buyRite === 'max' && engine.maxRite(x.r) < 1 ? 'Perform' : 'Perform \u00d7' + k);
        setPrice(x.bc, 'echo', maxed ? '' : fmt(cost) + ' Echoes');
        x.btn.disabled = maxed || S.echoes < cost;
        x.tog.hidden = !perk('precentor'); x.tcb.checked = !!S.auto.rite[x.r.id];
        if (affordNow) afford(x.btn, 'echo', maxed ? 0 : S.echoes, maxed ? 0 : cost, echoMeter.rate());
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
    var thisEl = el('div', 'dim small'), lastEl = el('div', 'dim small'), advEl = el('p', 'advisor');
    var btn = el('button', 'btn primary big', 'Perform the Unlighting'); btn.type = 'button';
    btn.onclick = function () {
      var g = glassGain();
      if (g < 1) return;
      if (S.unlightings >= 1) { chooseCurrent(g); return; }
      modal('Let the realm go?', [
        h('p', null, ['Vesperdeep will sink a fathom. You will begin again in a shallow Stillwell, carrying ', h('b', null, fmt(g)), ' new Nightglass.']),
        h('p', { className: 'dim' }, 'Each Nightglass ever earned gives +5% Gloom and Might, for good.')],
        [{ label: 'Not yet' }, { label: 'Let go', primary: true, cb: function () { engine.unlight(); render(); } }]);
    };
    box.appendChild(gainEl); box.appendChild(advEl); box.appendChild(thisEl); box.appendChild(lastEl); box.appendChild(nextEl); box.appendChild(btn);
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
      b.onclick = function () { engine.buyPerk(p.id); buyAgain(); };
      grid.appendChild(b);
      return { p: p, b: b, c: c };
    });
    return function () {
      var g = glassGain();
      gainEl.textContent = g >= 1 ? 'Letting go now yields ' + fmt(g) + ' Nightglass.' : 'The realm is not yet heavy enough.';
      var need = 1e9 * Math.pow(g + 1, 1 / GLASS_EXP);
      nextEl.textContent = 'Gloom gathered this fathom: ' + fmt(S.runGloom) + '.  Next Nightglass at ' + fmt(need) + '.';
      btn.disabled = g < 1;
      var adv = engine.advisor();
      if (advEl.textContent !== adv.text) advEl.textContent = adv.text;
      var rate = engine.rateNow(), ago = S.runTime - S.peak.at;
      var tt = 'This fathom: ' + fmtTime(S.runTime) + (rate > 0 ? '  \u00b7  ' + fmt(rate) + ' Nightglass per hour (peak ' + fmt(S.peak.rate) + ', ' + fmtTime(ago) + ' ago)' : '') + '.';
      if (thisEl.textContent !== tt) thisEl.textContent = tt;
      var lf = S.fathoms[S.fathoms.length - 1];
      var lt = lf ? 'Last fathom: ' + fmtTime(lf.sec) + (lf.sec > 0 ? '  \u00b7  ' + fmt(lf.glass / (lf.sec / 3600)) + ' per hour' : '') + '.' : '';
      if (lastEl.textContent !== lt) lastEl.textContent = lt;
      have.textContent = 'You hold ' + fmt(S.glass) + ' Nightglass to spend. ' + fmt(S.glassTotal) + ' earned in all (+' +
        fmt(S.glassTotal * 5) + '% Gloom and Might). Spending does not reduce that bonus.';
      cards.forEach(function (x) {
        var own = perk(x.p.id);
        x.b.classList.toggle('owned', own);
        setPrice(x.c, 'glass', own ? 'Set' : fmt(x.p.cost) + ' Nightglass');
        x.b.disabled = own || S.glass < x.p.cost;
        if (affordNow) afford(x.b, 'glass', own ? x.p.cost : S.glass, x.p.cost, 0);
      });
    };
  }

  /* Omens, grouped by what they count */
  function buildOmens(page) {
    var head = el('p', 'lede');
    page.appendChild(head);
    var bySet = {}, order = [];
    OMENS.forEach(function (o) {
      if (!bySet[o.set]) { bySet[o.set] = { name: o.set, items: [] }; order.push(bySet[o.set]); }
      bySet[o.set].items.push(o);
    });
    var groups = order.map(function (g) {
      var title = el('h3', 'sub-head');
      var bar = el('div', 'bar thin omen-bar'), fill = el('div', 'bar-fill omen');
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100');
      bar.appendChild(fill);
      var grid = el('div', 'grid omens');
      var tiles = g.items.map(function (o) {
        var t = el('div', 'omen');
        var nm = el('span', 'card-name'), mark = el('span', 'omen-mark', '○ ');
        mark.setAttribute('aria-hidden', 'true');
        nm.appendChild(mark); nm.appendChild(document.createTextNode(o.name));
        t.appendChild(nm);
        t.appendChild(el('span', 'card-desc', o.desc));
        grid.appendChild(t);
        return { o: o, t: t, mark: mark };
      });
      page.appendChild(title); page.appendChild(bar); page.appendChild(grid);
      return { g: g, title: title, bar: bar, fill: fill, tiles: tiles };
    });
    return function () {
      head.textContent = 'Signs that the dark is going well. ' + C.omens + ' of ' + OMENS.length + ' seen. Each adds 1% to all Gloom (+' + C.omens + '%).';
      groups.forEach(function (gr) {
        var got = 0, next = null;
        gr.g.items.forEach(function (o) { if (S.omens[o.id]) got++; else if (!next) next = o; });
        var label = gr.g.name + ' · ' + got + ' of ' + gr.g.items.length;
        if (gr.title.textContent !== label) gr.title.textContent = label;
        gr.bar.hidden = !next;
        if (next) {
          var pct = Math.floor(next.prog() * 100);
          gr.fill.style.width = pct + '%';
          gr.bar.setAttribute('aria-valuenow', String(pct));
          gr.bar.setAttribute('aria-label', 'Progress toward ' + next.name);
        }
      });
      if (!engine.dirty.omens) return;
      engine.dirty.omens = false;
      groups.forEach(function (gr) {
        gr.tiles.forEach(function (x) { var got = !!S.omens[x.o.id]; x.t.classList.toggle('got', got); x.mark.textContent = got ? '\u2713 ' : '\u25cb '; });
      });
    };
  }

  /* Codex */
  function buildCodex(page) {
    page.appendChild(el('p', 'lede', 'What you have pieced together about Vesperdeep.'));
    var bar = el('div', 'page-head codex-bar');
    var modes = el('div', 'seg');
    modes.setAttribute('role', 'radiogroup');
    modes.setAttribute('aria-label', 'Order of pages');
    var view = 'subject', views = [];
    [['subject', 'By subject'], ['learned', 'As learned']].forEach(function (v) {
      var b = el('button', 'seg-btn', v[1]);
      b.type = 'button'; b.setAttribute('role', 'radio');
      b.onclick = function () { view = v[0]; engine.dirty.codex = true; };
      modes.appendChild(b);
      views.push({ id: v[0], b: b });
    });
    rovingKeys(modes, '.seg-btn', function (n) { n.click(); });
    var readAll = el('button', 'btn', 'Mark all read');
    readAll.type = 'button';
    readAll.onclick = function () { engine.markAllCodexRead(); engine.dirty.codex = true; render(); };
    bar.appendChild(modes); bar.appendChild(readAll);
    page.appendChild(bar);
    var list = el('div', 'codex');
    page.appendChild(list);
    var left = el('p', 'dim small');
    page.appendChild(left);

    /* One page: a native details element. New pages start open, with a dot and a word for screen readers.
       Pressing the title (to open or close it) counts as reading it. */
    var openState = {};
    function entry(c) {
      var fresh = !!S.codexNew[c.id];
      var d = document.createElement('details');
      d.className = 'entry' + (fresh ? ' new' : '');
      d.open = openState[c.id] !== undefined ? openState[c.id] : fresh;
      var sum = el('summary', null, c.title);
      if (fresh) {
        sum.appendChild(el('span', 'new-dot'));
        sum.appendChild(el('span', 'sr-only', ' new'));
      }
      sum.onclick = function () {
        openState[c.id] = !d.open;
        if (S.codexNew[c.id]) { engine.markCodexRead(c.id); d.classList.remove('new'); var dot = sum.querySelector('.new-dot, .sr-only'); while (dot) { sum.removeChild(dot); dot = sum.querySelector('.new-dot, .sr-only'); } render(); }
      };
      d.appendChild(sum);
      d.appendChild(el('p', null, c.text));
      return d;
    }

    return function () {
      views.forEach(function (v) { v.b.classList.toggle('on', v.id === view); v.b.setAttribute('aria-checked', v.id === view ? 'true' : 'false'); v.b.tabIndex = v.id === view ? 0 : -1; });
      readAll.hidden = engine.codexUnread() === 0;
      if (!engine.dirty.codex) return;
      engine.dirty.codex = false;
      list.replaceChildren();
      var live = engine.codexLive(), got = 0;
      live.forEach(function (c) { if (S.codex[c.id]) got++; });
      if (view === 'learned') {
        D.CODEX.map(function (c, i) { return { c: c, i: i }; })
          .filter(function (x) { return S.codex[x.c.id]; })
          .sort(function (a, b) { return S.codex[b.c.id] - S.codex[a.c.id] || a.i - b.i; })
          .forEach(function (x) { list.appendChild(entry(x.c)); });
      } else {
        D.CODEX_CATS.forEach(function (cat) {
          var inCat = D.CODEX.filter(function (c) { return c.cat === cat.id; });
          var have = inCat.filter(function (c) { return S.codex[c.id]; });
          if (!have.length) return;
          var dark = inCat.filter(function (c) { return !S.codex[c.id] && D.LIVE_SYSTEMS.indexOf(c.sys || 'core') >= 0; }).length;
          var sec = document.createElement('details');
          sec.className = 'codex-cat';
          sec.open = true;
          sec.appendChild(el('summary', 'sub-head', cat.title + ' \u00b7 ' + have.length + ' of ' + (have.length + dark)));
          have.sort(function (a, b) { return D.CODEX.indexOf(a) - D.CODEX.indexOf(b); }).forEach(function (c) { sec.appendChild(entry(c)); });
          if (dark > 0) sec.appendChild(el('p', 'dim small', dark + (dark === 1 ? ' page is' : ' pages are') + ' still dark.'));
          list.appendChild(sec);
        });
      }
      left.textContent = got < live.length ? (live.length - got) + (live.length - got === 1 ? ' page is' : ' pages are') + ' still dark.' : 'The codex is complete.';
    };
  }

  /* The Almanac: today's sky, what is coming, what has been seen. The surface keeps a northern year. */
  function buildAlmanac(page) {
    page.appendChild(el('p', 'lede', 'The Scribes keep the sky for you. The surface above Vesperdeep keeps a northern year, and the hours are those of this device.'));
    var moonBox = el('div', 'moon-box');
    var disc = el('div', 'moon'), shade = el('div', 'moon-shade');
    disc.appendChild(shade);
    var moonText = el('div', 'moon-text');
    moonBox.appendChild(disc); moonBox.appendChild(moonText);
    page.appendChild(el('h3', 'sub-head', 'Today'));
    page.appendChild(moonBox);
    var eventsEl = el('ul', 'almanac-list');
    page.appendChild(eventsEl);
    page.appendChild(el('h3', 'sub-head', 'Coming'));
    var coming = el('ul', 'almanac-list');
    page.appendChild(coming);
    page.appendChild(el('h3', 'sub-head', 'Seen'));
    var seenEl = el('p', 'dim');
    page.appendChild(seenEl);
    var eclipses = el('ul', 'almanac-list');
    page.appendChild(eclipses);
    var sig = '';
    function dateText(ms) { return new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }); }
    return function () {
      var now = wallNow(), a = engine.almanac(now);
      var s2 = String(Math.floor(now / 60000)) + ':' + Object.keys(S.sky.eclipses).join() + JSON.stringify(S.sky.seen);
      if (s2 === sig) return;
      sig = s2;
      var x = a.moon < 0.5 ? -a.moon * 2 * 100 : (1 - (a.moon - 0.5) * 2) * 100;      // the shadow slides across the disc
      shade.style.transform = 'translateX(' + x.toFixed(1) + '%)';
      moonText.textContent = a.phase.name + '  \u00b7  ' + a.moonName;
      eventsEl.replaceChildren();
      if (!a.events.length) eventsEl.appendChild(el('li', 'dim', 'Nothing special in the sky today.'));
      a.events.forEach(function (ev) { eventsEl.appendChild(el('li', null, ev.name + ' \u00b7 ' + ev.effectText)); });
      coming.replaceChildren();
      a.coming.forEach(function (c) { coming.appendChild(el('li', null, c.name + ' \u00b7 ' + dateText(c.at) + ' \u00b7 in ' + c.days + (c.days === 1 ? ' day' : ' days'))); });
      var n = a.seen, kinds = [['moonless', 'Moonless Nights'], ['lidless', 'Lidless Moons'], ['longestnight', 'Longest Nights'], ['longestday', 'Longest Days'], ['balance', 'Balances']];
      seenEl.textContent = kinds.map(function (k) { return k[1] + ': ' + (n[k[0]] ? 'seen' : 'not yet'); }).join('  \u00b7  ') + '  \u00b7  Eclipses witnessed: ' + engine.eclipseCount() + ' of ' + a.eclipses.length;
      eclipses.replaceChildren();
      a.eclipses.forEach(function (x2) {
        var d = new Date(x2.date.slice(0, 4), Number(x2.date.slice(5, 7)) - 1, Number(x2.date.slice(8, 10))).getTime();
        eclipses.appendChild(el('li', x2.seen ? '' : 'dim', (x2.seen ? '\u2713 ' : '\u25cb ') + dateText(d) + ' \u00b7 ' + x2.type));
      });
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
      ['Vigils kept', function () { return String(S.pet.count); }],
      ['The surface', function () { var si = engine.skyInfo(wallNow()); return si.active ? si.name.replace(' above', '') + ', ' + si.effectText : 'Out of sight'; }],
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
    mk('Realm card', showRealmCard);
    mk('Save now', function () { say(engine.save() ? 'The Scribes have written it down.' : 'This browser refused to store the save.'); });
    mk('Export save', function () {
      var ta = h('textarea', { id: 'io', readOnly: true, rows: 6 });
      ta.setAttribute('aria-label', 'Save text');
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
      ta.setAttribute('aria-label', 'Save text to import');
      file.setAttribute('aria-label', 'Or choose a save file');
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
            t.setAttribute('aria-label', 'Set-aside save text');
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
    var o4 = el('label', 'check'); var c4 = document.createElement('input'); c4.type = 'checkbox';
    o4.appendChild(c4); o4.appendChild(document.createTextNode(' Court chatter in the Whispers'));
    c4.onchange = function () { S.opts.chatter = c4.checked; };
    var o3 = el('label', 'check'); var c3 = document.createElement('input'); c3.type = 'checkbox';
    o3.appendChild(c3); o3.appendChild(document.createTextNode(' Keyboard shortcuts'));
    c3.onchange = function () { S.opts.keys = c3.checked; };
    page.appendChild(o1); page.appendChild(o2); page.appendChild(o4); page.appendChild(o3);
    page.appendChild(el('p', 'dim small', 'Keys: G Seat, R Realm, H Host, D Deep, L Ledger, 1 2 3 the Litanies. Escape closes a dialog. On the Stillwell, Enter or Space gathers once per press.'));

    page.appendChild(el('h3', 'sub-head', 'Version'));
    var upRow = el('div', 'btn-row');
    var upBtn = el('button', 'btn primary', 'Apply update'); upBtn.type = 'button'; upBtn.hidden = true;
    upBtn.onclick = applyUpdate;
    upRow.appendChild(upBtn);
    page.appendChild(upRow);
    page.appendChild(el('p', 'dim small', 'Version ' + VERSION));

    return function () {
      defs.forEach(function (d) { d.dd.textContent = d.fn(); });
      c1.checked = S.opts.sci; c2.checked = S.opts.motion; c3.checked = S.opts.keys; c4.checked = S.opts.chatter;
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
    toast({ kind: 'update', title: 'A newer realm is ready', text: 'Apply it from Ledger, Keeping.', go: { dest: 'ledger', page: 'set' }, whisper: true });
  }
  function applyUpdate() {
    if (!waitingWorker) return;
    applying = true;
    engine.save();
    waitingWorker.postMessage({ type: 'apply' });
  }

  /* ---------- render ---------- */

  function render() {
    var rt = monoNow();
    affordNow = forceAfford || rt - affordAt >= 500;
    if (affordNow) affordAt = rt;
    forceAfford = false;
    $('r-gloom').textContent = fmt(S.gloom);
    $('r-gps').textContent = fmt(C.gps) + ' /s';
    $('res-echo').hidden = !S.unlocked.shafts;
    $('r-echo').textContent = fmt(S.echoes);
    $('r-might').textContent = 'Might ' + fmt(C.might);
    $('res-glass').hidden = S.glassTotal < 1;
    $('r-glass').textContent = fmt(S.glass);
    $('r-glassb').textContent = '+' + fmt(S.glassTotal * 5) + '%';
    var cdef = engine.currentDef(S.current);
    $('fathom').textContent = 'Vesperdeep  ·  Fathom ' + (S.unlightings + 1) + (S.current !== 'still' ? '  ·  ' + cdef.short : '');
    paintCurrentChip(cdef);

    applyNav();
    var canWork = !viewing('work') && UPGS.some(function (u) { return !S.upg[u.id] && S.gloom >= u.cost && u.show(); });
    var unlReady = !viewing('unl') && ((S.unlightings === 0 && glassGain() >= 1) || engine.advisor().state === 'suggest');
    badge('realm', canWork);
    badge('ledger', engine.codexUnread() > 0 || (!viewing('set') && !!waitingWorker));
    badge('deep', unlReady);
    badge('host', engine.slackLines() > 0 && !viewing('soundings'));
    paintLineStatus();
    // The one gold badge: a lantern is passing while the player is somewhere that cannot show it.

    setBuff('hush', 'Deep Hush', S.buffs.hush);
    setBuff('teeth', 'Bared Teeth', S.buffs.teeth);
    $('well-hint').hidden = S.clicks >= 15;
    paintObjective();
    paintSky();
    paintVow();
    paintPetition();
    updateLitanies(); litanyChips();
    var rh = $('return-hint');
    if (rh && affordNow) {
      var rt2 = new Date(engine.returnAt(wallNow())).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var txt = 'If you leave now, the realm works until ' + rt2 + '.';
      if (rh.textContent !== txt) rh.textContent = txt;
    }
    syncLantern();
    var title = fmt(S.gloom) + ' Gloom · The Dark Realm', tnow = wallNow();
    if (document.title !== title && tnow - titleAt > 10000) { document.title = title; titleAt = tnow; }

    if (cur && updaters[cur.page.id]) updaters[cur.page.id]();
  }

  function badge(destId, on) {
    if (destBtns[destId]) destBtns[destId].classList.toggle('has-dot', on);
    barBtns[destId].classList.toggle('has-dot', on);
  }
  var titleAt = 0;     // the title changes at most every 10 seconds: some screen readers announce it
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

  /* ---------- Litanies ----------
     Three round buttons, shown on the Seat and under the bars on the Sunshafts page. Each shows its
     cooldown as a fill, and its name carries its state for screen readers. */
  var litanySets = [];
  function words(sec) {
    var s = Math.ceil(sec), m = Math.floor(s / 60), r = s % 60, out = [];
    if (m) out.push(m + (m === 1 ? ' minute' : ' minutes'));
    if (r || !m) out.push(r + (r === 1 ? ' second' : ' seconds'));
    return out.join(' ');
  }
  function buildLitanies(host) {
    var items = D.LITANIES.map(function (l) {
      var b = el('button', 'litany'); b.type = 'button';
      var g = el('span', 'litany-glyph', l.glyph); g.setAttribute('aria-hidden', 'true');
      var cool = el('i', 'litany-cool');
      b.appendChild(cool); b.appendChild(g);
      b.title = l.desc;
      guardRepeat(b);
      b.addEventListener('click', function (ev) { if (engine.speakLitany(l.id, !!ev && ev.isTrusted === true)) render(); });
      host.appendChild(b);
      return { l: l, b: b, cool: cool };
    });
    litanySets.push(items);
  }
  function updateLitanies() {
    var on = S.unlocked.rites;
    $('litanies').hidden = !on;
    litanySets.forEach(function (items) {
      items.forEach(function (x) {
        var t = S.lit[x.l.id], cd = engine.litanyCooldown(x.l);
        x.b.disabled = t.cd > 0;
        x.cool.style.height = (t.cd > 0 ? Math.min(100, t.cd / cd * 100) : 0).toFixed(0) + '%';
        var label = x.l.name + ', ' + (t.cd > 0 ? words(t.cd) : 'ready');
        if (x.b.getAttribute('aria-label') !== label) x.b.setAttribute('aria-label', label);
        x.b.classList.toggle('lit-on', t.on > 0);
      });
    });
  }
  var litChips = {};
  function litanyChips() {
    D.LITANIES.forEach(function (l) {
      var t = S.lit[l.id], box = $('buffs');
      if (!litChips[l.id]) litChips[l.id] = el('span', 'buff litany-chip');
      var n = litChips[l.id];
      if (t.on > 0) {
        var tx = l.name + ' · ' + Math.ceil(t.on) + 's';
        if (n.textContent !== tx) n.textContent = tx;
        if (n.parentNode !== box) box.appendChild(n);
      } else if (n.parentNode) n.parentNode.removeChild(n);
    });
  }

  /* ---------- Petitions and the Vigil ----------
     A card on the Seat while an offer is waiting (it can be left for later), then a chip for the one in effect. */
  var petSig = '', petChip = el('span', 'buff');
  function paintPetition() {
    var offer = engine.petitionOffer(), card = $('petition-card');
    var sig = offer ? offer.map(function (o) { return o.id; }).join() + ':' + S.pet.count : '';
    if (sig !== petSig) {
      petSig = sig;
      card.replaceChildren();
      card.hidden = !offer;
      if (offer) {
        card.appendChild(el('h3', null, 'The denizens have intentions'));
        card.appendChild(el('p', 'dim small', 'Vigils kept: ' + S.pet.count + '. Grant one today, or leave them for later. Nothing is lost by waiting.'));
        offer.forEach(function (p) {
          var b = el('button', 'btn petition'); b.type = 'button';
          b.appendChild(el('span', 'pet-text', p.text));
          b.appendChild(el('span', 'pet-effect', p.effectText));
          guardRepeat(b);
          b.addEventListener('click', function (ev) { if (engine.grantPetition(p.id, !!ev && ev.isTrusted === true)) render(); });
          card.appendChild(b);
        });
      }
    }
    var act = S.pet.active ? D.PETITIONS.list.filter(function (p) { return p.id === S.pet.active; })[0] : null;
    var on = act && (act.rest || engine.petitionEffect() !== null || act.now) && (act.rest || engine.dayIndex(wallNow()) <= S.pet.day);
    var box = $('buffs');
    if (on) {
      var tx = act.short + ' \u00b7 ' + (act.rest ? 'until the next grant' : 'until midnight');
      if (petChip.textContent !== tx) petChip.textContent = tx;
      if (petChip.parentNode !== box) box.appendChild(petChip);
    } else if (petChip.parentNode) petChip.parentNode.removeChild(petChip);
    // The Seat badge: a gold dot means a lantern; an offer waiting is the ordinary gloom dot.
    var lan = !!engine.lantern && cur.dest.id !== 'seat';
    barBtns.seat.classList.toggle('has-dot', lan || (!!offer && cur.dest.id !== 'seat'));
    barBtns.seat.classList.toggle('dot-above', lan);
  }

  /* ---------- Currents ---------- */
  var curChip = el('span', 'buff');
  function paintCurrentChip(c) {
    var box = $('buffs');
    if (S.current !== 'still') {
      var tx = c.name + ' \u00b7 this fathom';
      if (curChip.textContent !== tx) curChip.textContent = tx;
      if (curChip.parentNode !== box) box.appendChild(curChip);
    } else if (curChip.parentNode) curChip.parentNode.removeChild(curChip);
  }
  /* The choice at an Unlighting from the second on: three currents, a required choice. Still is always there. */
  function chooseCurrent(g) {
    var opts = engine.currentOffer().map(function (c) {
      var b = el('button', 'btn current'); b.type = 'button';
      b.appendChild(el('span', 'pet-text', c.name + '. ' + c.line));
      b.appendChild(el('span', 'pet-effect', 'Boon: ' + c.boon));
      b.appendChild(el('span', 'pet-effect', 'Bane: ' + c.bane));
      b.onclick = function () { nextModal(); if (S.unlightings >= 3) chooseVow(c.id, g); else { engine.unlight(c.id); render(); } };
      return b;
    });
    modal('Three currents', [h('p', null, ['Vesperdeep will sink a fathom. You will carry ', h('b', null, fmt(g)), ' new Nightglass. Choose the grain of the next fathom.']),
      h('div', { className: 'waiting' }, opts)], [{ label: 'Not yet' }], { required: true });
  }

  /* The second step, from the fourth Unlighting: a vow for the next fathom, or none. */
  function chooseVow(currentId, g) {
    var opts = D.VOWS.map(function (v) {
      var b = el('button', 'btn current'); b.type = 'button';
      b.appendChild(el('span', 'pet-text', v.name + '. ' + v.line));
      b.appendChild(el('span', 'pet-effect', 'Rule: ' + v.rule));
      b.appendChild(el('span', 'pet-effect', 'Kept by sealing Sunshaft ' + v.goal + '. ' + (S.keepings[v.id] ? 'Kept already: it pays nothing further.' : v.keeping + ': ' + v.keepText)));
      b.onclick = function () { nextModal(); engine.unlight(currentId, v.id); render(); };
      return b;
    });
    var none = el('button', 'btn current', 'No vow'); none.type = 'button';
    none.onclick = function () { nextModal(); engine.unlight(currentId); render(); };
    modal('Take a vow for this fathom?', [h('p', null, 'A thing given up on the way down is waiting, heavier, at the bottom. You may set it down at any time and owe nothing.'),
      h('div', { className: 'waiting' }, opts.concat([none]))], [{ label: 'Not yet' }], { required: true });
  }

  var vowChip = el('span', 'buff'), VOW_PAGE = { hands: 'den', silence: 'rite', few: 'den', chain: 'shaft', door: 'seat' };
  function paintVow() {
    var box = $('buffs'), v = S.vow ? engine.vowDef(S.vow) : null, note = $('vow-note');
    if (v) {
      var tx = v.name + ' \u00b7 Sunshaft ' + S.vowGoal;
      if (vowChip.textContent !== tx) vowChip.textContent = tx;
      if (vowChip.parentNode !== box) box.appendChild(vowChip);
    } else if (vowChip.parentNode) vowChip.parentNode.removeChild(vowChip);
    var show = v && cur && VOW_PAGE[v.id] === cur.page.id;
    note.hidden = !show;
    if (show && note.textContent !== v.name + ': ' + v.rule) note.textContent = v.name + ': ' + v.rule;
  }

  function buildVows(page) {
    page.appendChild(el('p', 'lede', 'A thing given up for one fathom. Keep the vow by sealing its Sunshaft and it is yours for good. Set it down at any time and nothing is owed.'));
    var cards = D.VOWS.map(function (v) {
      var c = el('div', 'row vow-card'), mid = el('div', 'row-mid');
      var title = el('div', 'row-title'); title.appendChild(el('span', 'name', v.name));
      var state = el('span', 'count'); title.appendChild(state);
      mid.appendChild(title);
      mid.appendChild(el('div', 'row-desc', v.line));
      mid.appendChild(el('div', 'row-info', 'Rule: ' + v.rule + '  \u00b7  Kept by sealing Sunshaft ' + v.goal));
      mid.appendChild(el('div', 'row-info', v.keeping + ': ' + v.keepText));
      c.appendChild(mid); page.appendChild(c);
      return { v: v, c: c, state: state };
    });
    var down = el('button', 'btn danger', 'Set down the vow'); down.type = 'button';
    down.onclick = function () {
      modal('Set down the vow?', h('p', null, 'It ends at once. Nothing is owed and nothing is kept.'),
        [{ label: 'Keep it', primary: true }, { label: 'Set it down', danger: true, cb: function () { engine.setDownVow(); render(); } }]);
    };
    page.appendChild(down);
    return function () {
      cards.forEach(function (x) {
        var kept = !!S.keepings[x.v.id], active = S.vow === x.v.id;
        x.c.classList.toggle('kept', kept); x.c.classList.toggle('active-vow', active);
        var tx = kept ? '\u2713 Kept' : active ? 'Sunshaft ' + Math.max(1, S.shaftTop - 1) + ' of ' + S.vowGoal : '';
        if (x.state.textContent !== tx) x.state.textContent = tx;
      });
      down.hidden = !S.vow;
    };
  }

  /* ---------- Fathoms: the Ledger of past fathoms ---------- */
  function buildFathoms(page) {
    page.appendChild(el('p', 'lede', 'The last twenty fathoms, newest first, with how much glass each pressed per hour.'));
    var totals = el('p', 'dim small');
    page.appendChild(totals);
    var chart = el('div', 'fchart');
    chart.setAttribute('aria-hidden', 'true');
    page.appendChild(chart);
    var table = document.createElement('table');
    table.className = 'ftable';
    var head = document.createElement('tr');
    ['Fathom', 'Time', 'Nightglass', 'Per hour', 'Deepest', 'Current', 'Vow'].forEach(function (t) { var th = document.createElement('th'); th.scope = 'col'; th.textContent = t; head.appendChild(th); });
    var thead = document.createElement('thead'); thead.appendChild(head);
    var body = document.createElement('tbody');
    table.appendChild(thead); table.appendChild(body);
    var scroll = el('div', 'fscroll'); scroll.tabIndex = 0; scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', 'Past fathoms');
    scroll.appendChild(table);
    page.appendChild(scroll);
    var sig = '';
    return function () {
      var s2 = S.fathoms.length + ':' + (S.fathoms.length ? S.fathoms[S.fathoms.length - 1].n : 0);
      if (s2 === sig) return;
      sig = s2;
      body.replaceChildren(); chart.replaceChildren();
      var best = 0, time = 0, rates = S.fathoms.map(function (f) { var r = f.sec > 0 ? f.glass / (f.sec / 3600) : 0; if (r > best) best = r; time += f.sec; return r; });
      totals.textContent = 'Fathoms: ' + S.fathoms.length + '  \u00b7  time on those: ' + fmtTime(time) + '  \u00b7  best rate: ' + fmt(best) + ' per hour';
      S.fathoms.forEach(function (f, i) {
        var bar = el('div', 'fbar');
        bar.style.height = (best > 0 ? Math.max(2, rates[i] / best * 100) : 2).toFixed(0) + '%';
        if (rates[i] === best && best > 0) bar.appendChild(el('span', 'fbar-label', fmt(best)));
        chart.appendChild(bar);
      });
      S.fathoms.slice().reverse().forEach(function (f, j) {
        var i = S.fathoms.length - 1 - j, tr = document.createElement('tr');
        [f.n, fmtTime(f.sec), fmt(f.glass), fmt(rates[i]), f.best, engine.currentDef(f.current).short, f.vow ? engine.vowDef(f.vow).name + (f.kept ? ' \u2713' : '') : '\u2014'].forEach(function (v) {
          var td = document.createElement('td'); td.textContent = String(v); tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    };
  }

  /* The realm card: a picture to show someone. Drawn with canvas text and shapes. Nothing is uploaded, and no
     save data, seed or checksum is on it. */
  function drawRealmCard(cv, withLogo) {
    var x = cv.getContext('2d'), lines = engine.realmSummary(), W = 1200, H = 630;
    var g = x.createRadialGradient(W * 0.3, 0, 40, W * 0.3, 0, 900);
    g.addColorStop(0, '#17122e'); g.addColorStop(0.6, '#07060d'); g.addColorStop(1, '#07060d');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#2a2447'; x.lineWidth = 2; x.strokeRect(24, 24, W - 48, H - 48);
    if (withLogo) x.drawImage(withLogo, 72, 72, 120, 120);
    x.fillStyle = '#efeaff'; x.font = '600 64px Georgia, serif'; x.fillText(lines[0], 224, 150);
    x.fillStyle = '#a896ff'; x.font = 'italic 32px Georgia, serif'; x.fillText(lines[1], 224, 196);
    x.fillStyle = '#dcd7ee'; x.font = '600 44px Georgia, serif';
    [2, 3, 4].forEach(function (i, n) { x.fillText(lines[i], 72, 330 + n * 90); });
    x.fillStyle = '#8e87ad'; x.font = '24px system-ui, sans-serif'; x.fillText('Keep the dark quiet.', 72, 580);
  }
  function showRealmCard() {
    var cv = document.createElement('canvas'); cv.width = 1200; cv.height = 630; cv.className = 'realm-card';
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', engine.realmSummary().join('. '));
    var img = new Image();
    img.onload = function () { drawRealmCard(cv, img); };
    img.onerror = function () { drawRealmCard(cv, null); };
    drawRealmCard(cv, null);
    img.src = 'icon.svg';
    modal('Realm card', [h('p', null, 'A picture of your realm, made here. Nothing is sent anywhere; send the file yourself.'), cv],
      [{ label: 'Save image', cb: function () {
        try { cv.toBlob(function (b) { if (!b) return; var url = URL.createObjectURL(b), a = h('a', { href: url, download: 'dark-realm-card.png', hidden: true }); document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); }); } catch (e) {}
        return false;
      } }, { label: 'Copy as text', cb: function () {
        try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(engine.realmSummary().join('\n')).catch(function () {}); } catch (e) {}
        return false;
      } }, { label: 'Done', primary: true }]);
  }

  /* ---------- Soundings ---------- */
  function clockTime(ms) { return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function paintLineStatus() {
    var p = $('line-status'), n = S.snd.lines.length;
    p.hidden = !S.unlocked.soundings || n === 0;
    if (p.hidden) return;
    var slack = engine.slackLines() > 0, soon = Infinity;
    S.snd.lines.forEach(function (l) { if (l.left > 0 && l.left < soon) soon = l.left; });
    var tx = slack ? 'The line is slack.' : 'The line is down, ' + fmtTime(soon) + '.';
    if (p.textContent !== tx) p.textContent = tx;
  }

  function buildSoundings(page) {
    page.appendChild(el('p', 'lede', 'The Tidewells go down further than their ropes. Lower a line and come back when it has gone slack. It waits as long as you like.'));
    page.appendChild(el('h3', 'sub-head', 'Lines'));
    var linesBox = el('div', 'lines');
    page.appendChild(linesBox);
    page.appendChild(el('h3', 'sub-head', 'The Shelves'));
    var shelves = el('div', 'shelves');
    page.appendChild(shelves);
    var shelfParts = D.RELIC_SETS.map(function (rs) {
      var panel = el('section', 'shelf'), head = el('h4', null, rs.name), bonus = el('p', 'dim small');
      panel.appendChild(head);
      var slots = engine.setRelics(rs.id).map(function (r) {
        var d = el('div', 'relic');
        panel.appendChild(d);
        return { r: r, d: d };
      });
      panel.appendChild(bonus);
      shelves.appendChild(panel);
      return { rs: rs, head: head, slots: slots, bonus: bonus };
    });
    var STAT = { echo: 'Echoes', might: 'Might', gloom: 'Gloom', lanternYield: 'Lantern yields', glass: 'Nightglass gained', awayPace: 'Away pace' };
    function bonusText(rs) {
      var unit = rs.stat === 'awayPace' ? '+1 point each, +6 points when complete' : '+2% each, \u00d7' + rs.bonus + ' when complete';
      return STAT[rs.stat] + ': ' + unit;
    }
    var sig = '', timeEls = [];
    return function () {
      shelfParts.forEach(function (sp) {
        var n = 0;
        sp.slots.forEach(function (x) {
          var got = !!S.relics[x.r.id];
          if (got) n++;
          var tx = got ? x.r.name + '. ' + x.r.line : 'Not yet found';
          if (x.d.textContent !== tx) { x.d.textContent = tx; x.d.classList.toggle('found', got); }
        });
        var h = sp.rs.name + ' \u00b7 ' + n + ' of 4';
        if (sp.head.textContent !== h) sp.head.textContent = h;
        var b = bonusText(sp.rs);
        if (sp.bonus.textContent !== b) { sp.bonus.textContent = b; }
        sp.bonus.classList.toggle('dim', n < 4);
      });
      var gps = C.gps;
      var s2 = S.snd.lines.map(function (l) { return l.id + (l.left <= 0 ? 's' : 'o'); }).join() + ':' + engine.maxLines() + ':' + D.SOUNDINGS.depths.map(function (d) { return (engine.depthOpen(d) ? 1 : 0) + (S.gloom >= engine.lowerCost(d) ? 1 : 0); }).join('');
      if (s2 !== sig) {
        sig = s2; timeEls = [];
        linesBox.replaceChildren();
        for (var i = 0; i < engine.maxLines(); i++) {
          var slot = el('div', 'line-slot'), line = S.snd.lines[i];
          if (line) {
            var d = D.SOUNDINGS.depths.filter(function (x) { return x.id === line.id; })[0];
            slot.appendChild(el('h4', null, d.name));
            if (line.left > 0) {
              var bar = el('div', 'bar thin'), fill = el('div', 'bar-fill time'), tt = el('span', 'bar-txt');
              bar.appendChild(fill); bar.appendChild(tt); slot.appendChild(bar);
              timeEls.push({ line: line, d: d, fill: fill, tt: tt });
            } else {
              var up = el('button', 'btn primary', 'Draw up'); up.type = 'button';
              (function (idx) { up.onclick = function () { engine.drawUp(idx, true); render(); }; })(i);
              slot.appendChild(up);
            }
          } else {
            slot.appendChild(el('h4', null, 'The line is out of the water'));
            D.SOUNDINGS.depths.forEach(function (d) {
              var b = el('button', 'btn sounding'); b.type = 'button';
              b.appendChild(el('span', 'pet-text', d.name + ' \u00b7 ' + d.hours + ' h \u00b7 ' + fmt(engine.lowerCost(d)) + ' Gloom'));
              b.appendChild(el('span', 'pet-effect', engine.depthOpen(d) ? 'May bring up ' + d.brings + '.' : (d.unlock === 'tide25' ? 'Needs 25 Tidewells.' : 'Needs a fathom let go.')));
              b.disabled = !engine.depthOpen(d) || S.gloom < engine.lowerCost(d);
              b.onclick = function () { engine.lowerLine(d.id, true); render(); };
              slot.appendChild(b);
            });
          }
          linesBox.appendChild(slot);
        }
      }
      timeEls.forEach(function (x) {
        var total = x.d.hours * 3600;
        x.fill.style.width = ((1 - x.line.left / total) * 100).toFixed(1) + '%';
        var tx = fmtTime(x.line.left) + ' left \u00b7 slack at ' + clockTime(wallNow() + x.line.left * 1000);
        if (x.tt.textContent !== tx) x.tt.textContent = tx;
      });
      if (gps < 0) return;
    };
  }

  /* ---------- the Surface Clock ---------- */
  var skyClass = '';
  function paintSky() {
    var si = engine.skyInfo(wallNow()), strip = $('sky-strip'), box = $('scene-box');
    strip.hidden = !si.active;
    var cls = si.active ? 'sky-' + si.id : '';
    if (cls !== skyClass) { if (skyClass) box.classList.remove(skyClass); if (cls) box.classList.add(cls); skyClass = cls; }
    if (!si.active) return;
    var tx = si.glyph + ' ' + si.name + ' \u00b7 ' + si.effectText + ' \u00b7 ' + si.nextName + ' in ' + fmtTime(si.inSec);
    if (strip.textContent !== tx) strip.textContent = tx;
  }

  /* ---------- the next objective ---------- */
  var objectiveId = '';
  function paintObjective() {
    var b = $('objective');
    b.hidden = S.clicks < 15;
    if (b.hidden || !affordNow) return;
    var o = engine.objective();
    if (b.textContent !== o.text) b.textContent = o.text;
    b.disabled = !o.go;
    objectiveId = o.id;
    b.onclick = o.go ? function () { goDest(o.go.dest, o.go.page); } : null;
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

  /* Keyboard shortcuts. G R H D L go to Seat, Realm, Host, Deep, Ledger. Escape closes a dialog.
     Ignored while typing, with Ctrl, Alt or Meta held, while a dialog is open, or when switched off in Keeping. */
  var KEY_DEST = { g: 'seat', r: 'realm', h: 'host', d: 'deep', l: 'ledger' };
  function onKey(ev) {
    if (ev.key === 'Escape') { if (hideWhy() || closeTopModal()) ev.preventDefault(); return; }
    if (!S.opts.keys || ev.ctrlKey || ev.altKey || ev.metaKey || modalOpen) return;
    var t = ev.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    var lit = { '1': 'teeth', '2': 'breath', '3': 'undertow' }[ev.key];
    if (lit) { if (!ev.repeat && engine.speakLitany(lit, ev.isTrusted === true)) { ev.preventDefault(); render(); } return; }
    var id = KEY_DEST[(ev.key || '').toLowerCase()];
    if (!id) return;
    var d = NAVM.dest(id);
    if (!d || !NAVM.destVisible(d, S.unlocked)) return;
    ev.preventDefault();
    if (id === 'seat' && wideQuery.matches) { $('well').focus(); return; }   // on a wide screen the Seat is always there
    goDest(id);
    var tab = wideQuery.matches ? destBtns[id] : barBtns[id];
    if (tab) tab.focus();
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

  /* Lanterns: the rules decide what spawns and what each one does. This only draws them, from a pool of five
     elements (a Procession shows up to five at once). Each lamp is fitted when the scene is on screen,
     starting part way through its life if it has already been drifting. */
  var lanternSlots = [];
  function buildLanterns() {
    var box = $('scene-box'), first = $('lantern');
    for (var i = 0; i < 5; i++) {
      var node = i === 0 ? first : first.cloneNode(true);
      if (i > 0) { node.removeAttribute('id'); node.hidden = true; box.insertBefore(node, first.nextSibling); }
      node.addEventListener('click', (function (slot) { return function (ev) {
        if (slot.id && engine.snuffLantern(!!ev && ev.isTrusted === true, slot.id)) render();
      }; })(lanternSlots[i] = { node: node, id: 0, w: -1, path: 'ltr', hang: 0.4 }));
      guardRepeat(node);
    }
  }
  var KIND_LABEL = { stray: 'Snuff the Stray Lantern', votive: 'Snuff the Votive Lantern', warden: 'Snuff the Warden\'s Lamp' };

  function syncLantern() {
    var vis = engine.lanterns.filter(function (l) { return l.wait <= 0; }), box = $('scene-box');
    var fresh = false, i;
    lanternSlots.forEach(function (sl) {                                  // free the slots whose lamp is gone
      if (sl.id && !vis.some(function (l) { return l.id === sl.id; })) { sl.id = 0; sl.node.hidden = true; }
    });
    vis.forEach(function (l, n) {
      var sl = null;
      for (i = 0; i < lanternSlots.length; i++) if (lanternSlots[i].id === l.id) sl = lanternSlots[i];
      if (!sl) {
        for (i = 0; i < lanternSlots.length; i++) if (!lanternSlots[i].id) { sl = lanternSlots[i]; break; }
        if (!sl) return;
        sl.id = l.id; sl.w = -1; fresh = true;
        var idx = engine.lanterns.indexOf(l);
        sl.path = !S.opts.motion ? 'still' : l.path === 'drop' ? 'drop' : (l.path === 'ltr' || l.path === 'rtl') ? l.path
          : l.path === 'cross' ? (Math.random() < 0.5 ? 'ltr' : 'rtl') : engine.lanternPath(Math.random());
        sl.hang = 0.30 + Math.random() * 0.32;
        sl.node.className = 'lantern kind-' + l.kind;
        sl.node.setAttribute('aria-label', KIND_LABEL[l.kind] || KIND_LABEL.stray);
        sl.node.style.setProperty('--dur', l.total + 's');
        // A Procession alternates heights; with motion off its lamps stand in a row.
        var y = l.proc ? 14 + (idx * 13) % 52 : 12 + Math.random() * 55;
        sl.node.style.setProperty('--y', (!S.opts.motion && l.proc ? 40 : y) + '%');
        sl.node.style.setProperty('--x', (!S.opts.motion && l.proc ? 10 + idx * 17 : (sl.path === 'drop' ? 12 + Math.random() * 68 : 15 + Math.random() * 65)) + '%');
        sl.node.hidden = false;
      }
      var w = box.clientWidth;
      if (w === 0) sl.w = -1;
      else if (w !== sl.w) {
        sl.w = w;
        ['path-ltr', 'path-rtl', 'path-drop', 'path-still'].forEach(function (c) { sl.node.classList.remove(c); });
        void sl.node.offsetWidth;
        sl.node.style.setProperty('--w', w + 'px');
        sl.node.style.setProperty('--hang', Math.round(box.clientHeight * sl.hang) + 'px');
        sl.node.style.setProperty('--late', Math.max(0, l.total - l.life).toFixed(2));
        sl.node.classList.add('path-' + sl.path);
      }
    });
    if (fresh) live(vis.length > 1 ? 'A procession of lanterns is passing.' : 'A lantern is passing.');
    $('snuff').hidden = !vis.length || box.clientWidth === 0;
    var sc = $('streak-chip');
    sc.hidden = S.streak < 2;
    if (!sc.hidden) { var tx = 'Unbroken ×' + S.streak; if (sc.textContent !== tx) sc.textContent = tx; }
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

  /* The last Whispers survive a reload, under their own key (not in the sealed save). What comes back from
     storage is untrusted text: parseLog accepts only short strings, and they are shown as text. */
  function saveLog() {
    try { localStorage.setItem(engine.LOG_KEY, JSON.stringify(logLines.slice(0, 30).map(function (l) { return l.slice(0, 300); }))); } catch (e) {}
  }
  function restoreLog() {
    var raw = null;
    try { raw = localStorage.getItem(engine.LOG_KEY); } catch (e) {}
    var lines = raw ? engine.parseLog(raw) : [];
    if (!lines.length) return;
    var ul = $('log');
    ul.appendChild(el('li', 'divider', 'earlier'));
    lines.forEach(function (l) { ul.appendChild(el('li', 'earlier-line', l)); });
    logLines = lines.slice();
  }

  var echoMeter = engine.rateMeter(60), meterAt = 0;

  /* The Night Report. Built from plain data with nodes only. Reports that arrive before it is dismissed are
     merged into it in place, so there is never a queue of them. */
  var reportEntry = null, reportData = null, reportLine = null;
  function reportBody(r) {
    var out = [];
    out.push(h('p', null, ['Away ', h('b', null, fmtTime(r.sec)), '. The realm worked ' +
      (r.capped ? 'for the first ' + r.capHours + 'h, ' : '') + 'at ' + Math.round(r.pace * 100) + '% of its pace.']));
    if (r.pace < 1 && rl('sleep') < 5) out.push(h('p', { className: 'dim small' }, 'Rite of the Long Sleep raises the pace.'));
    var items = [h('li', null, [h('b', null, fmt(r.gloom)), ' Gloom gathered'])];
    if (r.echoes > 0) items.push(h('li', null, [h('b', null, fmt(r.echoes)), ' Echoes recovered']));
    if (r.bestShaft > 0) items.push(h('li', null, ['Sunshafts sealed down to ', h('b', null, String(r.bestShaft))]));
    if (r.held) items.push(h('li', null, [r.held.name + ' held Sunshaft ' + r.held.n + '. The Host is regrouping.']));
    out.push(h('ul', { className: 'away' }, items));
    var w = engine.waiting();
    if (w.length) {
      out.push(h('h3', { className: 'sub-head' }, 'Waiting'));
      var box = h('div', { className: 'waiting' });
      w.forEach(function (x) {
        var b = el('button', 'btn', x.text);
        b.type = 'button';
        b.onclick = function () { nextModal(); goDest(x.go.dest, x.go.page); };
        box.appendChild(b);
      });
      out.push(box);
    }
    if (reportLine) out.push(h('p', { className: 'dim chatter-line' }, reportLine));
    if (r.capped) out.push(h('p', { className: 'dim small' }, 'The realm stops working after ' + r.capHours + ' hours alone.' + (r.capHours < 24 ? ' The Unsleeping setting in Nightglass makes that 24.' : '')));
    return out;
  }
  function showAway(r) {
    var open = reportEntry && (modalCur === reportEntry || modalQueue.indexOf(reportEntry) >= 0);
    if (open) {
      reportData = engine.mergeAway(reportData, r);
      reportEntry.body = reportBody(reportData);
      if (modalCur === reportEntry) $('modal-body').replaceChildren.apply($('modal-body'), reportEntry.body);
      return;
    }
    reportData = r;
    var p = S.opts.chatter ? engine.pickChatter() : null;
    reportLine = p ? p.line : null;
    reportEntry = modal('While the realm slept', reportBody(r), [{ label: 'Take the seat', primary: true }]);
  }

  function frame() {
    if (engine.halted) return;
    var r = engine.tick();
    if (r.away) { showAway(r.away); echoMeter.reset(); }
    var pt = monoNow() / 1000;
    if (pt - meterAt >= 1) {            // present time only: a gap longer than 5 seconds means the page was not running
      if (pt - meterAt > 5) echoMeter.reset();
      echoMeter.sample(S.echoesTotal, pt); meterAt = pt;
    }
    engine.drainEvents().forEach(onEvent);
    if (r.ending) showEnding();
    render();
  }

  function boot() {
    var loaded = engine.load();
    S = engine.S;
    engine.recalc();
    buildNav();
    guardRepeat($('well'));
    $('well').addEventListener('click', wellClick);
    $('why-gloom').addEventListener('click', function (ev) { ev.stopPropagation(); showWhy($('why-gloom'), 'What makes up Gloom per second', 'gloom'); });
    document.addEventListener('click', function (ev) {
      var pop = $('popover');
      if (!pop.hidden && !pop.contains(ev.target) && ev.target !== whyAnchor) hideWhy();
    });
    guardRepeat($('snuff'));
    $('snuff').addEventListener('click', function (ev) {
      if (engine.snuffLantern(!!ev && ev.isTrusted === true)) render();
    });
    buildLanterns();
    buildLitanies($('litanies'));
    document.addEventListener('keydown', trapFocus);
    document.addEventListener('keydown', onKey);
    guardRepeat($('strip-well'));
    $('strip-well').addEventListener('click', wellClick);
    $('modal').addEventListener('click', function (e) {
      if (e.target === $('modal') && modalQueue.length === 0) closeTopModal();
    });
    restoreLog();
    var isNew = S.totalGloom === 0 && S.clicks === 0;
    engine.slowChecks();
    if (isNew) S.codexNew.waking = 1;
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
    function keep() { if (!wiping) { engine.save(); saveLog(); } }
    setInterval(function () { if (!wiping && !engine.halted) saveLog(); }, 15000);
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
          [{ label: 'Begin again', primary: true, cb: function () { wiping = true; location.reload(); return false; } }], { required: true });
      } else {
        modal('The realm is open elsewhere', h('p', null, 'Another window or tab has taken the seat and is saving this realm. This one has stopped so the two do not overwrite each other.'),
          [{ label: 'Reload here', primary: true, cb: function () { location.reload(); return false; } }], { required: true });
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
