/* The Dark Realm: the toast queue. No DOM, so its rules can be tested. Plain script.
   One toast shows at a time. Up to `cap` wait behind it, and when more arrive the oldest waiting ones are dropped.
   Nothing is handed out while the page is blocked (a dialog is open). */
window.TDR_TOAST = (function () {
  'use strict';

  function createQueue(cap) {
    var waiting = [];
    return {
      /* t: { kind, title, text, go }. Returns how many were dropped to make room. */
      push: function (t) {
        waiting.push(t);
        var dropped = 0;
        while (waiting.length > cap) { waiting.shift(); dropped++; }
        return dropped;
      },
      /* The next toast to show, or null when none is waiting or the page is blocked. */
      next: function (blocked) { return (blocked || !waiting.length) ? null : waiting.shift(); },
      size: function () { return waiting.length; }
    };
  }

  return { createQueue: createQueue };
})();
