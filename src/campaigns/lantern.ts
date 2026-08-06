/**
 * lantern.ts — "The Lantern of Elmsworth", the free starter campaign.
 *
 * Short teaser (5 encounters, 1 fork) demonstrating what campaigns are:
 * story, choices, progression from bare basics to specials, and encounter
 * design you can't get in the arena — a pincer ambush, a scrapper swarm,
 * a chokepoint brute, and a boss with a healer.
 */
import { CampaignDefinition } from './types.js';

export const lanternCampaign: CampaignDefinition = {
  slug: 'lantern',
  title: 'The Lantern of Elmsworth',
  blurb: 'Goblins have stolen the Harvest Lantern on the eve of the festival. Bring back the light.',
  enemyFactionName: 'Goblins',
  free: true,
  startNode: 'intro',
  // TODO(skins): no skin system exists yet — unlock is recorded in campaign
  // meta locally; wire to the skin picker when skins ship.
  rewardSkin: { classSlug: 'rogue', skinId: 'lantern_goblin_king', name: 'Goblin King' },

  achievements: [
    { slug: 'complete_easy',      name: 'Lantern Lit',       description: 'Complete The Lantern of Elmsworth on Easy.' },
    { slug: 'complete_medium',    name: 'Lantern Blazing',   description: 'Complete The Lantern of Elmsworth on Medium.' },
    { slug: 'complete_hard',      name: 'Festival Hero',     description: 'Complete The Lantern of Elmsworth on Hard.' },
    { slug: 'complete_nightmare', name: 'Light in the Dark', description: 'Complete The Lantern of Elmsworth on Nightmare — unlocks the Goblin King skin.' },
    { slug: 'friend_of_the_mill', name: 'Friend of the Mill', description: 'Defend the miller\'s cart.' },
    { slug: 'swift_justice',      name: 'Swift Justice',      description: 'Run down the goblin scouts.' },
  ],

  enemies: {
    goblin_scrapper: {
      baseClass: 'rogue', name: 'Goblin Scrapper',
      maxHealth: 36, armorClass: 9,
      nightmare: { acBonus: 1 },
    },
    goblin_slinger: {
      baseClass: 'ranger', name: 'Goblin Slinger',
      maxHealth: 36, armorClass: 10,
      nightmare: { acBonus: 1 },
    },
    wolfpelt_runner: {
      // The goblins' "wolves": goblins in wolf pelts, running on all fours.
      // Humanoid (rogue chassis, goblin art) — real wolves can't be animated.
      baseClass: 'rogue', name: 'Wolfpelt Runner',
      maxHealth: 33, armorClass: 8, movementRange: 4,
      nightmare: {},
    },
    orc_bruiser: {
      baseClass: 'fighter', name: 'Orc Bruiser',
      maxHealth: 68, armorClass: 12,
      passiveFlags: ['immovable'],
      nightmare: { hpBonus: 4 },
    },
    moss_shaman: {
      baseClass: 'cleric', name: 'Moss Shaman',
      maxHealth: 34, armorClass: 10,
      specialSlug: 'heal',   // the story's whole beat: he keeps the King standing
      nightmare: {},
    },
    king_grubnash: {
      // Barbarian chassis = orc art: Grubnash is a huge orc the goblins crowned.
      baseClass: 'barbarian', name: 'King Grubnash',
      maxHealth: 80, armorClass: 10,
      passiveFlags: ['immovable'],
      nightmare: {},
    },
  },

  encounters: {
    // e1 — Road Ambush: two scrappers pincer the party from front AND rear.
    e1: {
      level: 1,
      enemies: ['goblin_scrapper', 'goblin_scrapper', 'goblin_scrapper'],
      enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 1, y: 4 }],
      playerPlacement: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }],
      noSpecials: true,
      // Tutorial fight: green goblins, softer than their later appearances.
      // Easy sits ~96% — above band, allowed under the tutorial exemption
      // (near-certain first win is correct UX).
      hpScaleOverride: { easy: 0.93, medium: 1.17, hard: 1.22, nightmare: 1.28 },
    },
    // e2 — The Old Mill: scrappers up front, a slinger perched behind them.
    e2: {
      level: 2,
      enemies: ['goblin_scrapper', 'goblin_scrapper', 'goblin_slinger'],
      enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 5 }, { x: 7, y: 3 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 0, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      hpScaleOverride: { easy: 1.26, medium: 1.44, hard: 1.55, nightmare: 1.68 },
    },
    // e3 — Runners at Dusk: four fast wolfpelt goblins converging from three directions.
    e3: {
      level: 3,
      enemies: ['wolfpelt_runner', 'wolfpelt_runner', 'wolfpelt_runner', 'wolfpelt_runner'],
      // Runners start CLOSE. Four fast goblins crossing an open board was a
      // free-shot gallery for a ranged party and a 4-on-4 dogpile for a melee
      // one: melee 57% / ranged 100% at medium, a 43-point spread that put
      // melee under the floor once the mean was tuned into band. hpScale
      // cannot fix a spread — it moves every party together. Starting them
      // inside charge range removes the approach phase that caused it
      // (spread 43 -> 5 at medium), and suits "Runners at Dusk" better:
      // these are the fast ones, they should be on you immediately.
      // Measured alternatives: swapping a runner for a slinger made the
      // spread WORSE (82pts) — a ranged enemy punishes the melee party more,
      // since melee must cross to reach it. Dropping to 3 runners trivialised
      // the fight (100% every party).
      enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 4 }, { x: 5, y: 6 }, { x: 4, y: 1 }],
      // Nightmare sits ~47% — a breakpoint cliff between 1.35 and 1.45 collapses
      // it to ~24%, so we take the nearest band edge (2026-07 rebalance).
      hpScaleOverride: { easy: 1.13, medium: 1.28, hard: 1.39, nightmare: 1.63 },
      playerPlacement: [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 5 }, { x: 2, y: 5 }],
    },
    // e4 — The Cave Mouth: an unmovable orc bruiser blocks the path, scrappers flank.
    e4: {
      level: 4,
      enemies: ['orc_bruiser', 'goblin_scrapper', 'goblin_scrapper', 'goblin_slinger'],
      // Enemies start FARTHER back. At the old 3-tile gap a ranged party was rushed
      // before it could establish any standoff — ranged 15% at medium, 5% at hard,
      // an 85-point spread. hpScale cannot close a spread. Backing them off to a
      // ~6-tile gap restores the approach phase ranged play needs: ranged 15% -> 85%,
      // spread 85 -> 27, mean still in band. (See CAMPAIGNS.md — start distance is
      // the dominant driver of party spread, and it cuts both ways.)
      enemyPlacement: [{ x: 5, y: 6 }, { x: 6, y: 3 }, { x: 4, y: 2 }, { x: 7, y: 6 }],
      playerPlacement: [{ x: 0, y: 5 }, { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 1, y: 7 }],
      hpScaleOverride: { easy: 0.78, medium: 0.91, hard: 0.98, nightmare: 1.04 },
    },
    // e5 — The Lantern Court: the Goblin King, kept alive by his shaman.
    e5: {
      level: 5,
      enemies: ['king_grubnash', 'moss_shaman', 'goblin_scrapper', 'goblin_scrapper'],
      // Enemies start one tile CLOSER. The opposite failure to e4: at a 5.5-tile gap a
      // melee party crossed open ground under fire and arrived shattered — melee 23%
      // at medium, a 77-point spread. Closing the gap gives melee a fight instead of
      // a march: melee 23% -> 95%, spread 77 -> 38.
      enemyPlacement: [{ x: 5, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 5 }, { x: 4, y: 2 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      hpScaleOverride: { easy: 0.80, medium: 0.95, hard: 1.00, nightmare: 1.13 },
    },
  },

  nodes: {
    intro: {
      kind: 'story',
      text: 'On the eve of the Harvest Festival, the great Lantern of Elmsworth vanishes from the village square — and goblin tracks lead east into the Bramblewood. The elders wring their hands. The festival cannot happen in the dark.\n\n{mainName} steps forward. "We\'ll bring it back before the first dance."\n\nThree companions shoulder their packs and follow you onto the east road.',
      next: 'e1_pre',
    },
    e1_pre: {
      kind: 'encounter', encounter: 'e1',
      preText: 'The road narrows between two hedgerows. Too quiet. Then — a whistle from ahead, an answering whistle from BEHIND. Goblin scrappers spring the ambush from both sides!',
      next: 'lv2',
    },
    lv2: { kind: 'levelup', level: 2, next: 'crossroads' },
    crossroads: {
      kind: 'choice',
      text: 'At the crossroads, chaos: the miller\'s cart is under attack by goblins to the north — while two goblin scouts sprint east with a stuffed sack, giggling.\n\n"{mainName}, we can\'t do both!"',
      choices: [
        { label: 'Defend the miller\'s cart', setFlags: { helpedMiller: true }, grantAchievement: 'friend_of_the_mill', next: 'e2_mill' },
        { label: 'Run down the scouts', setFlags: { helpedMiller: false }, grantAchievement: 'swift_justice', next: 'e2_chase' },
      ],
    },
    // Diamond: both paths are the SAME fight at the old mill, different flavor.
    e2_mill: {
      kind: 'encounter', encounter: 'e2',
      preText: 'You charge the cart — and the goblins scatter toward the old mill, where more of them wait. A slinger scrambles up beside the mill wheel, sling already spinning. The miller cheers you on from under the cart.',
      next: 'lv3',
    },
    e2_chase: {
      kind: 'encounter', encounter: 'e2',
      preText: 'The scouts lead you straight to the old mill and dive behind their friends. A slinger scrambles up beside the mill wheel, sling already spinning. The sack they dropped is full of festival pastries.',
      next: 'lv3',
    },
    lv3: { kind: 'levelup', level: 3, next: 'dusk' },
    dusk: {
      kind: 'story',
      text: '{if helpedMiller}The grateful miller presses warm bread into your hands and points east: "They went toward the Howling Hollow."{else}Between bites of recovered pastry, a scout squeals the way: "The Howling Hollow! Please don\'t tell the King!"{/if}\n\nDusk falls as you reach the hollow. From the treeline comes a long, wobbly howl — enthusiastic, but not very wolf-like. A second joins in, badly out of tune. Something down there has spotted your lantern, {mainName}.',
      next: 'e3_pre',
    },
    e3_pre: {
      kind: 'encounter', encounter: 'e3',
      preText: 'The pack bursts from the trees — goblins in wolf pelts, sprinting on all fours, coming from three directions at once. The pelts have button eyes sewn on. The daggers are real. Keep the party tight or be picked apart!',
      next: 'lv4',
    },
    lv4: { kind: 'levelup', level: 4, next: 'cave_approach' },
    cave_approach: {
      kind: 'story',
      text: 'Past the hollow, a warm orange glow spills from a cave mouth in the hillside — lantern-light. Your light.\n\nBut the entrance is narrow, and something very large is snoring just inside it.',
      next: 'e4_pre',
    },
    e4_pre: {
      kind: 'encounter', encounter: 'e4',
      preText: 'The snoring stops. An orc bruiser fills the cave mouth like a boulder with shoulders, and he does not intend to move. Scrappers slip along the walls to surround you in the cramped dark.',
      next: 'lv5',
    },
    lv5: { kind: 'levelup', level: 5, next: 'court_approach' },
    court_approach: {
      kind: 'story',
      text: 'Beyond the bruiser\'s post, the cave opens into a moss-lit court. There, atop a throne of stolen chairs, sits King Grubnash — an orc twice the size of his goblin subjects, wearing the Harvest Lantern as a crown, very pleased with himself.\n\n"MINE," he announces. "Prettiest hat in the Bramblewood."\n\n"{mainName}," whispers your companion, "watch the shaman by the throne. As long as it stands, the King will not fall."',
      next: 'e5_pre',
    },
    e5_pre: {
      kind: 'encounter', encounter: 'e5',
      preText: 'King Grubnash rises, lantern-crown blazing. His moss shaman begins to chant, ready to knit the King\'s wounds closed. Bring down the shaman first — or the King will outlast you!',
      next: 'finale',
    },
    finale: {
      kind: 'end',
      text: 'The lantern is heavier than it looks — and warmer. As you carry it back through the village gates, every window lights up, one by one.\n\n{if helpedMiller}The miller\'s family leads the first dance in your honor, {mainName}.{else}The pastries you recovered are served at the head table, only slightly dented, {mainName}.{/if}\n\nKing Grubnash, thoroughly dethroned, was last seen wearing a bucket.\n\nTHE LANTERN OF ELMSWORTH — COMPLETE',
    },
  },
};
