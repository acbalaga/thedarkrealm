/* The Dark Realm: static game data and lore. No logic here. */
'use strict';
window.TDR_DATA = (function () {

  /* Frozen so the tables cannot be edited from the console. */
  function freeze(o) {
    Object.getOwnPropertyNames(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object') freeze(o[k]); });
    return Object.freeze(o);
  }

  var DENIZENS = [
    { id: 'gleaner', glyph: '✦', name: 'Wisp-Gleaner', plural: 'Wisp-Gleaners', tool: 'Hooks', cost: 10, rate: 0.1,
      desc: 'A loose shadow with a hook, raking Gloom out of the corners.' },
    { id: 'scribe', glyph: '✎', name: 'Moth-Scribe', plural: 'Moth-Scribes', tool: 'Ledgers', cost: 150, rate: 1,
      desc: 'Writes down where the dark is thickest. Eats the ink afterward.' },
    { id: 'weaver', glyph: '❖', name: 'Murk-Weaver', plural: 'Murk-Weavers', tool: 'Looms', cost: 2400, rate: 8,
      desc: 'Spins Gloom into cloth that nothing can be seen through.' },
    { id: 'warden', glyph: '☗', name: 'Hush-Warden', plural: 'Hush-Wardens', tool: 'Vigils', cost: 40000, rate: 55,
      desc: 'Stands very still. Sound gives up near it, and light follows.' },
    { id: 'cantor', glyph: '♪', name: 'Dusk-Cantor', plural: 'Dusk-Cantors', tool: 'Hymnals', cost: 7e5, rate: 380,
      desc: 'Sings the hour before night, over and over, until it holds.' },
    { id: 'forge', glyph: '⚒', name: 'Shade-Forge', plural: 'Shade-Forges', tool: 'Anvils', cost: 1.3e7, rate: 2600,
      desc: 'An anvil with no fire under it. It hammers shadow thicker.' },
    { id: 'tide', glyph: '≋', name: 'Tidewell', plural: 'Tidewells', tool: 'Sluices', cost: 2.6e8, rate: 18000,
      desc: 'A cistern left open to the sunless sea beneath the realm.' },
    { id: 'choir', glyph: '☾', name: 'Eclipse Choir', plural: 'Eclipse Choirs', tool: 'Chorales', cost: 5.5e9, rate: 1.3e5,
      desc: 'Forty voices rehearsing the moment the sun is covered.' },
    { id: 'orchard', glyph: '❀', name: 'Starless Orchard', plural: 'Starless Orchards', tool: 'Grafts', cost: 1.2e11, rate: 9.5e5,
      desc: 'Trees that fruit only in total dark. Each fruit is a small night.' },
    { id: 'sleeper', glyph: '◉', name: 'Sleeper Below', plural: 'Sleepers Below', tool: 'Dreams', cost: 3e12, rate: 7e6,
      desc: 'It dreams the realm darker. Do not ask what else it dreams.' }
  ];

  var UPG_TIERS = [
    { at: 10, mult: 40, adj: 'Honed' },
    { at: 25, mult: 400, adj: 'Blackened' },
    { at: 50, mult: 1.2e4, adj: 'Twice-Dark' },
    { at: 100, mult: 1.5e7, adj: 'Queen-Marked' },
    { at: 150, mult: 1.5e10, adj: 'Fathomless' },
    { at: 200, mult: 1.5e13, adj: 'Unseen' },
    { at: 250, mult: 1.5e16, adj: 'Starless' },
    { at: 300, mult: 2e19, adj: 'Final' }
  ];

  var HAND_UPGS = [
    { id: 'hand0', name: 'Cupped Hands', cost: 60, desc: 'Gathering by hand yields twice as much.' },
    { id: 'hand1', name: 'A Second Shadow', cost: 2500, desc: 'Each gather also yields 2% of your Gloom per second.' },
    { id: 'hand2', name: 'A Third Shadow', cost: 2e5, desc: 'Each gather yields a further 2% of your Gloom per second.' },
    { id: 'hand3', name: 'A Fourth Shadow', cost: 5e7, desc: 'Each gather yields a further 2% of your Gloom per second.' },
    { id: 'hand4', name: 'A Crowd of Shadows', cost: 2e10, desc: 'Each gather yields a further 2% of your Gloom per second.' },
    { id: 'hand5', name: 'A Procession', cost: 1e13, desc: 'Each gather yields a further 2% of your Gloom per second.' },
    { id: 'hand6', name: 'A Congregation', cost: 1e16, desc: 'Each gather yields a further 2% of your Gloom per second.' }
  ];

  var REALM_UPGS = [
    { id: 'realm0', name: 'Sweep the Throne Room', cost: 5e4 },
    { id: 'realm1', name: 'Shutter the Old Windows', cost: 2e7 },
    { id: 'realm2', name: 'Drown the Mirrors', cost: 1e10 },
    { id: 'realm3', name: 'Unname the Stars', cost: 5e12 },
    { id: 'realm4', name: 'Close the Last Door', cost: 2e15 },
    { id: 'realm5', name: 'Forget the Word for Morning', cost: 1e18 },
    { id: 'realm6', name: 'The Dark Behind the Dark', cost: 1e21 }
  ];

  var RITES = [
    { id: 'edge', name: 'Rite of the Sharpened Dark', desc: 'Host Might ×1.2 per level.', base: 5, g: 1.45 },
    { id: 'listen', name: 'Rite of Deep Listening', desc: 'All Gloom ×1.12 per level.', base: 8, g: 1.5 },
    { id: 'names', name: 'Rite of Remembered Names', desc: 'Echoes gained ×1.15 per level.', base: 20, g: 1.7 },
    { id: 'hands', name: 'Rite of Many Hands', desc: 'Gathering by hand ×1.5 per level.', base: 10, g: 1.6 },
    { id: 'sleep', name: 'Rite of the Long Sleep', desc: 'The realm works 10% harder while you are away (base 50%).', base: 40, g: 3, max: 5 },
    { id: 'lure', name: 'Rite of the Baited Dark', desc: 'Stray Lanterns come 10% sooner per level.', base: 60, g: 2.5, max: 5 },
    { id: 'breathing', name: 'Rite of the Long Breath', desc: 'Litanies return 5% sooner per level.', base: 30, g: 2.2, max: 6 }
  ];

  /* What the Seat tells the player to do next. The first entry whose `when` holds wins. `f` is the facts
     object built by the engine. `go` is where tapping it leads. Add entries in order of importance. */
  function article(name) { return /^[AEIOU]/.test(name) ? 'An ' : 'A '; }
  var OBJECTIVES = [
    { id: 'first', when: function (f) { return f.denizens === 0; }, go: { dest: 'realm', page: 'den' },
      text: function () { return 'Gather 10 Gloom and bind a Wisp-Gleaner.'; } },
    { id: 'working', when: function (f) { return !!f.work; }, go: { dest: 'realm', page: 'work' },
      text: function (f) { return 'A working is ready: ' + f.work + '.'; } },
    { id: 'lampwarden', when: function (f) { return !!f.boss; }, go: { dest: 'host', page: 'shaft' },
      text: function (f) { return 'The Host needs ' + (f.boss.mult < 10 ? f.boss.mult.toFixed(1) : Math.ceil(f.boss.mult)) + '\u00d7 more Might for ' + f.boss.name + '.'; } },
    { id: 'unlight', when: function (f) { return f.unlight; }, go: { dest: 'deep', page: 'unl' },
      text: function () { return 'The realm is heavy enough to let go.'; } },
    { id: 'nextden', when: function (f) { return !!f.nextDen; }, go: { dest: 'realm', page: 'den' },
      text: function (f) { return article(f.nextDen.name) + f.nextDen.name + ' in ' + f.nextDen.when + '.'; } },
    { id: 'rite', when: function (f) { return f.rite; }, go: { dest: 'host', page: 'rite' },
      text: function () { return 'The Cantors can perform a rite.'; } },
    { id: 'omen', when: function (f) { return !!f.omen; }, go: { dest: 'ledger', page: 'omen' },
      text: function (f) { return f.omen.name + ': ' + Math.floor(f.omen.ratio * 100) + '%.'; } },
    { id: 'quiet', when: function () { return true; }, go: null,
      text: function () { return 'The realm is quiet.'; } }
  ];

  /* Lantern kinds: chance in percent (they add to 100), life in seconds. Warden's Lamps fall back to Stray
     when no Lampwarden is being fought. Kinds unlock after 10 lanterns have been snuffed. */
  var LANTERNS = {
    unlockAfter: 10,
    kinds: [ { id: 'stray', w: 80, life: 14 }, { id: 'votive', w: 14, life: 9 }, { id: 'warden', w: 6, life: 20 } ],
    // Every `every`th spawn is a Procession: `count` Stray Lanterns, `gap` seconds apart, each alive `life` seconds, each paying `share` of a normal outcome.
    procession: { every: 8, count: 5, gap: 1.6, life: 8, share: 0.4 },
    // Each unbroken snuff adds `step` to lantern yields and durations, up to `cap` steps.
    streak: { step: 0.04, cap: 10 },
    // A Warden's Lamp takes this share of a Lampwarden's radiance and adds this many seconds to its timer.
    wardenShare: 0.2, wardenTime: 10
  };

  /* Stray Lantern paths and their weights. The interface picks one per lantern. */
  var LANTERN_PATHS = [
    { id: 'ltr', w: 35 },
    { id: 'rtl', w: 35 },
    { id: 'drop', w: 30 }
  ];

  /* Litanies: active abilities. `on` seconds of effect, `cd` seconds before the next. Starting values.
     The Rite of the Long Breath multiplies cooldowns by 0.95 per level. */
  var LITANIES = [
    { id: 'teeth', glyph: '\u2694', name: 'Litany of Teeth', desc: 'Host Might \u00d73 for 15 seconds.', on: 15, cd: 300 },
    { id: 'breath', glyph: '\u223f', name: 'Litany of the Held Breath', desc: 'A Lampwarden\'s timer does not run for 10 seconds.', on: 10, cd: 480 },
    { id: 'undertow', glyph: '\u2248', name: 'Litany of the Undertow', desc: 'At once, gather 90 seconds of Gloom.', on: 0, cd: 420 }
  ];

  var PERKS = [
    { id: 'absence', cost: 1, name: 'The First Absence', desc: 'Begin each fathom with 15 Wisp-Gleaners and 5 Moth-Scribes.' },
    { id: 'keen', cost: 3, name: 'Keen Dark', desc: 'Host Might ×2.' },
    { id: 'deep', cost: 5, name: 'Deep Vein', desc: 'All Gloom ×2.' },
    { id: 'halls', cost: 8, name: 'Echoing Halls', desc: 'Echoes gained ×2.' },
    { id: 'unsleeping', cost: 12, name: 'Unsleeping', desc: 'The realm works up to 24 hours while you are away (was 8).' },
    { id: 'bound', cost: 18, name: 'Bound Hands', desc: 'Four shadows gather at the Stillwell for you, every second.' },
    { id: 'thrift', cost: 30, name: 'Thrifty Dark', desc: 'Denizens cost 10% less.' },
    { id: 'quick', cost: 45, name: 'Remembered Road', desc: 'Begin each fathom halfway to your deepest sealed shaft.' },
    { id: 'steward', cost: 70, name: 'The Steward', desc: 'Workings are bought for you the moment you can afford them.' },
    { id: 'remember', cost: 120, name: 'Rites Remembered', desc: 'Keep half of every Rite level through an Unlighting.' },
    { id: 'hunger', cost: 200, name: 'Lantern-Hunger', desc: 'Stray Lanterns yield three times as much and their boons last twice as long.' },
    { id: 'queen', cost: 600, name: 'The Queen\'s Reflection', desc: 'All Gloom, Might and Echoes ×5.' },
    { id: 'further', cost: 2500, name: 'Further Down', desc: 'All Gloom and Might ×10.' }
  ];

  var BOSSES = {
    10: 'Lampwarden Orrin Vale',
    20: 'The Glasswright Sister',
    30: 'Prospector-General Maud Askerel',
    40: 'The Mirror Engine',
    50: 'Dawn-Auditor Pell',
    60: 'The Tallow Barge',
    70: 'Heliarch Voss',
    80: 'The Thousand-Wick Rig',
    90: 'Canon Lumenhart',
    100: 'The Noon Drill',
    110: 'Archlampist Seraphe Dunn',
    120: 'The Unblinking Lens',
    130: 'The Concord\'s Own Shadow',
    140: 'Solar Chancellor Ibe Tarrow',
    150: 'The First Lamp'
  };

  /* Codex entries. `when` is evaluated against a small facts object built in game.js. */
  var CODEX = [
    { id: 'waking', cat: 'realm', sys: 'core', title: 'Waking', when: function (f) { return true; },
      text: 'Every shadow belongs to something. Yours does not. You woke on the floor of a throne room with no memory of a body, a name, or a sun to be cast by. The seat above you was empty and had been for a long time. Nobody objected when you sat in it.' },
    { id: 'gloom', cat: 'realm', sys: 'core', title: 'Gloom', when: function (f) { return f.total >= 10; },
      text: 'Gloom is what dark becomes when it is left alone long enough. It pools in the Stillwell at the foot of the throne, cool and slow, and it can be gathered like water. Everything in Vesperdeep is built from it, including, you suspect, you.' },
    { id: 'seat', cat: 'realm', sys: 'core', title: 'The Vacant Seat', when: function (f) { return f.denizens >= 1; },
      text: 'The first Wisp-Gleaner bowed before it took its hook. It did not bow to you. It bowed to the seat. The denizens call you Regent, which is the word for someone who keeps a chair warm.' },
    { id: 'ledger', cat: 'realm', sys: 'core', title: 'The Moth-Scribes\' Ledger', when: function (f) { return f.den.scribe >= 1; },
      text: 'The Scribes keep one book. Each page lists a place where the dark runs deep and a date it was last checked. The oldest pages are in a hand none of them recognise. The entries stop mid-line.' },
    { id: 'lantern', cat: 'concord', sys: 'core', title: 'Stray Lanterns', when: function (f) { return f.lanterns >= 1; },
      text: 'A lamp on a long chain, lowered through some crack to see what is down here. Scouts, the Scribes say. Snuff one and its light spills, and spilled light curdles into Gloom faster than anything you can gather by hand.' },
    { id: 'concord', cat: 'concord', sys: 'core', title: 'The Auric Concord', when: function (f) { return f.shaftsOpen; },
      text: 'Above the roof of the realm there are people, and the people have a government of lamplighters called the Auric Concord. They have started cutting Sunshafts down into Vesperdeep. A shaft is a wound of daylight. Your Host goes up each one and stitches it shut.' },
    { id: 'echo', cat: 'realm', sys: 'core', title: 'Echoes', when: function (f) { return f.echoesTotal >= 1; },
      text: 'When a living thing dies its shadow comes loose and sinks here. Most arrive carrying a scrap of whoever cast them: a habit, a tune, the way they held a cup. These scraps are Echoes. The Concord\'s shafts are full of them, caught like moths in a jar.' },
    { id: 'hush', cat: 'realm', sys: 'core', title: 'The Hush', when: function (f) { return f.den.warden >= 1; },
      text: 'Hush-Wardens were here before the throne room had walls. They do not serve the seat. They serve the quiet, and they have decided, for now, that you are quieter than the alternative.' },
    { id: 'tallow', cat: 'concord', sys: 'core', title: 'Shadow-Tallow', when: function (f) { return f.best >= 5; },
      text: 'Your Host brought back a Concord lamp. It burns a grey wax that gives a steady, cheap light. The Weavers would not touch it. The wax is rendered shadow. They are not drilling to explore. They are drilling for fuel.' },
    { id: 'vale', cat: 'concord', sys: 'core', title: 'Orrin Vale\'s Chain', when: function (f) { return f.best >= 10; },
      text: 'Lampwarden Vale came down the first chain himself, which the Scribes consider either brave or badly managed. His last report was recovered with his lamp: "It is not empty. Recommend we stop calling it empty."' },
    { id: 'cantors', cat: 'queen', sys: 'core', title: 'What the Cantors Sing', when: function (f) { return f.den.cantor >= 1; },
      text: 'There are no words to the dusk-song, only the long falling note a day makes as it ends. The Cantors say it was taught to them by a queen. When you ask which queen they look at the seat, and then at you, and keep singing.' },
    { id: 'sister', cat: 'concord', sys: 'core', title: 'The Glasswright Sister', when: function (f) { return f.best >= 20; },
      text: 'She lined her shaft with mirrors so the daylight would arrive undiluted. It worked. Your Host learned to fight with its eyes shut, and she learned that a mirror in a dark room shows nothing at all.' },
    { id: 'sea', cat: 'sea', sys: 'core', title: 'The Sunless Sea', when: function (f) { return f.den.tide >= 1; },
      text: 'Under Vesperdeep there is water that has never been looked at. The Tidewells draw from it. What comes up is Gloom so old it has weight, and sometimes a current pulls at the buckets, patiently, from below.' },
    { id: 'ysmerel', cat: 'queen', sys: 'core', title: 'Ysmerel', when: function (f) { return f.best >= 30; },
      text: 'Prospector-General Askerel carried a survey map. On it, the throne room is labelled in an older script: SEAT OF YSMEREL, THE UNSEEN. So there was a queen, the surface knew her name, and nobody down here will say it.' },
    { id: 'unlighting', cat: 'deep', sys: 'core', title: 'The Unlighting', when: function (f) { return f.unlightOpen; },
      text: 'The oldest page in the Ledger describes a working. Gather enough Gloom and the realm grows heavy. Heavy enough, and it can be let go, to sink one fathom further from the sun. Everything built is left behind. The shafts are left behind too, dangling over nothing.' },
    { id: 'fathom', cat: 'deep', sys: 'core', title: 'A Fathom Down', when: function (f) { return f.unlightings >= 1; },
      text: 'It was not like falling. It was like a breath going out. The denizens are gone and the Stillwell is shallow again, but the dark here is closer-grained, and something of the old realm came with you, pressed hard and bright-black in your hand.' },
    { id: 'glass', cat: 'queen', sys: 'core', title: 'Nightglass', when: function (f) { return f.glassTotal >= 10; },
      text: 'Dark under enough pressure turns to glass. Nightglass does not reflect what stands in front of it. It reflects what stood there before. Hold a shard up in the throne room and the seat is not empty.' },
    { id: 'orchard', cat: 'realm', sys: 'core', title: 'The Orchard', when: function (f) { return f.den.orchard >= 1; },
      text: 'The trees were planted in rows by someone with a plan. The Gleaners harvest and never eat. One fruit, split open, held a night with a thin moon in it and the sound of a door closing. You closed the fruit.' },
    { id: 'pell', cat: 'concord', sys: 'core', title: 'Dawn-Auditor Pell\'s Report', when: function (f) { return f.best >= 50; },
      text: '"Yield per shaft is falling. The seam appears to be moving away from us. I am instructed to write that this is impossible. I note for the record that we are now using longer chains."' },
    { id: 'sleeper', cat: 'sea', sys: 'core', title: 'The Sleeper Below', when: function (f) { return f.den.sleeper >= 1; },
      text: 'It was at the bottom of the sunless sea and it did not wake when you bound it. It breathes once an age. On the in-breath, the realm leans toward it. The Wardens will not stand on that side of the throne room.' },
    { id: 'reflection', cat: 'queen', sys: 'core', title: 'The Reflection', when: function (f) { return f.unlightings >= 3; },
      text: 'In the Nightglass the figure on the seat is clearer each fathom. She is not looking at the room. She is looking at the shard, from the other side, as if checking how far you have come.' },
    { id: 'drill', cat: 'concord', sys: 'core', title: 'The Noon Drill', when: function (f) { return f.best >= 100; },
      text: 'No crew. No lampwarden. A machine that bores straight down and carries the hour of noon in a lens at its tip. The Concord has stopped sending people, which means the people above have started to be afraid.' },
    { id: 'ownshadow', cat: 'concord', sys: 'core', title: 'The Concord\'s Own Shadow', when: function (f) { return f.best >= 130; },
      text: 'A government that burns shadow for light still casts one. It came down the shaft unwilling, huge, shaped like a hall full of lamps. It did not fight well. When your Host sealed the shaft it stayed on this side, and asked, politely, where it should stand.' },
    { id: 'queenseat', cat: 'queen', sys: 'core', title: 'The Queen\'s Seat', when: function (f) { return f.unlightings >= 5; },
      text: 'The Cantors finally said it. Ysmerel did not leave. She performed the first Unlighting alone, and the pressure of it made her the first Nightglass. Every shard you carry is a piece of the same pane. A Regent keeps the chair warm until the pane is whole.' },
    { id: 'firstlamp', cat: 'concord', sys: 'core', title: 'The First Lamp', when: function (f) { return f.best >= 150; },
      text: 'At the top of the last shaft there was no engine and no army. There was one small lamp on a kitchen table, the first the Concord ever lit, still burning shadow-tallow rendered from a shadow whose name the Ledger had kept on its oldest page. Your Host did not snuff it. It carried the flame down, and set it at the foot of the throne, and for the first time the seat cast a shadow of its own.' },
    { id: "surfaceclock", cat: "sky", sys: "sky", title: "The Surface Clock", when: function (f) { return f.skyOpen >= 1; },
      text: "The Scribes have worked out the hours above from the lanterns. When the lamps come thick it is the change of shift. When the shafts go quiet the surface is asleep, and the dark runs down the walls with nothing to stop it. You have started keeping their hours. It is the only thing you have in common." },
    { id: "moonless", cat: "sky", sys: "sky", title: "The Moonless Night", when: function (f) { return f.sky.moonless >= 1; },
      text: "Once in every turn of the moon there is a night with nothing in the sky. The Concord doubles its watch. The Cantors hold one note until morning. Nightglass cut on that night comes out thicker, and nobody will say why." },
    { id: "lidless", cat: "sky", sys: "sky", title: "The Lidless Moon", when: function (f) { return f.sky.lidless >= 1; },
      text: "A full moon is a lamp nobody lit. The Lampwardens work by it without tallow and count that as thrift. Their shafts stay crewed all night, which means more shadows on the chains, which means more Echoes for you. The Concord has not noticed the arithmetic." },
    { id: "longestnight", cat: "sky", sys: "sky", title: "The Longest Night", when: function (f) { return f.sky.longestnight >= 1; },
      text: "The denizens keep one holiday. Nobody announces it. The Gleaners put down their hooks, the Forge goes quiet, and the whole realm listens to the surface run out of day. Then everyone goes back to work, and the work goes better than it has all year." },
    { id: "longestday", cat: "sky", sys: "sky", title: "The Longest Day", when: function (f) { return f.sky.longestday >= 1; },
      text: "Up there they light bonfires and call it a festival. Down here it is the day the chains run fastest. The Scribes mark it in the Ledger with a small drawing of a sun, crossed out." },
    { id: "balance", cat: "sky", sys: "sky", title: "The Balance", when: function (f) { return f.sky.balance >= 1; },
      text: "Twice a year the day and the night are the same length and neither side will admit it. The Wardens stand in the doorways. Nothing happens. The Wardens consider this a success." },
    { id: "performance", cat: "sky", sys: "sky", title: "The Performance", when: function (f) { return f.sky.eclipse >= 1; },
      text: "Forty voices, rehearsing since before the throne had a room. Today the sun was covered and they sang it through once, start to end, with no mistakes. Afterward the conductor put down the baton and asked when the next one was. The Scribes knew." },
    { id: "petitions", cat: "realm", sys: "petitions", title: "Petitions", when: function (f) { return f.petitions >= 1; },
      text: "The denizens do not ask for things. They inform the seat of what they intend and wait to see if it objects. The Scribes call these petitions, to be polite. You may grant one a day. They have noticed which ones you choose." },
    { id: "litanies", cat: "realm", sys: "litanies", title: "Litanies", when: function (f) { return f.litanies >= 1; },
      text: "A rite is slow. A litany is the same thing said fast, by everyone, at once. The Cantors can manage it for a few breaths and need a long silence afterward. The Lampwardens have a word for it in their reports. The word is \"weather\"." },
    { id: "vigil", cat: "realm", sys: "petitions", title: "The Vigil", when: function (f) { return f.vigils >= 7; },
      text: "The Scribes have started a tally of the days you came to the seat and granted something. They do not count the days you did not. When asked why, the eldest said that a ledger of absences is just a list of everything." },
    { id: "soundings", cat: "sea", sys: "soundings", title: "Soundings", when: function (f) { return f.soundings >= 1; },
      text: "The Tidewells go down further than their ropes. Someone tied on more rope. What came up was not Gloom. It was a cup, whole, with the glaze worn where a thumb had rested for forty years. The Scribes made a new page." },
    { id: "set_table", cat: "sea", sys: "soundings", title: "The Drowned Table", when: function (f) { return f.sets.table >= 1; },
      text: "Four things from one table. Laid out together they make a place setting for someone who ate alone and did not mind. The Echoes come more easily now, as if they had somewhere to sit." },
    { id: "set_survey", cat: "sea", sys: "soundings", title: "The Surveyor's Kit", when: function (f) { return f.sets.survey >= 1; },
      text: "Prospector-General Askerel's instruments, dropped down a shaft on purpose. The level has no bubble. The Host has learned to read it anyway. It says the same thing in every direction, which is down." },
    { id: "set_loft", cat: "sea", sys: "soundings", title: "The Choir Loft", when: function (f) { return f.sets.loft >= 1; },
      text: "The fork hums at dusk without being struck. The page is all rests. The Cantors say it is the most difficult piece they own and they have never once got through it without somebody breathing." },
    { id: "set_lamp", cat: "sea", sys: "soundings", title: "The Lamp Room", when: function (f) { return f.sets.lamp >= 1; },
      text: "A wick never lit, a snuffer, a tin, a lens. Somebody up there kept a lamp room and never used it. The Scribes think it was a lamplighter who preferred the dark. They have given the wick its own shelf." },
    { id: "set_queen", cat: "sea", sys: "soundings", title: "The Queen's Things", when: function (f) { return f.sets.queen >= 1; },
      text: "A comb. A ring too large for any hand. A key to no door in the realm. A glazier's diamond, for cutting panes. The Cantors would not touch any of them. The Weavers asked, carefully, whether you wanted the diamond sharpened." },
    { id: "set_bed", cat: "sea", sys: "soundings", title: "The Sleeper's Bed", when: function (f) { return f.sets.bed >= 1; },
      text: "You have been taking things from under something that is asleep. It has not woken. The Wardens stand a little further off than they did. The breath in the jar has not been opened and will not be." },
    { id: "currents", cat: "deep", sys: "currents", title: "Currents", when: function (f) { return f.currents >= 1; },
      text: "The realm does not sink straight down. There are currents in the deep dark, and each fathom has a grain to it, the way wood does. The Wardens can feel three of them from the seat. They will tell you which is which. They will not tell you which to take." },
    { id: "vows", cat: "deep", sys: "vows", title: "Vows", when: function (f) { return f.vowsOpen >= 1; },
      text: "The oldest Hush-Warden kept a vow for an age and will not say what it was. It says only that a thing given up on the way down is waiting, heavier, at the bottom. The Scribes have a column for vows. It was already ruled when they opened the page." },
    { id: "pane", cat: "deep", sys: "pane", title: "The Pane", when: function (f) { return f.glassTotal >= 1; },
      text: "Lay the shards out on the floor of the throne room and they do not fit each other. They fit a shape that is not here yet. The Weavers have drawn it: a round window, twenty-four lights, leaded in black. One light is already filled. It is the one you were holding when you woke." },
    { id: "pane_half", cat: "deep", sys: "pane", title: "Twelve Lights", when: function (f) { return f.paneLit >= 12; },
      text: "Half a window. Through it the throne room looks the way it did, which is to say, occupied. She is not sitting. She is standing at the pane with one hand flat on the other side, the way a person stands at a door they have decided not to knock on." },
    { id: "elder", cat: "deep", sys: "elder", title: "The Elder Shafts", when: function (f) { return f.best >= 151; },
      text: "Past the First Lamp the shafts do not stop. These were not cut by the Concord. The stone is older and the chains are a metal the Forge cannot name. Someone dug for shadow before there were lamplighters. Toward the end, they also used longer chains." },
    { id: "bell", cat: "deep", sys: "elder", title: "The Drowned Bell", when: function (f) { return f.elderBell >= 1; },
      text: "It was cast to call people up out of a mine. It rang once too late and was thrown down the shaft after them. It still rings. Nothing comes up. The Gleaners find this restful." },
    { id: "root", cat: "deep", sys: "elder", title: "What Is Under the Seat", when: function (f) { return f.best >= 200; },
      text: "At the top of the oldest shaft there was no lamp. There was a hole in a field, grown over, and a stone with a name worn off it. Your Host stood in daylight for the first time and cast nothing. It came home and reported that the surface is thin, and that most of the world is down here, and always was." }
  ];

  /* Court chatter: one line, drawn at random from the denizens the player owns. Verbatim from docs/design/LORE_BIBLE.md section 5. */
  var CHATTER = {
    gleaner: [
      "A Gleaner found a corner it had not raked. It is very pleased.",
      "Two Gleaners are arguing over a hook. It is the same hook.",
      "A Gleaner has brought you a handful of dark. It is slightly better than the usual dark."
    ],
    scribe: [
      "A Scribe asks how you spell your name. You do not know. It writes that down.",
      "The Scribes have run out of ink again. Nobody mentions where it went.",
      "A Scribe corrected the Ledger. The old line is still legible underneath."
    ],
    weaver: [
      "The Weavers have finished a curtain. It hangs across nothing.",
      "A Weaver measured you for something and would not say what.",
      "The looms have stopped. They start again when you look away."
    ],
    warden: [
      "A Warden has moved one pace to the left. This is being discussed.",
      "The Wardens are standing nearer the seat today.",
      "A Warden looked up. The others pretended not to see."
    ],
    cantor: [
      "The Cantors are holding the low note. Your teeth can feel it.",
      "A Cantor came in early. Nobody has forgiven it.",
      "The Cantors have stopped. The silence is in the same key."
    ],
    forge: [
      "The Forge rang once on its own.",
      "Something was hammered thicker in the night. It is not clear what it was before.",
      "The anvil is cold to the touch and getting colder."
    ],
    tide: [
      "The Tidewells are high. Something below is breathing in.",
      "A bucket came up heavier than it went down, and empty.",
      "The water in the cisterns leaned to one side for an hour."
    ],
    choir: [
      "The Eclipse Choir has reached the bar they always stop at.",
      "Forty voices breathed in together. Nothing followed.",
      "The conductor asked the Scribes for a date."
    ],
    orchard: [
      "A fruit fell in the Orchard. Nobody heard it land.",
      "The Orchard has put out one more row. Nobody planted it.",
      "A Gleaner was found asleep under a tree, holding a small night."
    ],
    sleeper: [
      "The Sleeper turned over. The realm waited until it settled.",
      "It said a word in its sleep. The Scribes did not write it down.",
      "The Wardens have moved to the other side of the room again."
    ]
  };

  /* The Codex headings, in order. */
  var CODEX_CATS = [
    { id: 'realm', title: 'The Realm' }, { id: 'concord', title: 'The Concord' }, { id: 'queen', title: 'The Queen' },
    { id: 'deep', title: 'The Deep' }, { id: 'sea', title: 'The Sea' }, { id: 'sky', title: 'The Sky' }
  ];
  /* Systems that exist. A Codex page whose `sys` is not listed here never unlocks and is not counted as dark.
     Each ticket that adds a system adds its name here: 'sky', 'petitions', 'litanies', 'soundings', 'currents', 'vows', 'pane', 'elder'. */
  var LIVE_SYSTEMS = ['core', 'litanies'];

  return freeze({
    DENIZENS: DENIZENS, UPG_TIERS: UPG_TIERS, HAND_UPGS: HAND_UPGS, REALM_UPGS: REALM_UPGS,
    RITES: RITES, CHATTER: CHATTER, CODEX_CATS: CODEX_CATS, LIVE_SYSTEMS: LIVE_SYSTEMS, LITANIES: LITANIES, OBJECTIVES: OBJECTIVES, LANTERNS: LANTERNS, LANTERN_PATHS: LANTERN_PATHS, PERKS: PERKS, BOSSES: BOSSES, CODEX: CODEX
  });
})();
