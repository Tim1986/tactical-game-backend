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
      // D2: as a KILL-TARGET (e5 objective) he is the only enemy that must die,
      // so the other three become ignorable and a ranged party was bursting him
      // down in ~17 turns (100% at every difficulty on the first smoke). A
      // kill-target boss has to be a fight on his own, not a shared HP bar:
      // +30 HP, and `undying` so the kill needs a real follow-through instead of
      // one alpha strike. (`undying` was on CAMPAIGN_BEATS §6's never-used list —
      // this is the dramatic boss beat it was waiting for.)
      baseClass: 'barbarian', name: 'King Grubnash',
      maxHealth: 110, armorClass: 10,
      passiveFlags: ['immovable', 'undying'],
      nightmare: { hpBonus: 8 },
    },
  },

  encounters: {
    // ═══ D2 RETROFIT (2026-08-17) ═══════════════════════════════════════════
    // Palette: e1 kill-all · e2 carve · e3 siege · e4 escape · e5 boss.
    // Five distinct types, none consecutive (CAMPAIGNS.md §8). Lantern is the
    // TERRAIN showcase of the free three — e2/e4/e5 are carved boards, and the
    // roadmap's "finale boss (kill-target)" lands on e5.
    //
    // Two D1 must-fixes are addressed by DESIGN, not tuning:
    //  · e3 was bricked for ranged (40/28/10% vs floors 60/40/15) because four
    //    fast melee runners on an open board must be out-damaged. As a `siege`
    //    with a survive-the-clock win, a ranged party can hold and kite instead
    //    of racing a damage check it cannot win.
    //  · e5 was the boss+healer pattern the beats registry bans on measured
    //    grounds (too easy at medium+ in all three campaigns). Now a kill-target:
    //    the shaman is a complication you may deal with or race past, not a gate.
    // ════════════════════════════════════════════════════════════════════════

    // e1 — Road Ambush (kill-all). Tutorial: deliberately no terrain and no
    // objective. The first fight teaches the base game; the grammar starts at e2.
    e1: {
      level: 1,
      enemies: ['goblin_scrapper', 'goblin_scrapper', 'goblin_scrapper'],
      enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 1, y: 4 }],
      playerPlacement: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }],
      noSpecials: true,
      // Easy sits above band by design — tutorial exemption (near-certain first win).
      // ⚠ Breakpoint cliff on this encounter is STEEP — calibration walk:
      //   medium: 1.17 -> 83% · 1.24 -> 52% · 1.38 -> 40%   (~31 pts per 0.07)
      //   hard:   1.22 -> 70% · 1.32 -> 37% · 1.52 -> 26%   (~33 pts per 0.10)
      // Three scrappers all die to the same breakpoints, so the whole cell
      // moves at once. Values interpolated to band midpoints.
      // e1's three identical scrappers share breakpoints, so the whole cell
      // moves at once and the walk is steep:
      //   medium: 1.17 -> 82% · 1.20 -> 69% · 1.24 -> 52% · 1.38 -> 40%
      //   hard:   1.22 -> 70% · 1.23 -> 57% · 1.26 -> 45% · 1.32 -> 37%
      // 1.20/1.23 are the best-centred rungs available on that ladder.
      hpScaleOverride: { easy: 0.93, medium: 1.20, hard: 1.23, nightmare: 1.28 },
    },

    // e2 — The Old Mill (carve). Two millstone rows leave a central aisle: the
    // slinger's long sightline down that aisle is the threat, and the stones are
    // the answer. Teaches "the board has shape" one fight before it matters.
    e2: {
      level: 2,
      // ⚠ Hard-won: a wall between melee and a RANGED enemy shields the shooter
      // and taxes only the crosser. Three layouts that did exactly that took
      // melee from 52% -> 35% -> 4% while ranged sat near 100%. Cover must sit
      // on the APPROACH so the party advances behind it — two millstones on the
      // crossing lane, nothing screening the goblins.
      terrain: {
        blocked: [{ x: 3, y: 2 }, { x: 3, y: 5 }],
      },
      enemies: ['goblin_scrapper', 'goblin_scrapper', 'goblin_slinger'],
      enemyPlacement: [{ x: 6, y: 2 }, { x: 6, y: 5 }, { x: 6, y: 3 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 0, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      hpScaleOverride: { easy: 1.20, medium: 1.44, hard: 1.55, nightmare: 1.68 },
    },

    // e3 — Runners at Dusk (siege). Three runners hit immediately, two more
    // arrive at round 3; the party must LAST, not clear. Trees give a ranged
    // party something to hold behind — the fix for the D1 ranged brick.
    e3: {
      level: 3,
      terrain: {
        theme: 'forest',
        blocked: [{ x: 3, y: 3 }, { x: 3, y: 5 }, { x: 6, y: 1 }, { x: 2, y: 2 }],
      },
      objective: {
        text: 'Hold out until the pack breaks off (7 rounds)',
        win: [{ kind: 'round_reached', round: 7 }],
      },
      enemies: ['wolfpelt_runner', 'wolfpelt_runner', 'wolfpelt_runner'],
      enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 4 }, { x: 5, y: 6 }],
      // Calibration history: survive-5 + one wave was a coast (99-100%);
      // survive-8 + two full waves overcorrected hard (51% mean, melee 24%).
      // Round count and wave size are the real levers here — hpScale barely moves
      // a survive objective, since tankier runners live longer but do not kill
      // faster. Calibration walk (mean across parties): 5rd/1wave 99% ·
      // 8rd/2full 51% · 6rd/1.5 90% · 7rd/2full 64% · 6rd/2full 88% · 7rd/1.5 —
      // this. Round count moves ~25 points per step, so it brackets coarsely.
      waves: [
        {
          enemies: ['wolfpelt_runner', 'wolfpelt_runner'],
          placement: [{ x: 7, y: 3 }, { x: 7, y: 4 }],
          trigger: { on: 'round', round: 3 },
        },
        {
          enemies: ['wolfpelt_runner'],
          placement: [{ x: 0, y: 2 }],
          trigger: { on: 'round', round: 5 },
        },
      ],
      playerPlacement: [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 5 }, { x: 2, y: 5 }],
      // Scale is the fine lever here (round count is the coarse one, already
      // set at 7). Walk: hard 1.39 -> 68% · 1.52 -> 43-46% across two runs.
      // 1.52 parked the cell ON the 45% band edge, where ±7pt noise flips
      // PASS/FAIL run to run — centre it instead (CAMPAIGNS.md: tune to the
      // band MIDPOINT, never an edge). nightmare 1.63 -> 54%, 1.95 -> 26-29%.
      hpScaleOverride: { easy: 1.13, medium: 1.38, hard: 1.46, nightmare: 1.95 },
    },

    // e4 — The Cave Mouth (escape). A rock wall with a two-tile throat; the
    // immovable bruiser plugs half of it. The win is getting THROUGH, not
    // killing him — which is what the story always said and the mechanics never
    // did. Six exit tiles so a full party isn't puzzle-locked out of its own win.
    e4: {
      level: 4,
      terrain: {
        theme: 'cave',
        blocked: [
          { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 },
          { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 },
        ],
      },
      objective: {
        text: 'Push past the cave mouth — get everyone through',
        win: [{
          kind: 'units_at_tiles', scope: 'all',
          tiles: [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }],
        }],
      },
      enemies: ['orc_bruiser', 'goblin_scrapper', 'goblin_scrapper', 'goblin_slinger'],
      // Slinger moved from (6,3) to (6,6): behind the wall line, so it threatens
      // the exit run rather than free-firing the whole approach. Ranged sat at
      // 14% on hard (floor 15) when it could contest the march.
      enemyPlacement: [{ x: 5, y: 3 }, { x: 6, y: 1 }, { x: 6, y: 4 }, { x: 6, y: 6 }],
      // Walking the party to the far edge was nearly free (90-97%). Committing
      // to the throat now springs the ambush the story always described: two
      // scrappers drop in BEHIND, which is what makes an all-must-escape win
      // bite — the straggler is the one who gets caught.
      waves: [
        {
          enemies: ['goblin_scrapper', 'goblin_scrapper', 'wolfpelt_runner'],
          placement: [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 2, y: 4 }],
          trigger: { on: 'door', tile: { x: 5, y: 4 } },
        },
      ],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      // Escape is weakly HP-sensitive (you are not killing them), so these run
      // high relative to a kill-all encounter's scales — but 1.30/1.60 overshot
      // (medium 84% -> 59%, hard 80% -> 40%), so they are not weakly sensitive
      // either. Split the difference.
      // ⚠ medium is the stubborn cell: 1.10 -> 63-68% (melee 54-59), but easing
      // to 1.00 -> 64% with melee at 31%, i.e. UNDER the 35 wall. Easing the
      // encounter hurt melee because a slacker escape lets the enemy pack chase
      // the party through the throat instead of dying at it. 1.10 is the right
      // rung; the mean rides the band's lower edge and occasionally reads 1-2
      // points under on a noisy run. Documented rather than chased.
      hpScaleOverride: { easy: 0.88, medium: 1.10, hard: 1.28, nightmare: 1.70 },
    },

    // e5 — The Lantern Court (boss). Kill-target: only Grubnash must fall.
    // The shaman still heals him, so ignoring her is a real gamble rather than
    // a scripted "kill the healer first" — that telegraph is retired.
    e5: {
      level: 5,
      terrain: {
        theme: 'cave',
        blocked: [{ x: 3, y: 3 }, { x: 3, y: 5 }, { x: 6, y: 6 }, { x: 2, y: 1 }],
      },
      objective: {
        text: 'Bring down King Grubnash',
        win: [{ kind: 'units_dead', enemyKeys: ['king_grubnash'] }],
      },
      enemies: ['king_grubnash', 'moss_shaman', 'goblin_scrapper', 'goblin_scrapper'],
      enemyPlacement: [{ x: 5, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 5 }, { x: 4, y: 2 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      // Calibration walk (medium): 0.78 -> 86% · 0.88 -> 88% · 0.95 -> 54%.
      // Flat then a cliff — the King's effective HP crosses a focus-fire
      // breakpoint between 0.88 and 0.95. Park just inside it.
      hpScaleOverride: { easy: 0.72, medium: 0.90, hard: 0.92, nightmare: 1.13 },
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
      preText: 'The pack bursts from the trees — goblins in wolf pelts, sprinting on all fours, coming from three directions at once. The pelts have button eyes sewn on. The daggers are real.\n\nAnd they keep howling for friends. You will not clear this hollow, {mainName} — you only have to still be standing when they lose their nerve. Put the trees at your back and HOLD.',
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
      preText: 'The snoring stops. An orc bruiser fills the cave mouth like a boulder with shoulders, and he does not intend to move — so do not waste the evening trying to make him.\n\nThe gap beside him is barely wide enough for one. Scrappers slip along the walls to catch you in the squeeze. Get the whole party through to the far side, {mainName}, and let the doorman keep his door.',
      next: 'lv5',
    },
    lv5: { kind: 'levelup', level: 5, next: 'court_approach' },
    court_approach: {
      kind: 'story',
      text: 'Beyond the bruiser\'s post, the cave opens into a moss-lit court. There, atop a throne of stolen chairs, sits King Grubnash — an orc twice the size of his goblin subjects, wearing the Harvest Lantern as a crown, very pleased with himself.\n\n"MINE," he announces. "Prettiest hat in the Bramblewood."\n\n"{mainName}," whispers your companion, "it is the crown we came for, not the court. Drop the King and the rest of this lot will scatter — but mind the shaman by the throne. Every wound you open, she closes."',
      next: 'e5_pre',
    },
    e5_pre: {
      kind: 'encounter', encounter: 'e5',
      preText: 'King Grubnash rises, lantern-crown blazing. His moss shaman begins to chant, ready to knit the King\'s wounds closed.\n\nOnly the King has to fall. Silence the shaman first and take your time, or throw everything at the throne and hope he drops before she can mend him — your call, {mainName}.',
      next: 'finale',
    },
    finale: {
      kind: 'end',
      text: 'The lantern is heavier than it looks — and warmer. As you carry it back through the village gates, every window lights up, one by one.\n\n{if helpedMiller}The miller\'s family leads the first dance in your honor, {mainName}.{else}The pastries you recovered are served at the head table, only slightly dented, {mainName}.{/if}\n\nKing Grubnash, thoroughly dethroned, was last seen wearing a bucket.\n\nTHE LANTERN OF ELMSWORTH — COMPLETE',
    },
  },
};
