# Save fixtures

Real saves, produced by the build **before** the rules moved into `core.js` (commit `a689051`, `public/js/game.js` still holding everything). They pin the save format: every later change has to keep loading them with no irregularity mark.

| File | State |
| --- | --- |
| `fresh.txt` | A new realm, nothing done |
| `mid-first-fathom.txt` | First fathom, Sunshaft 4 sealed, about 9 minutes played |
| `two-unlightings-perks.txt` | Just after the second Unlighting, Nightglass perks bought |
| `post-ending.txt` | Fourteen Unlightings in, Sunshaft 150 sealed, `ended` set |

Each is one line: `TDR2.<base64 body>.<seal>`. `S.seen` holds the wall-clock time at which it was made, so a page that loads one shows a "While the realm slept" report. That is expected.

## How they were made

The old build cannot be driven from outside the closure, so a throwaway edit exposed what a bot needs. That edit was never committed.

1. Copy `public/` to `site/`, in a scratch folder outside the repo, next to `gen.js`.
2. In `site/js/game.js`, add this just above the final `if (document.readyState === 'loading')` line:

```js
window.__t = {
  S: function () { return S; }, C: C, UPGS: UPGS, D: D,
  recalc: recalc, step: step, away: away, pack: pack, save: save, slowChecks: slowChecks,
  buyDenizen: function (d) { buyDenizen(d); }, buyUpg: buyUpg, buyRite: buyRite, buyPerk: buyPerk, unlight: unlight,
  denCost: denCost, maxBuy: maxBuy, riteCost: riteCost, glassGain: glassGain, shaftMaxHp: shaftMaxHp, cnt: cnt,
  click: function () { recalc(); gain(C.click); S.clicks++; },
  setBuy: function (k) { S.opts.buy = k; }
};
```

3. Open the copy from `file://` in headless Chromium (Playwright) and run the bot below with `node gen.js`. It plays honestly through the game's own functions (hand gathers, then the denizen with the best cost per rate, every affordable working, every affordable rite and perk), advancing time with `step`. It unlights as soon as it can the first time, at 3 Nightglass the second time, and then whenever the gain reaches the Nightglass already held, until the ending fires. The simulated run is about 103 hours of play.
4. Copy the four `pack()` strings out into this folder.

```js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  pg.on('pageerror', e => console.log('PAGEERR', e.message));
  await pg.goto('file://' + __dirname + '/site/index.html');
  await pg.waitForFunction(() => window.__t);
  const out = {};
  out.fresh = await pg.evaluate(() => { __t.recalc(); return __t.pack(); });
  const res = await pg.evaluate(() => {
    const t = window.__t, D = t.D, out = {}, log = [];
    t.setBuy(1);
    function buys() {
      let S = t.S(), any = true, guard = 0;
      while (any && guard++ < 400) {
        any = false;
        t.UPGS.forEach(u => { if (!S.upg[u.id] && u.show() && S.gloom >= u.cost && t.buyUpg(u, true)) any = true; });
        for (let i = D.RITES.length - 1; i >= 0; i--) {
          const r = D.RITES[i], l = S.rites[r.id] || 0;
          if (S.unlocked.rites && S.echoes >= t.riteCost(r) && !(r.max && l >= r.max)) { t.buyRite(r); any = true; }
        }
        let best = null, bv = Infinity;
        D.DENIZENS.forEach(d => { const n = S.den[d.id] || 0, c = t.denCost(d, n, 1); if (c <= S.gloom) { const v = c / d.rate; if (v < bv) { bv = v; best = d; } } });
        if (best) { t.buyDenizen(best); any = true; }
        D.PERKS.slice().sort((a, b) => a.cost - b.cost).forEach(p => { if (!S.perks[p.id] && S.glass >= p.cost) { t.buyPerk(p); any = true; } });
        t.recalc();
      }
    }
    let T = 0, unl = 0, midDone = false;
    while (T < 8e6) {
      const dt = T < 600 ? 1 : 5;
      if (t.C.gps < 1 || T < 400) { for (let c = 0; c < 8 && t.S().gloom < 40; c++) t.click(); }
      t.step(dt); T += dt;
      t.slowChecks();
      const S = t.S();
      buys();
      if (!midDone && S.bestShaft >= 4 && S.played > 300) { out.mid = t.pack(); midDone = true; log.push('mid at ' + T); }
      if (unl < 2 && t.glassGain() >= (unl === 0 ? 1 : 3)) { t.unlight(); unl++; log.push('unlight ' + unl + ' at ' + T); buys(); if (unl === 2) out.two = t.pack(); }
      if (unl >= 2 && !S.ended && t.glassGain() >= Math.max(4, S.glassTotal) && S.bestShaft < 150) { t.unlight(); buys(); log.push('unlight more at ' + T); }
      if (S.ended) { out.ended = t.pack(); log.push('ended at ' + T); break; }
    }
    const S = t.S();
    log.push(JSON.stringify({ best: S.bestShaft, glassTotal: S.glassTotal, unl: S.unlightings, played: S.played, marks: S.marks, ended: S.ended }));
    return { out, log };
  });
  Object.assign(out, res.out);
  console.log(res.log.join('\n'));
  require('fs').writeFileSync(__dirname + '/fixtures.json', JSON.stringify(out, null, 1));
  console.log(Object.keys(out));
  await b.close();
})();
```

The strings were checked three ways when `core.js` landed: each unpacks, seals and adopts with zero audit fixes (`tests/save.test.js`); each loads in the real page with the Ledger reading "In order"; and the same bot, replayed against `core.js`, reproduced the mid, two-Unlightings and post-ending states field for field.

## Derived values before TDR-004

`before-tdr004.json` holds `C.gps`, `C.click`, `C.might` and `C.echoMult` for each fixture, measured on `core.js` as it stood before the modifier registry replaced the inline bonuses (commit `a0a7149` plus the simulator). `tests/mods.test.js` requires the registry to reproduce them to 12 significant figures. Do not regenerate this file to make a test pass. A change that moves these numbers on purpose is a balance change and needs its own ticket.

| Fixture | gps | click | might | echoMult |
| --- | --- | --- | --- | --- |
| fresh | 0 | 1 | 1 | 1 |
| mid-first-fathom | 5.356 | 2.06 | 38.4 | 1 |
| two-unlightings-perks | 8.814 | 1.356 | 74.4 | 1 |
| post-ending | 1.9023886278108774e18 | 1.542754280710019e17 | 6.119634871946212e14 | 378.56795512758055 |
