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
  // rogue is lantern's goblin now (50101) — retargeted to sorcerer so all
  // four campaigns get a DISTINCT goblin chassis. '60101' = Set 1
  // Sorcerer-Goblin; renamed after the troupe's own Ember Juggler, an actual
  // sorcerer-chassis enemy in this campaign's cast.
  rewardSkin: { classSlug: 'sorcerer', skinId: '60101', name: 'Ember Juggler' },

  achievements: [
    { slug: 'complete_easy',      name: 'Lantern Lighter',   description: 'Complete The Moonberry Masquerade on Easy.' },
    { slug: 'complete_medium',    name: 'Keeper of the Revel', description: 'Complete The Moonberry Masquerade on Medium.' },
    { slug: 'complete_hard',      name: 'Midnight Investigator', description: 'Complete The Moonberry Masquerade on Hard.' },
    { slug: 'complete_nightmare', name: 'Guest of the Impossible Ball', description: 'Complete The Moonberry Masquerade on Nightmare — unlocks the Moonberry Masquer skin.' },
    { slug: 'confetti_detective', name: 'A Very Sparkly Trail', description: 'Follow the silver confetti left by the lantern thieves.' },
    { slug: 'dragon_interviewer', name: 'Question the Dragon', description: 'Interview the parade dragon as an official witness.' },
    { slug: 'lantern_lifeguard',  name: 'Barge to the Rescue', description: 'Save the festival lantern barge from drifting downriver.' },
    { slug: 'roof_runner',        name: 'Above the Awning',   description: 'Keep pace with the masked courier across the rooftops.' },
    // Battle goals (A7) — slug must match the encounter goal's slug.
    { slug: 'clean_opening',      name: 'Clean Opening',      description: 'Win the alley without losing anyone.' },
    { slug: 'quick_study',        name: 'Quick Study',        description: 'Open the Silver Arch by round 6.' },
    { slug: 'untouched_by_flame', name: 'Untouched by Flame', description: 'Win the ferry stage without the hero taking a scratch.' },
    { slug: 'everyone_home',      name: 'Everyone Home',      description: 'Reach the north road with the whole party still standing.' },
    { slug: 'final_bow',          name: 'The Final Bow',      description: 'Let the hero personally land the blow that ends the show.' },
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
      // D2: as a KILL-TARGET the other three are ignorable, so he needs his own
      // budget (Lantern's Grubnash was burst down in 17 turns at 80 HP). His
      // differentiator across the trilogy is `warded` — an opening shield that
      // eats the alpha strike, where Grubnash has `undying` and Gurm has a clock.
      baseClass: 'warlock', name: 'The Night Cartographer',
      maxHealth: 100, armorClass: 10, specialSlug: 'grasp',
      passiveFlags: ['immovable', 'warded'],
      nightmare: { hpBonus: 8 },
    },
    crescent_stalker: {
      // The escort hunter for e4, deliberately its OWN key: aiHints attach to a
      // DEFINITION, so hinting a shared key (lantern_lifter, say) would send
      // every instance on the board after the Stage Manager at once.
      // Tuned as the escort's difficulty dial. Hunter COUNT is binary (two is a
      // stroll, three walls ranged at 0-10%) and hpScale is inert on an escort,
      // so speed//bulk is what is left: move 5 closes on her a turn sooner.
      baseClass: 'rogue', name: 'Crescent Stalker',
      maxHealth: 38, armorClass: 9, movementRange: 5,
      aiHints: { priorityTarget: 'ally' },
      nightmare: { acBonus: 1 },
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
    // ═══ D2 RETROFIT (2026-08-17) ═══════════════════════════════════════════
    // Palette: e1 kill-all · e2 hold · e3 hazard · e4 escort · e5 boss.
    // Five distinct types, none consecutive (CAMPAIGNS.md §8). Moonberry is the
    // ESCORT + BUTTONS + BATTLE GOALS showcase, and `hazard` is its first use
    // anywhere in the trilogy.
    //
    // D1 must-fix #2 is addressed by DESIGN: e2 was bricked for ranged (10% on
    // hard vs a floor of 15) and out of band at EVERY difficulty, because an
    // immovable orc doorman had to be killed. As a `hold` he no longer does —
    // you open the arch by standing on its seals.
    // ════════════════════════════════════════════════════════════════════════

    // e1 — Lantern Alley (kill-all). Tutorial: no terrain, no objective.
    e1: {
      level: 1,
      enemies: ['lantern_lifter', 'lantern_lifter', 'lantern_lifter'],
      enemyPlacement: [{ x: 7, y: 2 }, { x: 0, y: 5 }, { x: 7, y: 5 }],
      playerPlacement: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }],
      noSpecials: true,
      goals: [
        { slug: 'clean_opening', name: 'Clean Opening', description: 'Win the alley without losing anyone.', check: { kind: 'no_party_deaths' } },
      ],
      // CALIBRATION (200 games/cell, run-to-run spread measured at 2-4 pts).
      // easy walk:  0.90->98 · 0.94->96 · 0.96->95 · 0.98->83  (parked 0.98)
      // hard walk:  1.24->76 · 1.29->66 · 1.30->37
      // ⚠ hard is CLIFF-LOCKED and is this campaign's one accepted miss.
      // The three lifters here are identical, so they share damage breakpoints
      // and the whole cell moves at once: there is no rung between 66 (1 pt over
      // the band top) and 37 (8 pts under the bottom). Parked on 1.29, riding the
      // top edge, because overshooting the band low is the worse failure. Fixing
      // this properly needs a DESIGN change (differentiate the three lifters so
      // their breakpoints stagger), not another tuning pass — do not re-walk it.
      // nightmare walk: 1.28->56 · 1.32->30. Same shared-breakpoint cliff, but
      // here 1.32 lands cleanly mid-band. Do not nudge it 'to be safe'.
      // ⚠ TUTORIAL EXEMPTION at medium (owner standard, 2026-08-24). A
      // campaign's FIRST fight — level 1, no specials, party at -8 max HP —
      // is calibrated to ~85% mean / ~90% median with no walled archetype,
      // which reads TOO EASY against the general medium band on purpose. The
      // owner played unlitbeacon e1 at a measured-PASS 78% mean and called it
      // "about the level I would expect of HARD for a first encounter": win
      // rate does not measure GRIND, and every e1 in the catalog sat in that
      // same 71-78% zone. Survey (80 builds x 25 games/rung) and the rung
      // chosen here:
      //   1.26 -> 78% mean/84% median · 1.16 -> 80% · 1.08 -> 85%/92%, 0% walls
      hpScaleOverride: { easy: 0.98, medium: 1.08, hard: 1.29, nightmare: 1.32 },
    },

    // e2 — The Silver Arch (hold). Two moonstone seals, far apart: the arch
    // opens only while both are pressed at once, so the party must SPLIT. The
    // troupe's job is to stop you holding them — nobody has to die.
    e2: {
      level: 2,
      objective: {
        text: 'Press both moonstone seals at once to open the arch',
        win: [{
          kind: 'units_at_tiles', scope: 'any', simultaneous: true,
          tiles: [{ x: 6, y: 1 }, { x: 6, y: 6 }],
        }],
      },
      // The guard and the juggler STAND ON the seals. Unguarded marks made this
      // a stroll (96/94/96/78) — a tile can hold one unit, so an occupied seal
      // must be cleared or shoved off before the party can press it.
      enemies: ['velvet_gate_guard', 'ember_juggler', 'silverthread_mender'],
      enemyPlacement: [{ x: 6, y: 1 }, { x: 6, y: 6 }, { x: 5, y: 4 }],
      playerPlacement: [{ x: 1, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      goals: [
        { slug: 'quick_study', name: 'Quick Study', description: 'Open the Silver Arch by round 6.', check: { kind: 'win_by_round', round: 6 } },
      ],
      // A `hold` is gated by how long the seal-guards survive, so its scales run
      // far above a kill-all's. Walk: 1.00->97 · 1.30->78 · 1.70->47 · 2.00->29.
      hpScaleOverride: { easy: 1.30, medium: 1.45, hard: 1.68, nightmare: 2.55 },
    },

    // e3 — Midnight Ferry Stage (hazard). The Ember Juggler's fire is on the
    // BOARD, not just in his kit: burning boards carve the stage into lanes
    // that shift what "safe" means for both sides.
    e3: {
      level: 3,
      terrain: {
        hazards: [
          { pos: { x: 3, y: 2 }, type: 'fire' }, { pos: { x: 4, y: 3 }, type: 'fire' },
          { pos: { x: 4, y: 4 }, type: 'fire' }, { pos: { x: 3, y: 5 }, type: 'fire' },
        ],
      },
      // One marksman, not two: with a pair of them the burning lanes denied a
      // ranged party the repositioning it needs while melee simply closed —
      // ranged 9-13% against melee 87-92%, the reverse of the usual spread.
      enemies: ['mooncap_marksman', 'lantern_lifter', 'velvet_gate_guard', 'ember_juggler'],
      enemyPlacement: [{ x: 6, y: 1 }, { x: 1, y: 1 }, { x: 5, y: 3 }, { x: 5, y: 5 }],
      playerPlacement: [{ x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }],
      goals: [
        { slug: 'untouched_by_flame', name: 'Untouched by Flame', description: 'Win the ferry stage without the hero taking a scratch.', check: { kind: 'no_damage_to_main' } },
      ],
      hpScaleOverride: { easy: 0.65, medium: 0.76, hard: 0.92, nightmare: 0.75 },
    },

    // e4 — The Unmarked Road (escort). The stage manager knows the way north;
    // she cannot fight at all. Guardrails from ENCOUNTER_SPEC A5: she starts
    // BEHIND the party and out of round-1 reach, carries boss-tier HP because
    // she is defenseless, and the hunter that stalks her is its OWN enemy key
    // (aiHints attach per-definition — hinting a shared key turns the whole
    // board into hunters).
    e4: {
      level: 4,
      allies: {
        stage_manager: {
          name: 'The Stage Manager', baseClass: 'rogue',
          // Boss-tier HP per the A5 guardrail for a DEFENSELESS VIP. At 46 a
          // ranged party could not keep her alive (37-50% vs a 60 floor) —
          // they cannot body-block the hunter, so she has to take a hit.
          maxHealth: 62, abilities: [],
          // Short, direct route. A LONGER walk made this easier, not harder —
          // it drew her away from the opening cluster and bought the party turns
          // to screen. Exposure per tile beats total tiles walked.
          behavior: { mode: 'route', waypoints: [{ x: 3, y: 4 }, { x: 5, y: 4 }, { x: 7, y: 4 }] },
          placement: { x: 0, y: 4 },
        },
      },
      objective: {
        text: 'See the Stage Manager safely up the road',
        win: [{ kind: 'ally_at_tiles', allyKey: 'stage_manager', tiles: [{ x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }] }],
        loss: [{ kind: 'ally_dead', allyKey: 'stage_manager' }],
      },
      // ONE stalker. An escort is inherently melee-favouring — bodies can screen
      // the charge, arrows cannot — so hunter pressure is the sharpest possible
      // lever on the spread. Two stalkers walled ranged at 1-7%; one parked far
      // from the route (7,1) never engaged at all and the escort cruised at 96%.
      // (6,2) is the middle rung: on the route's flank, outside round-1 reach of
      // her start at (0,4).
      enemies: ['masque_bruiser', 'crescent_stalker', 'crescent_stalker', 'mooncap_marksman'],
      enemyPlacement: [{ x: 5, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 5 }, { x: 6, y: 1 }],
      playerPlacement: [{ x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 1, y: 4 }],
      goals: [
        { slug: 'everyone_home', name: 'Everyone Home', description: 'Reach the north road with the whole party still standing.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      // Walk with the final hunter build (move 5 / 38 HP, two of them):
      //   0.70 -> 87% · 1.00 -> 74% · 1.30 -> 41%
      hpScaleOverride: { easy: 0.64, medium: 1.10, hard: 1.23, nightmare: 1.80 },
    },

    // e5 — The Cartographer's Stage (boss). Kill-target: only the mapmaker has
    // to fall. His differentiator is `warded` — he opens the scene with a
    // shield that eats your alpha strike, so the burst that finished the other
    // two campaigns' bosses just breaks his guard instead.
    e5: {
      level: 5,
      objective: {
        text: 'Take the Night Cartographer\'s final bow',
        win: [{ kind: 'units_dead', enemyKeys: ['night_cartographer'] }],
      },
      enemies: ['night_cartographer', 'silverthread_mender', 'starstep_duelist', 'mooncap_marksman'],
      // Court pulled in: at a 5-tile gap melee sat at 52-58% on EASY (under the
      // 60 wall) while ranged hit 100%, because the boss pulls and kites. Start
      // distance is the SPREAD lever; hpScale only moved everyone together, and
      // no scale gave melee >=60 with a mean <=95.
      // Start distance here is a genuine two-sided tradeoff (the spread lever
      // cuts both ways): the court at x=5-6 starved MELEE (33% vs a 35 floor,
      // boss kites), at x=3-4 it starved RANGED (34%, no standoff). x=4-5 is
      // the balance point — all four means land in band there.
      enemyPlacement: [{ x: 4, y: 4 }, { x: 5, y: 3 }, { x: 4, y: 5 }, { x: 5, y: 1 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      goals: [
        { slug: 'final_bow', name: 'The Final Bow', description: 'Let the hero personally land the blow that ends the show.', check: { kind: 'killing_blow_by_main' } },
      ],
      // ⚠ easy is cliff-y: 0.58->100 · 0.63->100 · 0.66->84 (melee 52, under the
      // 60 wall) · 0.71->86. Melee runs low here by construction — the
      // Cartographer is a warlock who pulls and kites — so easy is parked where
      // melee clears the wall.
      hpScaleOverride: { easy: 0.78, medium: 0.90, hard: 1.20, nightmare: 1.28 },
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
      preText: 'The barge reaches shore safely, but the delay lets the Midnight Company raise its curtains. A velvet-clad Gate Guard shoulders to center stage while twin Mooncap Marksmen take up positions at either wing, and an Ember Juggler fans fire across the boards. "Places!" the guard calls. "Our unexpected guests have arrived!"',
      next: 'after_ferry',
    },
    ferry_from_roofs: {
      kind: 'encounter', encounter: 'e3',
      preText: '{mainName} chases the courier into the rigging above the ferry stage, forcing the troupe to begin before it is ready. Below, fire crackles as an Ember Juggler fans flames across the boards while twin Mooncap Marksmen take position at either wing and a Gate Guard looms at center stage. Downstream, festival workers cheer as they wrestle the runaway barge to shore.',
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
