/**
 * goblinopolis.ts — "The Bell of Goblinopolis".
 *
 * A stolen town bell, a trail of blue ribbons, and a goblin city that insists the
 * theft was perfectly legal. Reworked from a ChatGPT "Act One" draft into a complete
 * 5-encounter arc (boss finale) under current standards: all enemies render as
 * goblins (ranger/rogue/sorcerer chassis) or orcs (barbarian/cleric/fighter chassis).
 * Goblinopolis is a goblin city with orc muscle for its guards and brutes — the art
 * constraint and the story reinforce each other. Free teaser for now.
 *
 * The twist: neither town stole from the other. An orc warboss swapped both bells to
 * start a war he could rule the ruins of.
 */
import { CampaignDefinition } from './types.js';

export const goblinopolisCampaign: CampaignDefinition = {
  slug: 'goblinopolis',
  title: 'The Bell of Goblinopolis',
  blurb: 'A stolen town bell, a trail of blue ribbons, and a goblin city that insists the theft was perfectly legal.',
  enemyFactionName: 'Bluecaps',
  free: true,
  startNode: 'intro',
  // TODO(skins): no skin system yet — unlock recorded in campaign meta locally.
  rewardSkin: { classSlug: 'ranger', skinId: 'bluecap_pathfinder', name: 'Bluecap Pathfinder' },

  achievements: [
    { slug: 'complete_easy',      name: 'Bell-Road Beginner', description: 'Complete The Bell of Goblinopolis on Easy.' },
    { slug: 'complete_medium',    name: 'Buckbridge Deputy',   description: 'Complete The Bell of Goblinopolis on Medium.' },
    { slug: 'complete_hard',      name: 'Goblinopolis Envoy',  description: 'Complete The Bell of Goblinopolis on Hard.' },
    { slug: 'complete_nightmare', name: 'Ringer of the Impossible Bell', description: 'Complete The Bell of Goblinopolis on Nightmare — unlocks the Bluecap Pathfinder skin.' },
    { slug: 'ribbon_reader',  name: 'Follow the Blue',    description: 'Track the goblin band by its carefully tied blue ribbons.' },
    { slug: 'polite_pursuit', name: 'Properly Announced', description: 'Begin a goblin pursuit with excellent manners and impressive volume.' },
    { slug: 'cart_before_horse', name: 'Cart Before Horse', description: 'Stop to rescue Dave Tanner\'s runaway supply cart.' },
    { slug: 'signal_spotter', name: 'Eyes on the Hill',   description: 'Keep sight of the goblins\' signal runner through the river fog.' },
  ],

  enemies: {
    // ── Goblins (ranger/rogue/sorcerer chassis → goblin art) ──
    bluecap_scout: {
      baseClass: 'ranger', name: 'Bluecap Scout',
      maxHealth: 36, armorClass: 10,
      nightmare: { acBonus: 1 },
    },
    bellrunner: {
      // A goblin courier who does nothing but sprint with stolen goods. Fast,
      // and fragile RELATIVE to the orcs (47-62) — but not one-shot fragile:
      // at 35 HP he died to whoever reached him first, which made e3's clock
      // the only difficulty lever, and a clock is one number shared by all four
      // difficulties. At 52 he takes a focused turn or two, so hpScale bites.
      baseClass: 'rogue', name: 'Bellrunner',
      maxHealth: 52, armorClass: 8, movementRange: 5,
      nightmare: { acBonus: 1 },
    },
    sparkcap_slinger: {
      baseClass: 'sorcerer', name: 'Sparkcap Slinger',
      maxHealth: 36, armorClass: 9, specialSlug: 'ignite',
      nightmare: { passiveFlags: ['warded'] },
    },
    bluecap_pathfinder: {
      baseClass: 'ranger', name: 'Bluecap Pathfinder',
      maxHealth: 40, armorClass: 11, specialSlug: 'pinning',
      nightmare: { acBonus: 1 },
    },
    // ── Orcs (barbarian/cleric/fighter chassis → orc art) ──
    // Goblinopolis hires orcs as its heavy muscle; blue sashes mark the city's service.
    kettlehelm_orc: {
      baseClass: 'fighter', name: 'Kettlehelm Orc',
      maxHealth: 47, armorClass: 12, specialSlug: 'shield_bash',
      nightmare: { hpBonus: 6, passiveFlags: ['immovable'] },
    },
    mudboot_bruiser: {
      baseClass: 'barbarian', name: 'Mudboot Bruiser',
      maxHealth: 46, armorClass: 9, specialSlug: 'shockwave',
      nightmare: { hpBonus: 5 },
    },
    patchcoat_mender: {
      // Orc field-medic in a coat of stitched-together sashes; keeps the brutes standing.
      baseClass: 'cleric', name: 'Patchcoat Mender',
      maxHealth: 46, armorClass: 11, specialSlug: 'heal',
      nightmare: { hpBonus: 4 },
    },
    ironbell_warden: {
      // The gate-brute of Goblinopolis — an immovable orc who guards the bell-arch.
      baseClass: 'fighter', name: 'Ironbell Warden',
      maxHealth: 62, armorClass: 12,
      passiveFlags: ['immovable'],
      nightmare: { hpBonus: 6 },
    },
    warboss_gurm: {
      // BOSS. A huge orc who swapped both towns' bells to start a war he could rule.
      // D2: as a KILL-TARGET the other three become ignorable, so he needs to
      // be a fight on his own (same lesson as Lantern's Grubnash, who was burst
      // down in 17 turns at 80 HP). The round-9 deadline is his differentiator —
      // no undying here, the clock is what stops you taking your time.
      baseClass: 'barbarian', name: 'Warboss Gurm',
      maxHealth: 105, armorClass: 10, specialSlug: 'shockwave',
      passiveFlags: ['immovable'],
      nightmare: { hpBonus: 8 },
    },
  },

  encounters: {
    // ═══ D2 RETROFIT (2026-08-17) ═══════════════════════════════════════════
    // Palette: e1 kill-all · e2 carve · e3 race · e4 rooms · e5 boss.
    // Five distinct types, none consecutive (CAMPAIGNS.md §8). Goblinopolis is
    // the DOORS/ROOMS + RACE showcase of the free three.
    // ════════════════════════════════════════════════════════════════════════

    // e1 — Bridge Ambush (kill-all). Tutorial: no terrain, no objective.
    e1: {
      level: 1,
      enemies: ['bluecap_scout', 'sparkcap_slinger', 'bluecap_scout'],
      enemyPlacement: [{ x: 7, y: 3 }, { x: 0, y: 5 }, { x: 7, y: 4 }],
      playerPlacement: [{ x: 2, y: 3 }, { x: 3, y: 3 }, { x: 2, y: 4 }, { x: 3, y: 4 }],
      noSpecials: true,
      hpScaleOverride: { easy: 1.13, medium: 1.46, hard: 1.54, nightmare: 1.76 },
    },

    // e2 — Blue-Ribbon Tollgate (carve). A barricade line with the toll gap on
    // the direct lane: melee walks straight through, ranged fights for sight.
    // Cover deliberately sits ON THE APPROACH, never screening the slinger —
    // the lesson that cost three passes on Lantern e2.
    e2: {
      level: 2,
      terrain: {
        blocked: [{ x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 5 }, { x: 3, y: 6 }],
      },
      enemies: ['kettlehelm_orc', 'mudboot_bruiser', 'sparkcap_slinger'],
      enemyPlacement: [{ x: 6, y: 2 }, { x: 4, y: 3 }, { x: 6, y: 5 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      hpScaleOverride: { easy: 1.08, medium: 1.30, hard: 1.50, nightmare: 1.50 },
    },

    // e3 — Amrun Ferry Relay (race). The Bellrunner is carrying the clapper to
    // the ferry: drop HIM before it casts off. Three guards exist only to cost
    // you the turns you do not have.
    e3: {
      level: 3,
      objective: {
        text: 'Clear the relay before the ferry casts off (11 rounds)',
        win: [{ kind: 'all_enemies_dead' }],
        loss: [{ kind: 'round_reached', round: 11 }],
      },
      // No terrain: the stall wall existed only to deny a shooting lane to the
      // courier, which the new win condition makes moot — and it taxed melee's
      // approach for nothing. Open ground, tight clock.
      enemies: ['bellrunner', 'bluecap_pathfinder', 'kettlehelm_orc', 'patchcoat_mender'],
      enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 5 }, { x: 4, y: 3 }, { x: 5, y: 4 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 4 }],
      // ⚠ A kill-all ON A TIGHT CLOCK is chaotic to tune. Enemy HP converts
      // directly into rounds-to-clear, so clock and scale multiply, and cells
      // sitting near the "can we finish in time" threshold flip in bulk:
      //   8 rounds: 0.73 -> 81% · 0.93 -> 56% · 1.10 -> 16% · 1.30 -> 0.2%
      //   9 rounds: easy 70% BELOW medium 75%, and 0.98 -> 54% vs 0.99 -> 25%
      // — a 28-point swing on 0.01 of scale, plus non-monotonic difficulty.
      // Resolution: make the clock GENEROUS (11 rounds) so it catches only
      // genuinely slow parties, and let hpScale carry difficulty the normal
      // way. The deadline stays a real pressure the objective text shapes play
      // around, without being the thing that decides most matches.
      // Interpolated from measured points on the 11-round clock:
      //   0.85 -> 88% · 1.10 -> 37% · 1.35 -> 8% · 1.55 -> 0.5%
      // (~50 points per 0.25 — still steeper than an untimed encounter.)
      // NOTE nightmare sits BELOW hard on purpose: every enemy here carries a
      // `nightmare` block (acBonus / hpBonus / warded), and measurement showed
      // those alone are worth ~28 points (hard 0.98 -> 54% vs nightmare
      // 0.99 -> 25%). The scale must give that back.
      hpScaleOverride: { easy: 0.85, medium: 0.93, hard: 1.01, nightmare: 0.97 },
    },

    // e4 — The Bell-Arch (rooms). THE flagship: the gate is room 1, the city
    // behind it is room 2. Clear the arch, step through the door, and the board
    // re-carves with the party entering from the gate edge — HP, cooldowns and
    // the round counter all carry across.
    e4: {
      level: 4,
      rooms: [
        {
          // Room 1: the arch itself. Wall stubs make it a gate, not a field.
          terrain: { blocked: [{ x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 5 }, { x: 5, y: 6 }] },
          enemies: ['ironbell_warden', 'sparkcap_slinger'],
          enemyPlacement: [{ x: 5, y: 3 }, { x: 6, y: 5 }],
          exitDoors: [{ x: 7, y: 3 }, { x: 7, y: 4 }],
          doorMode: 'on_clear',
        },
        {
          // Room 2: inside the ribbon-strung city. The party enters at the gate
          // edge and the garrison is already formed up.
          terrain: { blocked: [{ x: 3, y: 2 }, { x: 3, y: 5 }] },
          // Garrison size is a COARSE lever here — dropping this from 3 to 2
          // swung medium 53% -> 98%. Keep three and tune with hpScale; HP and
          // cooldowns carry across the door, so this room is fought with
          // whatever room 1 left the party.
          enemies: ['kettlehelm_orc', 'bellrunner', 'bluecap_scout'],
          enemyPlacement: [{ x: 6, y: 3 }, { x: 5, y: 5 }, { x: 6, y: 1 }],
          entryTiles: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
        },
      ],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      // Two-room attrition is harsher than the raw enemy count suggests, so
      // these run well below a single-room encounter's scales.
      hpScaleOverride: { easy: 0.73, medium: 0.78, hard: 0.90, nightmare: 1.00 },
    },

    // e5 — Gurm's War-Camp (boss, on a clock). Kill-target on Gurm, with the
    // story's own threat as the loss condition: he rings the last bell standing
    // and the war starts. Retires the boss+healer gate — the mender is a
    // problem you may solve or outrun, not a scripted prerequisite.
    e5: {
      level: 5,
      terrain: { blocked: [{ x: 3, y: 2 }, { x: 3, y: 5 }] },
      objective: {
        text: 'Bring down Warboss Gurm before he rings the bell (9 rounds)',
        win: [{ kind: 'units_dead', enemyKeys: ['warboss_gurm'] }],
        loss: [{ kind: 'round_reached', round: 9 }],
      },
      // Court pulled two tiles closer. At a 6-tile gap melee sat at 20-39%
      // (walled at easy/medium) while ranged plinked Gurm at 100% — start
      // distance is the dominant spread driver and a far start bricks melee.
      enemies: ['warboss_gurm', 'patchcoat_mender', 'kettlehelm_orc', 'bluecap_pathfinder'],
      enemyPlacement: [{ x: 4, y: 3 }, { x: 5, y: 2 }, { x: 4, y: 5 }, { x: 5, y: 1 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      hpScaleOverride: { easy: 0.85, medium: 1.00, hard: 1.17, nightmare: 1.18 },
    },
  },

  nodes: {
    intro: {
      kind: 'story',
      text: 'On the morning of Buckbridge\'s First Pancake Festival, {mainName} is woken by three sounds: a rooster, a crash, and Mayor Thaddeus Mumblebranch shouting, "Remain calm! I have misplaced the emergency!"\n\nThe mayor stands beneath the empty arch where the great Bridge Bell hung yesterday. A single blue ribbon flutters from the cut rope. Beyond the bridge, small figures hurry east beneath a wobbling brass shape.',
      next: 'bell_gone',
    },
    bell_gone: {
      kind: 'story',
      text: 'Dave Tanner points down the road with a wooden spoon. "Blue-sashed goblins," he tells {mainName}. "Very organized. One of them handed me a receipt."\n\nThe receipt reads: EMERGENCY BELL REQUISITION, FORM 17-B. At the bottom, in purple ink: Property required by Goblinopolis until the current alarming emergency is less alarming.',
      next: 'bridge_ambush_node',
    },
    bridge_ambush_node: {
      kind: 'encounter', encounter: 'e1',
      preText: 'Two goblin stragglers spring from opposite hedges. "No pursuit without a pursuit permit!" squeaks one. {mainName} has just enough time to wonder whether that is a real law before an arrow whizzes past and a crackle of sorcerer-fire answers from the other side.',
      next: 'lv2',
    },
    lv2: { kind: 'levelup', level: 2, next: 'first_clue' },
    first_clue: {
      kind: 'story',
      text: 'The goblins scramble off, leaving a map covered in arrows, tea stains, and notes like GOOD HIDING ROCK and BAD HIDING ROCK — CONTAINS BEES.\n\nA line of blue ribbons marks the east road. {mainName} also finds a message tube stamped with the seal of Goblinopolis. Whatever this theft is, it was planned.',
      next: 'fork_one',
    },
    fork_one: {
      kind: 'choice',
      text: 'The ribbons lead toward an abandoned tollhouse. How should {mainName} approach?',
      choices: [
        { label: 'Follow the ribbons quietly and study the trail.', setFlags: { followedRibbons: true }, grantAchievement: 'ribbon_reader', next: 'tollgate_quiet' },
        { label: 'March up openly and announce a peaceful pursuit.', setFlags: { followedRibbons: false }, grantAchievement: 'polite_pursuit', next: 'tollgate_loud' },
      ],
    },
    // Diamond: both paths are the SAME tollgate fight, different flavor.
    tollgate_quiet: {
      kind: 'encounter', encounter: 'e2',
      preText: 'Following the ribbons, {mainName} reaches the tollhouse unseen and overhears two hulking orcs arguing whether a stolen bell counts as "oversized luggage." Then a floorboard squeaks. Every blue sash turns at once.',
      next: 'after_tollgate',
    },
    tollgate_loud: {
      kind: 'encounter', encounter: 'e2',
      preText: '{mainName} calls out, "We would like our bell back, please!" The tollhouse goes silent. An orc guard licks a pencil, opens a ledger, and rumbles, "Request denied — insufficient please." The barricade drops.',
      next: 'after_tollgate',
    },
    after_tollgate: {
      kind: 'story',
      text: '{if followedRibbons}Because {mainName} listened before the fight, the party knows the bell is bound for a relay point at the River Amrun.{else}Because {mainName} announced the pursuit, a flustered orc bellows the destination while trying to sound mysterious: "You will NEVER catch us at the River Amrun relay point!"{/if}\n\nInside the tollhouse lies a splinter of painted wood shaped like part of a much larger bell. Someone replaced Goblinopolis\'s own alarm bell with a wooden fake.',
      next: 'lv3',
    },
    lv3: { kind: 'levelup', level: 3, next: 'road_to_amrun' },
    road_to_amrun: {
      kind: 'story',
      text: 'The road slopes toward the River Amrun. Ahead, a goblin signal-runner flashes a mirror from hilltop to hilltop. Behind {mainName}, Dave Tanner\'s supply cart comes rattling downhill with Dave clinging to the reins and shouting, "This is faster than I intended!"',
      next: 'fork_two',
    },
    fork_two: {
      kind: 'choice',
      text: 'There is time to help the cart or keep the signal-runner in sight — not both. Where does {mainName} lead the party first?',
      choices: [
        { label: 'Brace the runaway cart and get Dave safely off the hill.', setFlags: { savedWagon: true }, grantAchievement: 'cart_before_horse', next: 'ferry_from_cart' },
        { label: 'Race for the river before the signal-runner escapes.', setFlags: { savedWagon: false }, grantAchievement: 'signal_spotter', next: 'ferry_from_chase' },
      ],
    },
    ferry_from_cart: {
      kind: 'encounter', encounter: 'e3',
      preText: 'Dave\'s cart is safe, but the delay lets the goblins form ranks at the ferry winch. A patch-coated orc mender raises a healing chant while a goblin pathfinder takes aim across the water. "Hold the relay!" barks their captain. {mainName} charges the bank.',
      next: 'after_ferry',
    },
    ferry_from_chase: {
      kind: 'encounter', encounter: 'e3',
      preText: '{mainName} reaches the river in time to block the ferry, but the band snaps into a practiced formation — an orc mender guarding the rear, a goblin pathfinder covering the crossing. From the hill behind comes the distant sound of Dave Tanner discovering a haystack.',
      next: 'after_ferry',
    },
    after_ferry: {
      kind: 'story',
      text: 'The last guard lowers their weapon. From beneath the ferry dock, a young goblin clerk emerges holding the Bridge Bell\'s clapper in both hands.\n\n"We did take your bell," the clerk admits to {mainName}, "but only because ours was stolen first. Someone swapped the Grand Alarm of Goblinopolis for painted wood — and left a trail pointing at YOU. Same trick was played on Buckbridge. Somebody wants our towns at each other\'s throats."\n\n{if savedWagon}Dave arrives with an intact cart, three flattened pies, and a suggestion that everyone discuss this over lunch.{else}Dave arrives covered in hay. "Good news," he says. "The cart stopped. Bad news: it has joined a scarecrow."{/if}\n\nThe clerk points across the river, to Goblinopolis itself.',
      next: 'lv4',
    },
    lv4: { kind: 'levelup', level: 4, next: 'city_approach' },
    city_approach: {
      kind: 'story',
      text: 'Goblinopolis is a jumble of crooked towers and rope bridges, every window strung with blue ribbon. But word of the "bell thieves" has run ahead of {mainName}, and the great Bell-Arch at the gate is shut.\n\nBeneath it stands an orc the size of a doorway, arms folded, entirely unbothered.',
      next: 'gate_node',
    },
    gate_node: {
      kind: 'encounter', encounter: 'e4',
      preText: 'The Ironbell Warden plants himself under the arch like a boulder that learned to frown, and he does not intend to move. Goblin slingers scramble onto the ribbon-strung walls to pelt {mainName} from above. Break through the gate!',
      next: 'lv5',
    },
    lv5: { kind: 'levelup', level: 5, next: 'court_approach' },
    court_approach: {
      kind: 'story',
      text: 'Past the arch, the goblin clerk leads {mainName} to a war-camp pitched in the city\'s old bell-foundry — banners, drums, and BOTH stolen bells hung as trophies.\n\nAtop a heap of requisition forms sits Warboss Gurm, an orc so large the goblins keep a stepladder handy. "Two towns," he grins, "one lovely little war. And when they\'ve worn each other out, Gurm rings the last bell standing."\n\n"{mainName}," whispers the clerk, "his mender keeps him on his feet. Bring her down first, or Gurm won\'t fall."',
      next: 'boss_node',
    },
    boss_node: {
      kind: 'encounter', encounter: 'e5',
      preText: 'Gurm hefts a war-hammer made from a bell and a fencepost. His patchcoat mender begins to chant, ready to knit his wounds shut, while a Kettlehelm Orc and a Bluecap Pathfinder move to guard the flanks. Drop the mender, then the Warboss!',
      next: 'finale',
    },
    finale: {
      kind: 'end',
      text: 'Gurm sits down hard, blinks at the ceiling, and mutters, "...no war?" as the goblins cheerfully confiscate his stepladder.\n\nBoth bells go home. Goblinopolis rings its Grand Alarm just to prove it still can, Buckbridge answers with the Bridge Bell, and for one strange afternoon the two towns hold a shared festival of pancakes and extremely loud gratitude.\n\n{if savedWagon}Dave Tanner caters it from a fully recovered cart, {mainName}.{else}Dave Tanner caters it from a borrowed scarecrow, {mainName}, and insists the scarecrow gets a medal.{/if}\n\nMayor Mumblebranch\'s official thank-you arrives three days late and addressed to the wrong hero. Close enough.\n\nTHE BELL OF GOBLINOPOLIS — COMPLETE',
    },
  },
};
