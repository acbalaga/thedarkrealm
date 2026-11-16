/* The Dark Realm: the map of destinations and pages. No DOM, so it can be tested. Plain script.
   Five destinations, each with sub-pages. Later features add pages with addPage(). */
window.TDR_NAV = (function () {
  'use strict';

  function create() {
    var dests = [
      { id: 'seat', label: 'Seat', glyph: '◉', seatOnly: true, pages: [{ id: 'seat', label: 'Seat' }] },
      { id: 'realm', label: 'Realm', glyph: '✦', pages: [{ id: 'den', label: 'Denizens' }, { id: 'work', label: 'Workings' }] },
      { id: 'host', label: 'Host', glyph: '☗', lock: 'shafts', pages: [{ id: 'shaft', label: 'Sunshafts' }, { id: 'rite', label: 'Rites', lock: 'rites' }] },
      { id: 'deep', label: 'Deep', glyph: '◈', lock: 'unlight', pages: [{ id: 'unl', label: 'Unlighting' }] },
      { id: 'ledger', label: 'Ledger', glyph: '✎', pages: [{ id: 'omen', label: 'Omens' }, { id: 'codex', label: 'Codex' }, { id: 'set', label: 'Keeping' }] }
    ];

    function dest(id) { for (var i = 0; i < dests.length; i++) if (dests[i].id === id) return dests[i]; return null; }

    /* def: { id, label, lock? }. A page may be added once to one destination. */
    function addPage(destId, def) {
      var d = dest(destId);
      if (!d) throw new Error('No destination ' + destId);
      if (!def || !def.id || !def.label) throw new Error('A page needs an id and a label');
      dests.forEach(function (x) { x.pages.forEach(function (p) { if (p.id === def.id) throw new Error('Page ' + def.id + ' already exists'); }); });
      d.pages.push(def);
    }

    function pagesOf(d, unlocked) { return d.pages.filter(function (p) { return !p.lock || unlocked[p.lock]; }); }
    function destVisible(d, unlocked) { return (!d.lock || !!unlocked[d.lock]) && pagesOf(d, unlocked).length > 0; }

    /* Which destination and page to show for a saved nav. wide: the Seat is always on screen, so it is
       never the destination (the saved choice is kept, only the view changes). */
    function resolve(nav, unlocked, wide) {
      var d = dest(nav.dest);
      if (!d || !destVisible(d, unlocked) || (wide && d.seatOnly)) d = dest('realm');
      var vis = pagesOf(d, unlocked), want = nav.page[d.id], page = vis[0];
      for (var i = 0; i < vis.length; i++) if (vis[i].id === want) page = vis[i];
      return { dest: d, page: page };
    }

    return { dests: dests, dest: dest, addPage: addPage, pagesOf: pagesOf, destVisible: destVisible, resolve: resolve };
  }

  return { create: create };
})();
