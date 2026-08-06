/**
 * moonberry.ts — "The Moonberry Masquerade".
 *
 * On the brightest night of the year, every festival lantern vanishes — and the
 * thieves leave invitations behind. Reworked from a ChatGPT "Act One" draft into a
 * complete 5-encounter arc (boss finale) under current standards.
 *
 * Art constraint rework: the elegant "Midnight Company" is now a travelling troupe of
 * MASKED GOBLIN AND ORC performers (goblins on rogue/ranger/sorcerer/warlock chassis;
 * orcs on the fighter/cleric chassis) — the velvet, masks, and stage-names are theirs,
 * but the art shows goblins and orcs. Free teaser for now.
 *
 * The twist: the troupe's own First Moon Lantern was stolen first, and a goblin
 * schemer called the Night Cartographer sent both sides into conflict on purpose.
 */
import { CampaignDefinition } from './types.js';

export const moonberryCampaign: CampaignDefinition = {
  slug: 'moonberry',
  title: 'The Moonberry Masquerade',
  blurb: 'On the brightest night of the year, every festival lantern vanishes — and the thieves leave invitations behind.',
  enemyFactionName: 'Masquers',
  free: true,
  startNode: 'intro',
  // TODO(skins): no skin system yet — unlock recorded in campaign meta locally.
  rewardSkin: { classSlug: 'rogue', skinId: 'moonberry_masquer', name: 'Moonberry Masquer' },

  achievements: [
    { slug: 'complete_easy',      name: 'Lantern Lighter',   description: 'Complete The Moonberry Masquerade on Easy.' },
    { slug: 'complete_medium',    name: 'Keeper of the Revel', description: 'Complete The Moonberry Masquerade on Medium.' },
    { slug: 'complete_hard',      name: 'Midnight Investigator', description: 'Complete The Moonberry Masquerade on Hard.' },
    { slug: 'complete_nightmare', name: 'Guest of the Impossible Ball', description: 'Complete The Moonberry Masquerade on Nightmare — unlocks the Moonberry Masquer skin.' },
    { slug: 'confetti_detective', name: 'A Very Sparkly Trail', description: 'Follow the silver confetti left by the lantern thieves.' },
    { slug: 'dragon_interviewer', name: 'Question the Dragon', description: 'Interview the parade dragon as an official witness.' },
    { slug: 'lantern_lifeguard',  name: 'Barge to the Rescue', description: 'Save the festival lantern barge from drifting downriver.' },
    { slug: 'roof_runner',        name: 'Above the Awning',   description: 'Keep pace with the masked courier across the rooftops.' },
  ],

  enemies: {
    // ── Goblin performers (rogue/ranger/sorcerer/warlock chassis → goblin art) ──
    lantern_lifter: {
      // Nimble goblin thieves in half-masks; the troupe's stagehands.
      baseClass: 'rogue', name: 'Lantern Lifter',
      maxHealth: 34, armorClass: 8, movementRange: 5,
      nightmare: { acBonus: 1 },
    },
    mooncap_marksman: {
      baseClass: 'ranger', name: 'Mooncap Marksman',
      maxHealth: 38, armorClass: 10, specialSlug: 'longshot',
      nightmare: { acBonus: 1 },
    },
    ember_juggler: {
      baseClass: 'sorcerer', name: 'Ember Juggler',
      maxHealth: 36, armorClass: 9, specialSlug: 'flame_jet',
      nightmare: { passiveFlags: ['warded'] },
    },
    moonhook_caller: {
      baseClass: 'warlock', name: 'Moonhook Caller',
      maxHealth: 34, armorClass: 10, specialSlug: 'grasp',
      nightmare: { acBonus: 1 },
    },
    starstep_duelist: {
      baseClass: 'rogue', name: 'Starstep Duelist',
      maxHealth: 36, armorClass: 9, specialSlug: 'expose',
      nightmare: { hpBonus: 5 },
    },
    night_cartographer: {
      // BOSS. A masked goblin mapmaker who drew everyone into this mess on purpose.
      baseClass: 'warlock', name: 'The Night Cartographer',
      maxHealth: 80, armorClass: 10, specialSlug: 'grasp',
      passiveFlags: ['immovable'],
      nightmare: { hpBonus: 6 },
    },
    // ── Orc performers (fighter/cleric chassis → orc art) ──
    velvet_gate_guard: {
      // A broad orc doorman in a velvet coat two sizes too small for the drama of it.
      baseClass: 'fighter', name: 'Velvet Gate Guard',
      maxHealth: 47, armorClass: 12, specialSlug: 'shield_bash',
      nightmare: { hpBonus: 6, passiveFlags: ['immovable'] },
    },
    silverthread_mender: {
      // Orc costume-mender who patches performers AND wounds; keeps the troupe on stage.
      baseClass: 'cleric', name: 'Silverthread Mender',
      maxHealth: 46, armorClass: 11, specialSlug: 'ward',
      nightmare: { hpBonus: 4 },
    },
    masque_bruiser: {
      // The troupe's immovable "statue act" — an orc who simply will not be moved.
      baseClass: 'fighter', name: 'Masque Bruiser',
      maxHealth: 62, armorClass: 12,
      passiveFlags: ['immovable'],
      nightmare: { hpBonus: 6 },
    },
  },

  encounters: {
    // e1 — Lantern Alley: a softened two-and-a-half goblin pincer; high move, no specials.
    e1: {
      level: 1,
      enemies: ['lantern_lifter', 'lantern_lifter', 'lantern_lifter'],
      // Enemies backed off one tile. Same shape as lantern e4 — at a 0.8-tile gap the
      // ranged party had no standoff at all (10% at hard). Spread 33 -> 13 at medium.
      enemyPlacement: [{ x: 7, y: 2 }, { x: 0, y: 5 }, { x: 7, y: 5 }],
      playerPlacement: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }],
      noSpecials: true,
      // Tutorial softening; easy allowed above band (near-certain first win).
      hpScaleOverride: { easy: 0.98, medium: 1.24, hard: 1.28, nightmare: 1.35 },
    },
    // e2 — The Silver Arch: an immovable orc doorman, a goblin fire act, an orc mender.
    e2: {
      level: 2,
      enemies: ['velvet_gate_guard', 'ember_juggler', 'silverthread_mender'],
      enemyPlacement: [{ x: 5, y: 3 }, { x: 6, y: 1 }, { x: 6, y: 5 }],
      playerPlacement: [{ x: 1, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      hpScaleOverride: { easy: 1.26, medium: 1.43, hard: 1.57, nightmare: 1.50 },
    },
    // e3 — Midnight Ferry Stage: ranged pressure at the corners, forced movement, a healer.
    e3: {
      level: 3,
      enemies: ['mooncap_marksman', 'moonhook_caller', 'starstep_duelist', 'silverthread_mender'],
      enemyPlacement: [{ x: 1, y: 1 }, { x: 6, y: 1 }, { x: 3, y: 3 }, { x: 4, y: 1 }],
      playerPlacement: [{ x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }],
      hpScaleOverride: { easy: 0.73, medium: 0.84, hard: 1.02, nightmare: 1.11 },
    },
    // e4 — The Unmarked Road: an immovable orc "statue" gates a lane, goblins harry it.
    e4: {
      level: 4,
      enemies: ['masque_bruiser', 'ember_juggler', 'mooncap_marksman', 'lantern_lifter'],
      enemyPlacement: [{ x: 4, y: 2 }, { x: 6, y: 1 }, { x: 2, y: 1 }, { x: 5, y: 4 }],
      playerPlacement: [{ x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }],
      hpScaleOverride: { easy: 1.06, medium: 1.13, hard: 1.30, nightmare: 1.20 },
    },
    // e5 — The Cartographer's Stage: the boss goblin, his orc mender, and two performers.
    e5: {
      level: 5,
      enemies: ['night_cartographer', 'silverthread_mender', 'starstep_duelist', 'mooncap_marksman'],
      enemyPlacement: [{ x: 6, y: 3 }, { x: 7, y: 2 }, { x: 6, y: 5 }, { x: 5, y: 1 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      hpScaleOverride: { easy: 0.71, medium: 0.87, hard: 0.93, nightmare: 1.06 },
    },
  },

  nodes: {
    intro: {
      kind: 'story',
      text: 'Moonberry Eve is supposed to begin when the first silver lantern is lit. Instead, {mainName} watches the master of ceremonies pull a velvet cord and illuminate absolutely nothing.\n\nAcross the square, three hundred lantern hooks swing empty. Even the great moonberry lantern above the fountain is gone. In its place hangs a black envelope in curling silver ink: TO THE HERO WHO NOTICES THESE THINGS.',
      next: 'invitation',
    },
    invitation: {
      kind: 'story',
      text: '{mainName} opens the envelope while Festival Steward Petal Quill peers over one shoulder. Inside: a masquerade invitation, a pinch of silver confetti, and a note — Your moonlight has been borrowed for an urgent performance. Kindly do not pursue unless dressed appropriately.\n\nPetal eyes the party\'s armor and weapons. "Appropriate enough," she decides. A crash in Lantern Alley suggests the borrowers have not gone far.',
      next: 'lantern_alley_node',
    },
    lantern_alley_node: {
      kind: 'encounter', encounter: 'e1',
      preText: 'Two masked goblins dart between stacks of empty lantern-crates — one ahead, one behind — with a third scrambling off a crate-pile. "We were promised a DRAMATIC escape!" one complains. "This is becoming a dramatic DELAY!" answers another as {mainName} closes in.',
      next: 'lv2',
    },
    lv2: { kind: 'levelup', level: 2, next: 'first_clue' },
    first_clue: {
      kind: 'story',
      text: 'The masked lifters flee without their satchel. Inside, {mainName} finds a coil of silver cord, a map marked with tiny crescent moons, and a rehearsal schedule for a troupe called the Midnight Company.\n\nThe next mark is the Silver Arch at the edge of town. A sparkling trail leads that way — but the festival\'s cloth parade-dragon also claims to have seen everything, and its four operators all start talking at once from inside the costume.',
      next: 'fork_one',
    },
    fork_one: {
      kind: 'choice',
      text: 'How should {mainName} investigate the route to the Silver Arch?',
      choices: [
        { label: 'Follow the silver confetti before the wind scatters it.', setFlags: { followedConfetti: true }, grantAchievement: 'confetti_detective', next: 'arch_by_trail' },
        { label: 'Take an official statement from the parade dragon.', setFlags: { followedConfetti: false }, grantAchievement: 'dragon_interviewer', next: 'arch_by_witness' },
      ],
    },
    // Diamond: both paths are the SAME Silver Arch fight, different flavor.
    arch_by_trail: {
      kind: 'encounter', encounter: 'e2',
      preText: 'The confetti leads {mainName} to the back of the Silver Arch, close enough to hear a velvet-clad orc doorman mutter, "Remember: mysterious, intimidating, and NO setting the curtains on fire." A goblin ember-juggler immediately sets a curtain on fire. The gate swings shut.',
      next: 'after_arch',
    },
    arch_by_witness: {
      kind: 'encounter', encounter: 'e2',
      preText: 'After four contradictory dragon-head accounts, {mainName} learns the troupe carried the lanterns beneath the Silver Arch toward the river. The party arrives as a velvet-clad orc booms, "No admission without masks!" Petal Quill\'s emergency paper masks do not survive inspection.',
      next: 'after_arch',
    },
    after_arch: {
      kind: 'story',
      text: '{if followedConfetti}Because {mainName} listened at the gate, the party knows the Midnight Company is building a floating stage at Moonberry Ferry.{else}Because {mainName} questioned every part of the dragon, the tail-operator recalls the thieves mentioning a floating stage at Moonberry Ferry.{/if}\n\nBehind the arch lies something stranger than stolen lanterns: a shattered lamp of dark-blue glass bearing the troupe\'s own crest. Its wick is cold. A label on the base reads FIRST MOON LANTERN — DO NOT LOSE AGAIN.',
      next: 'lv3',
    },
    lv3: { kind: 'levelup', level: 3, next: 'river_road' },
    river_road: {
      kind: 'story',
      text: 'The road to Moonberry Ferry runs beside the festival canal. Ahead, a masked goblin courier bounds across striped awnings with a silver message-case under one arm. At the same moment, the unmanned lantern-barge slips its rope and drifts toward the river, loaded with enough candles to make an extremely festive disaster.\n\nPetal turns to {mainName}. "The courier has answers. The barge has poor steering."',
      next: 'fork_two',
    },
    fork_two: {
      kind: 'choice',
      text: '{mainName} can personally lead only one effort before the Midnight Company reaches the ferry stage.',
      choices: [
        { label: 'Catch the lantern-barge and guide it safely to shore.', setFlags: { savedBarge: true }, grantAchievement: 'lantern_lifeguard', next: 'ferry_from_barge' },
        { label: 'Follow the courier across the market rooftops.', setFlags: { savedBarge: false }, grantAchievement: 'roof_runner', next: 'ferry_from_roofs' },
      ],
    },
    ferry_from_barge: {
      kind: 'encounter', encounter: 'e3',
      preText: 'The barge reaches shore safely, but the delay lets the Midnight Company raise its curtains. A goblin Moonhook Caller sweeps a hand toward the water, ready to drag intruders out of formation, while an orc mender shields the performers. "Places!" cries the duelist. "Our unexpected guests have arrived!"',
      next: 'after_ferry',
    },
    ferry_from_roofs: {
      kind: 'encounter', encounter: 'e3',
      preText: '{mainName} chases the courier into the rigging above the ferry stage, forcing the troupe to begin before it is ready. Below, a goblin Moonhook Caller reaches for the party while a marksman covers the upper deck. Downstream, festival workers cheer as they wrestle the runaway barge to shore.',
      next: 'after_ferry',
    },
    after_ferry: {
      kind: 'story',
      text: 'When the last performer lowers their weapon, the stage manager — a goblin in a crescent mask — bows low. "We DID borrow your lanterns," she tells {mainName}. "Our First Moon Lantern was stolen three nights ago. Then someone sent us a map promising that Moonberry light could reveal the thief\'s trail."\n\nShe opens the courier\'s silver case. A blank sheet slowly fills with ink beneath the recovered lantern-glow: a road winding north into a patch of night where no town is marked. At the bottom, a signature — THE NIGHT CARTOGRAPHER.\n\n{if savedBarge}Petal arrives aboard the rescued barge, at the bow, as though this had always been the plan.{else}Petal arrives wearing part of an awning as a cape. "The barge is safe," she reports. "The awning has entered public service."{/if}',
      next: 'lv4',
    },
    lv4: { kind: 'levelup', level: 4, next: 'north_road' },
    north_road: {
      kind: 'story',
      text: 'The unmarked road climbs north until the festival lights are a smudge behind {mainName}. Where the map shows only blank night, a striped stage-wagon blocks the way — and atop it, an orc in a marble mask stands so still you could hang a lantern on him.\n\n"The statue act," murmurs Petal. "He is very committed."',
      next: 'road_node',
    },
    road_node: {
      kind: 'encounter', encounter: 'e4',
      preText: 'The Masque Bruiser does not move, does not blink, and does not intend to let anyone pass. Goblin performers spill from the wagon to harry {mainName} from the flanks — a juggler flinging fire, a marksman on the roof. Break the roadblock!',
      next: 'lv5',
    },
    lv5: { kind: 'levelup', level: 5, next: 'stage_approach' },
    stage_approach: {
      kind: 'story',
      text: 'Beyond the wagon, a hidden hollow opens into a moonlit stage strung with every stolen lantern in the county — and the troupe\'s own First Moon Lantern glowing at its center.\n\nBefore it stands a small goblin in a coat sewn from maps, quill in hand. "Ah — the hero who notices things," says the Night Cartographer, delighted. "I stole one lantern, drew a few helpful maps, and set an entire festival chasing its own tail. Marvelous theatre, {mainName}. You are my finest audience."\n\n"His mender keeps him standing," warns Petal. "Cut the thread first."',
      next: 'boss_node',
    },
    boss_node: {
      kind: 'encounter', encounter: 'e5',
      preText: 'The Night Cartographer folds his map-coat like a cloak and will not be budged from his mark. His orc Silverthread Mender begins to chant while a Starstep Duelist and a Mooncap Marksman close the stage. Drop the mender, then take the mapmaker\'s final bow!',
      next: 'finale',
    },
    finale: {
      kind: 'end',
      text: 'The Night Cartographer sits down amid his fallen maps and sighs like an artist whose show has closed early. "Ah, well. Every good map needs an edge."\n\nEvery borrowed lantern goes home before midnight — several now wearing tiny velvet bows. The Midnight Company, forgiven and freshly employed, lights the whole square at once, and Moonberry Eve begins hours late and twice as bright.\n\n{if savedBarge}Petal leads the first dance from the deck of the rescued barge, {mainName}.{else}Petal leads the first dance in her awning-cape, which the crowd assumes is a costume, {mainName}.{/if}\n\nThe recovered maps, it turns out, all lead to more unmarked roads. A story for another night.\n\nTHE MOONBERRY MASQUERADE — COMPLETE',
    },
  },
};
