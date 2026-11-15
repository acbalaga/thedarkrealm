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
    { id: 'lure', name: 'Rite of the Baited Dark', desc: 'Stray Lanterns come 10% sooner per level.', base: 60, g: 2.5, max: 5 }
  ];

  /* Stray Lantern paths and their weights. The interface picks one per lantern. */
  var LANTERN_PATHS = [
    { id: 'ltr', w: 35 },
    { id: 'rtl', w: 35 },
    { id: 'drop', w: 30 }
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
    { id: 'waking', title: 'Waking', when: function (f) { return true; },
      text: 'Every shadow belongs to something. Yours does not. You woke on the floor of a throne room with no memory of a body, a name, or a sun to be cast by. The seat above you was empty and had been for a long time. Nobody objected when you sat in it.' },
    { id: 'gloom', title: 'Gloom', when: function (f) { return f.total >= 10; },
      text: 'Gloom is what dark becomes when it is left alone long enough. It pools in the Stillwell at the foot of the throne, cool and slow, and it can be gathered like water. Everything in Vesperdeep is built from it, including, you suspect, you.' },
    { id: 'seat', title: 'The Vacant Seat', when: function (f) { return f.denizens >= 1; },
      text: 'The first Wisp-Gleaner bowed before it took its hook. It did not bow to you. It bowed to the seat. The denizens call you Regent, which is the word for someone who keeps a chair warm.' },
    { id: 'ledger', title: 'The Moth-Scribes\' Ledger', when: function (f) { return f.den.scribe >= 1; },
      text: 'The Scribes keep one book. Each page lists a place where the dark runs deep and a date it was last checked. The oldest pages are in a hand none of them recognise. The entries stop mid-line.' },
    { id: 'lantern', title: 'Stray Lanterns', when: function (f) { return f.lanterns >= 1; },
      text: 'A lamp on a long chain, lowered through some crack to see what is down here. Scouts, the Scribes say. Snuff one and its light spills, and spilled light curdles into Gloom faster than anything you can gather by hand.' },
    { id: 'concord', title: 'The Auric Concord', when: function (f) { return f.shaftsOpen; },
      text: 'Above the roof of the realm there are people, and the people have a government of lamplighters called the Auric Concord. They have started cutting Sunshafts down into Vesperdeep. A shaft is a wound of daylight. Your Host goes up each one and stitches it shut.' },
    { id: 'echo', title: 'Echoes', when: function (f) { return f.echoesTotal >= 1; },
      text: 'When a living thing dies its shadow comes loose and sinks here. Most arrive carrying a scrap of whoever cast them: a habit, a tune, the way they held a cup. These scraps are Echoes. The Concord\'s shafts are full of them, caught like moths in a jar.' },
    { id: 'hush', title: 'The Hush', when: function (f) { return f.den.warden >= 1; },
      text: 'Hush-Wardens were here before the throne room had walls. They do not serve the seat. They serve the quiet, and they have decided, for now, that you are quieter than the alternative.' },
    { id: 'tallow', title: 'Shadow-Tallow', when: function (f) { return f.best >= 5; },
      text: 'Your Host brought back a Concord lamp. It burns a grey wax that gives a steady, cheap light. The Weavers would not touch it. The wax is rendered shadow. They are not drilling to explore. They are drilling for fuel.' },
    { id: 'vale', title: 'Orrin Vale\'s Chain', when: function (f) { return f.best >= 10; },
      text: 'Lampwarden Vale came down the first chain himself, which the Scribes consider either brave or badly managed. His last report was recovered with his lamp: "It is not empty. Recommend we stop calling it empty."' },
    { id: 'cantors', title: 'What the Cantors Sing', when: function (f) { return f.den.cantor >= 1; },
      text: 'There are no words to the dusk-song, only the long falling note a day makes as it ends. The Cantors say it was taught to them by a queen. When you ask which queen they look at the seat, and then at you, and keep singing.' },
    { id: 'sister', title: 'The Glasswright Sister', when: function (f) { return f.best >= 20; },
      text: 'She lined her shaft with mirrors so the daylight would arrive undiluted. It worked. Your Host learned to fight with its eyes shut, and she learned that a mirror in a dark room shows nothing at all.' },
    { id: 'sea', title: 'The Sunless Sea', when: function (f) { return f.den.tide >= 1; },
      text: 'Under Vesperdeep there is water that has never been looked at. The Tidewells draw from it. What comes up is Gloom so old it has weight, and sometimes a current pulls at the buckets, patiently, from below.' },
    { id: 'ysmerel', title: 'Ysmerel', when: function (f) { return f.best >= 30; },
      text: 'Prospector-General Askerel carried a survey map. On it, the throne room is labelled in an older script: SEAT OF YSMEREL, THE UNSEEN. So there was a queen, the surface knew her name, and nobody down here will say it.' },
    { id: 'unlighting', title: 'The Unlighting', when: function (f) { return f.unlightOpen; },
      text: 'The oldest page in the Ledger describes a working. Gather enough Gloom and the realm grows heavy. Heavy enough, and it can be let go, to sink one fathom further from the sun. Everything built is left behind. The shafts are left behind too, dangling over nothing.' },
    { id: 'fathom', title: 'A Fathom Down', when: function (f) { return f.unlightings >= 1; },
      text: 'It was not like falling. It was like a breath going out. The denizens are gone and the Stillwell is shallow again, but the dark here is closer-grained, and something of the old realm came with you, pressed hard and bright-black in your hand.' },
    { id: 'glass', title: 'Nightglass', when: function (f) { return f.glassTotal >= 10; },
      text: 'Dark under enough pressure turns to glass. Nightglass does not reflect what stands in front of it. It reflects what stood there before. Hold a shard up in the throne room and the seat is not empty.' },
    { id: 'orchard', title: 'The Orchard', when: function (f) { return f.den.orchard >= 1; },
      text: 'The trees were planted in rows by someone with a plan. The Gleaners harvest and never eat. One fruit, split open, held a night with a thin moon in it and the sound of a door closing. You closed the fruit.' },
    { id: 'pell', title: 'Dawn-Auditor Pell\'s Report', when: function (f) { return f.best >= 50; },
      text: '"Yield per shaft is falling. The seam appears to be moving away from us. I am instructed to write that this is impossible. I note for the record that we are now using longer chains."' },
    { id: 'sleeper', title: 'The Sleeper Below', when: function (f) { return f.den.sleeper >= 1; },
      text: 'It was at the bottom of the sunless sea and it did not wake when you bound it. It breathes once an age. On the in-breath, the realm leans toward it. The Wardens will not stand on that side of the throne room.' },
    { id: 'reflection', title: 'The Reflection', when: function (f) { return f.unlightings >= 3; },
      text: 'In the Nightglass the figure on the seat is clearer each fathom. She is not looking at the room. She is looking at the shard, from the other side, as if checking how far you have come.' },
    { id: 'drill', title: 'The Noon Drill', when: function (f) { return f.best >= 100; },
      text: 'No crew. No lampwarden. A machine that bores straight down and carries the hour of noon in a lens at its tip. The Concord has stopped sending people, which means the people above have started to be afraid.' },
    { id: 'ownshadow', title: 'The Concord\'s Own Shadow', when: function (f) { return f.best >= 130; },
      text: 'A government that burns shadow for light still casts one. It came down the shaft unwilling, huge, shaped like a hall full of lamps. It did not fight well. When your Host sealed the shaft it stayed on this side, and asked, politely, where it should stand.' },
    { id: 'queenseat', title: 'The Queen\'s Seat', when: function (f) { return f.unlightings >= 5; },
      text: 'The Cantors finally said it. Ysmerel did not leave. She performed the first Unlighting alone, and the pressure of it made her the first Nightglass. Every shard you carry is a piece of the same pane. A Regent keeps the chair warm until the pane is whole.' },
    { id: 'firstlamp', title: 'The First Lamp', when: function (f) { return f.best >= 150; },
      text: 'At the top of the last shaft there was no engine and no army. There was one small lamp on a kitchen table, the first the Concord ever lit, still burning shadow-tallow rendered from a shadow whose name the Ledger had kept on its oldest page. Your Host did not snuff it. It carried the flame down, and set it at the foot of the throne, and for the first time the seat cast a shadow of its own.' }
  ];

  return freeze({
    DENIZENS: DENIZENS, UPG_TIERS: UPG_TIERS, HAND_UPGS: HAND_UPGS, REALM_UPGS: REALM_UPGS,
    RITES: RITES, LANTERN_PATHS: LANTERN_PATHS, PERKS: PERKS, BOSSES: BOSSES, CODEX: CODEX
  });
})();
