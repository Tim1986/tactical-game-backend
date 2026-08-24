/**
 * unlitbeacon.ts — "The Unlit Beacon" (second PAID campaign). SHIPPED.
 *
 * BALANCED 2026-08-21: `RESULT: PASS` at 200 games/cell — 48/48 cells in band,
 * all party floors held, zero validation errors. Registered in index.ts, so
 * this is live content. Design notes: mobile/CAMPAIGN3_DESIGN.md.
 *
 * ⚠ Before retuning ANY encounter here, read backend/CAMPAIGN3_BALANCE_NOTES.md
 * — it records two traps that are invisible in the numbers: e11 sits above a
 * breakpoint cliff (every rung must stay >=0.89 or EASY becomes the hardest
 * difficulty), and e6's enemy placement is load-bearing because undertow tows
 * crossers toward the exit.
 *
 * Premise: the beacon above Coldgate Pass has burned every winter for four
 * hundred years, and everyone in Frostmere believes the light keeps the dead
 * under the glacier asleep. Three nights ago it went out — and the Winter Host
 * began to march. The truth is an inversion of the legend: the host was an army
 * ordered to hold the pass "until the beacon goes dark — dark means relief has
 * come; march home." The beacon was never a lullaby. It was a four-century lie
 * that kept discharged soldiers at a post nobody remembered, and the last
 * keeper, Maren Emberwright, chose to end it. The dead are not attacking.
 * They are marching HOME — and their war-road runs through where Frostmere now
 * stands.
 *
 * Tone: winter-lantern spooky-adventurous. The dead are disciplined, sad, and
 * somewhere to be — never feral, never gory. The villain-shaped things (a
 * poacher crew, the Adjutant, the Marshal) are obstacles with reasons, not
 * sadists; the Marshal is defeated in a formal, lawful challenge and falls
 * "to rest," saluting.
 *
 * Deliberate inversions of The Sealed Deep (same art roster, opposite feel):
 *   - Direction: SD descends INTO the source; this HOLDS a line, then climbs UP.
 *   - The dead: SD's are drawn/feral; these are drilled soldiers in formation.
 *   - The light: SD's door must stay sealed; here keeping the light on was the
 *     wrong thing all along — the dark is the mercy.
 *   - The boss: SD's Conductor never has to die; the Marshal is a true target —
 *     but with a second, bloodless win (seize the Standard).
 * Full distinctness audit vs CAMPAIGN_BEATS.md: CAMPAIGN3_DESIGN.md §2.
 *
 * Mechanics firsts (shopping CAMPAIGN_BEATS.md §6 unused inventory):
 *   `novel` palette type (campaign abilities: undertow, halt_the_line,
 *   muster_charge) · enemy blizzard/freeze/second_wind/longshot · `siphon` ·
 *   `priorityTarget:'main'` · ally mode `follow` + an ARMED escort ·
 *   `doorMode:'always'` · room `surprise` · wave trigger `on:'door'` ·
 *   a dual-win objective (kill the boss OR seize the standard) ·
 *   a campaign that ends on a CHOICE (epilogue: where the Host rests).
 */
import { CampaignDefinition } from './types.js';

// PASS 1 scales, read off measured calibration walks (100 games/party/rung on
// the 3 representative parties) rather than guessed. The objective-type table
// in CAMPAIGN_BALANCING.md supplied the STARTING point; every value below is
// where that encounter's own curve actually put the band midpoint, so they
// deviate from the type defaults wherever the curve said so.
//
// Two encounters are NOT settled and carry provisional values — see the
// per-encounter notes on e3 and e6, and CAMPAIGN3_BALANCE_NOTES.md.

export const unlitBeaconCampaign: CampaignDefinition = {
  slug: 'unlitbeacon',
  title: 'The Unlit Beacon',
  blurb: 'The beacon above Coldgate Pass went dark three nights ago, and the army under the glacier is marching home — straight through Frostmere.',
  enemyFactionName: 'The Winter Host',
  free: false,
  startNode: 'intro',
  // Owner call (2026-08-20): reward skins run through the goblin/orc series one
  // at a time. Claimed so far: rogue 50101 (Lantern), ranger 40101
  // (Goblinopolis), sorcerer 60101 (Moonberry), wizard 80101 (Sealed Deep).
  // Next up: Warlock-Goblin '70101' — the last goblin before the orc trio
  // (barbarian 10101, cleric 20101, fighter 30101) for future campaigns.
  rewardSkin: { classSlug: 'warlock', skinId: '70101', name: 'Goblin Hexer' },

  achievements: [
    { slug: 'complete_easy',      name: 'First Snow',          description: 'Complete The Unlit Beacon on Easy.' },
    { slug: 'complete_medium',    name: 'Kept the Road',       description: 'Complete The Unlit Beacon on Medium.' },
    { slug: 'complete_hard',      name: 'Voice of the Pass',   description: 'Complete The Unlit Beacon on Hard.' },
    { slug: 'complete_nightmare', name: 'The Standard-Taker',  description: 'Complete The Unlit Beacon on Nightmare — unlocks the campaign reward skin.' },
    // Fork achievements
    { slug: 'held_the_keep',      name: 'Shelter in Stone',    description: 'Shelter Frostmere\'s families in the keep.' },
    { slug: 'crossed_the_water',  name: 'The Long Column',     description: 'Send Frostmere\'s families across the bridges.' },
    { slug: 'keepers_oilskins',   name: 'The Keeper\'s Oilskins', description: 'Take the warded oilskins at the trailhead shrine.' },
    { slug: 'snowshoe_march',     name: 'Snowshoe March',      description: 'Take the snowshoes at the trailhead shrine.' },
    { slug: 'waited_for_dawn',    name: 'The Dawn Challenge',  description: 'Rest until dawn before answering the Host.' },
    { slug: 'armed_from_the_ice', name: 'Armed from the Ice',  description: 'Salvage shields from the old battlefield.' },
    { slug: 'laid_to_ice',        name: 'At Their Post',       description: 'Lay the Winter Host to rest inside the glacier.' },
    { slug: 'marched_home',       name: 'The Long Road Home',  description: 'Send the Winter Host down the long road to the old muster field.' },
    // Battle goals (A7) — slug must match the encounter goal's slug.
    { slug: 'held_the_gate',      name: 'Held the Gate',       description: 'Turn back the first column without losing anyone.' },
    { slug: 'every_lantern_lit',  name: 'Every Lantern Lit',   description: 'Hold both bridgeheads with the whole party still standing.' },
    { slug: 'dry_boots',          name: 'Dry Boots',           description: 'Cross the Frozen Mere by round 6.' },
    { slug: 'reader_unharmed',    name: 'The Reading',         description: 'Bring Tam to the parley ring without a scratch on anyone.' },
    { slug: 'answered_alone',     name: 'Answered Alone',      description: 'Let the hero personally strike down the Adjutant.' },
    { slug: 'whole_line_home',    name: 'The Whole Line Home', description: 'Face the Marshal and lose no one.' },
  ],

  // ── Cast ────────────────────────────────────────────────────────────────
  // Same 11 undead art keys as The Sealed Deep, deliberately re-mechanized —
  // the owner's brief. Where SD's dead were feral barrow-things, these are a
  // drilled army: they hold, shove, volley, and vault in formation.
  // TODO(balance): all HP/AC values are first-pass; Opus tunes.
  enemies: {
    // The rank and file: a shield line that SHOVES. (SD's warrior: concussive.)
    shelf_pikeman: {
      baseClass: 'fighter', artKey: 'skeleton_warrior', name: 'Shelf Pikeman',
      maxHealth: 50, armorClass: 12, specialSlug: 'shield_bash',
      passiveFlags: ['stalwart'],
      nightmare: { hpBonus: 6 },
    },
    // High-ground volleys. (SD's archer: piercing.)
    volley_archer: {
      baseClass: 'ranger', artKey: 'skeleton_archer', name: 'Volley Archer',
      maxHealth: 38, armorClass: 11, specialSlug: 'longshot',
      nightmare: { acBonus: 1 },
    },
    // Shock troops that VAULT the barricade — roar is Leaping Slam.
    vanguard: {
      baseClass: 'barbarian', artKey: 'skeleton_reaver', name: 'Vanguard',
      maxHealth: 52, armorClass: 10, specialSlug: 'roar',
      nightmare: { hpBonus: 5 },
    },
    // Fast flanker on a ROGUE chassis (berserker art; SD's was barbarian/roar).
    breaker: {
      baseClass: 'rogue', artKey: 'skeleton_berserker', name: 'Breaker',
      maxHealth: 44, armorClass: 9, movementRange: 5,
      abilities: ['twin'],
      passiveFlags: ['vengeful'],
      nightmare: { acBonus: 1 },
    },
    // The zombie SUBVERSION: not a shambling wall (SD: move 2, stalwart+thorns)
    // but a soldier who patches himself up — second_wind's enemy debut.
    frozen_watchman: {
      baseClass: 'fighter', artKey: 'zombie', name: 'Frozen Watchman',
      maxHealth: 55, armorClass: 10, specialSlug: 'second_wind',
      nightmare: { hpBonus: 6 },
    },
    // The mere's drowned company: novel `undertow` + siphon's first use ever.
    // Warlock chassis (SD's ghoul: rogue/opportunist).
    meredrowned: {
      baseClass: 'warlock', artKey: 'ghoul', name: 'Meredrowned',
      maxHealth: 42, armorClass: 9,
      abilities: ['bolt', 'undertow'],
      passiveFlags: ['siphon'],
      nightmare: { acBonus: 1 },
    },
    // Storm-spirit: wraith art on a WIZARD chassis, blizzard's enemy debut.
    // Keeps phasing (it is the art's identity) but trades SD's single-target
    // drain for area frost.
    blizzard_wisp: {
      baseClass: 'wizard', artKey: 'wraith', name: 'Blizzard Wisp',
      maxHealth: 34, armorClass: 10, specialSlug: 'blizzard',
      moveFlags: ['phasing'],
      nightmare: { acBonus: 1 },
    },
    // Control caster: freeze's enemy debut (SD's witch: cold_snap/channeler).
    winters_voice: {
      baseClass: 'wizard', artKey: 'witch', name: 'Winter\'s Voice',
      maxHealth: 36, armorClass: 11, specialSlug: 'freeze',
      nightmare: { acBonus: 1 },
    },
    // ── The living interlude: Sorrel's poacher crew (cultist art) ──
    glacier_poacher: {
      baseClass: 'sorcerer', artKey: 'cultist', name: 'Glacier Poacher',
      maxHealth: 34, armorClass: 9, specialSlug: 'ignite',
      nightmare: { acBonus: 1 },
    },
    poacher_torchhand: {
      baseClass: 'sorcerer', artKey: 'cultist', name: 'Torchhand',
      maxHealth: 34, armorClass: 9, specialSlug: 'flame_jet',
      nightmare: { acBonus: 1 },
    },
    poacher_cutter: {
      baseClass: 'rogue', artKey: 'cultist', name: 'Poacher Cutter',
      maxHealth: 40, armorClass: 8, movementRange: 4,
      abilities: ['twin'],
      nightmare: { acBonus: 1 },
    },
    // e10's dedicated escort-hunter (own key per the escort guardrails).
    muster_warden: {
      baseClass: 'barbarian', artKey: 'skeleton_berserker', name: 'Muster Warden',
      maxHealth: 48, armorClass: 9, movementRange: 4,
      aiHints: { priorityTarget: 'ally' },
      nightmare: { acBonus: 1 },
    },
    // e11's duelist: hunts the HERO — priorityTarget:'main', never used before.
    the_adjutant: {
      baseClass: 'rogue', artKey: 'specter', name: 'The Adjutant',
      // 100, up from 78 (2026-08-24, same pass as the movement drop below). The
      // two changes are one rebalance: the OLD fight put its difficulty in the
      // HUNT (movement-5 phasing killer vs the hero) which walled fragile-hero
      // builds while tanky-hero builds walked it. Difficulty now lives where
      // the tuning table says a boss's belongs — the target's own HP pool
      // (100-110) — so every build fights the same long duel and the hunt is
      // flavour rather than a filter.
      maxHealth: 100, armorClass: 11,
      // 15% of the TARGET's max per strike (owner design, 2026-08-24). The
      // rogue basic is twin (two strikes) -> ~30% of any hero per full turn:
      // the hunt kills a wizard hero in the same number of turns as a
      // barbarian one, which closes the hero-class bimodality that no scale
      // rung could (walls 18-22% at easy/medium while the median walked it).
      // 15% ≈ the old flat 8 vs a 55 HP hero; against a 32 HP hero it is 5
      // instead of 8, which is the entire point.
      damagePercentOfTargetMax: 0.15,
      // 4, down from 5 (2026-08-24). The duel's loss is main_dead and the
      // Adjutant is a PHASING hunter with priorityTarget: main — at movement 5
      // no hero could open distance, so builds with a fragile hero (wizard 32
      // HP) were deleted before the duel happened while tanky-hero builds
      // walked it. That hero-class split is why the cell stayed bimodal even
      // after the wisp breakpoint fix: median 88-100 until scale ~2.0, walls
      // past cap from 1.6, at every tier. One step slower keeps the hunt (it
      // still phases, still tracks the main) but lets a fragile hero trade
      // distance for the turns the party needs.
      movementRange: 4, specialSlug: 'expose',
      moveFlags: ['phasing'],
      aiHints: { priorityTarget: 'main' },
      nightmare: { hpBonus: 8, acBonus: 1 },
    },
    // The Marshal's picked guard.
    honor_guard: {
      baseClass: 'fighter', artKey: 'skeleton_warrior', name: 'Honor Guard',
      maxHealth: 58, armorClass: 12, specialSlug: 'shield_bash',
      passiveFlags: ['stalwart'],
      nightmare: { hpBonus: 6 },
    },
    // The finale: necromancer art on a FIGHTER chassis (SD: warlock/grasp),
    // fighting with the campaign's novel kit. A true kill-target — no
    // "boss who never dies" this time — but with a bloodless second win.
    marshal_vail: {
      baseClass: 'fighter', artKey: 'necromancer', name: 'Marshal Vail',
      maxHealth: 110, armorClass: 11,
      abilities: ['sword', 'halt_the_line', 'muster_charge'],
      passiveFlags: ['stalwart'],
      nightmare: { hpBonus: 10 },
    },
  },

  // ── Campaign abilities (the `novel` system's first use) ─────────────────
  // Authored in normalized camelCase form. TODO(integration): mirror the exact
  // normalized shapes of grasp (pull) and roar (move_self + landing ring) from
  // gameData when wiring these — field names below follow those two.
  abilities: {
    undertow: {
      id: 'undertow', slug: 'undertow', name: 'Undertow',
      description: 'Deals 5 unblockable damage, drags the target 2 tiles toward the caster, and roots them for 1 turn.',
      targetingType: 'single', range: 4, areaRadius: 0, cooldownTurns: 99,
      canTargetAlly: false, isSpecial: true, isUnblockable: true,
      excludeAllies: false, areaShape: 'chebyshev', isMultiHit: false,
      effects: [
        { type: 'damage', formula: 'flat', value: 5 },
        { type: 'pull', direction: 'toward_caster', distance: 2 },
        { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 1 },
      ],
    },
    halt_the_line: {
      id: 'halt_the_line', slug: 'halt_the_line', name: 'Halt the Line',
      description: 'The Marshal slams his standard down: 8 unblockable damage to every adjacent enemy, and they are rooted for 1 turn.',
      // SELF-CENTRED BLAST — shaped like whirlwind/shockwave in gameData
      // (aoe · range 0 · radius 1 · orthogonal), NOT 'single'. Authored as
      // 'single' with range 0 this was unsatisfiable: the only tile in range is
      // the caster's own, and canTargetAlly:false forbids aiming there, so the
      // brain never cast it once in 30 games. Measured 2026-08-20.
      targetingType: 'aoe', range: 0, areaRadius: 1, cooldownTurns: 99,
      canTargetAlly: false, isSpecial: true, isUnblockable: true,
      excludeAllies: true, areaShape: 'orthogonal', isMultiHit: false,
      effects: [
        { type: 'damage', formula: 'flat', value: 8 },
        { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 1 },
      ],
    },
    muster_charge: {
      id: 'muster_charge', slug: 'muster_charge', name: 'Muster Charge',
      description: 'The Marshal crosses 4 tiles in a single stride and deals 9 damage around where he lands.',
      // LEAP + LANDING RING — shaped like roar (Leaping Slam) in gameData
      // (aoe · radius 1 · 'ring', so the caster lands in the calm eye and is
      // not caught by its own blast). Authored as 'single' this could NEVER
      // resolve: a single-target cast demands a unit ON the tile, while
      // move_self demands that tile be EMPTY — mutually exclusive, so all 28
      // casts in 30 games were rejected "Cannot leap onto an occupied tile"
      // and the Marshal's signature move never fired. Measured 2026-08-20.
      targetingType: 'aoe', range: 4, areaRadius: 1, cooldownTurns: 99,
      canTargetAlly: false, isSpecial: true, isUnblockable: false,
      excludeAllies: true, areaShape: 'ring', isMultiHit: false,
      effects: [
        { type: 'move_self' },
        { type: 'damage', formula: 'flat', value: 9 },
      ],
    },
  },

  encounters: {
    // ═══ Palette: e1 carve(tutorial) · e2 siege · e3 hold · e4 hazard ·
    // e5 carve · e6 novel · e7 race · e8 rooms · e9 survive · e10 escort ·
    // e11 boss · e12 novel. Ten distinct types, none consecutive. `kill-all`
    // is deliberately ABSENT (its 5th plain use would be the least fresh thing
    // here); `protect` and defenseless-`escort` are skipped because both sit
    // on the beats registry's approaching-ban list. ══════════════════════

    // e1 — The Ice Road Gate (carve, tutorial). Market barricades funnel the
    // first scout column through the gate lane. Tutorial-with-a-reason: three
    // pikemen advancing in step, teaching the shove and the funnel at once.
    e1: {
      level: 1,
      terrain: {
        theme: 'forest', // TODO(art): 'snow' theme requested — see design doc §6
        blocked: [
          { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 5 }, { x: 4, y: 6 },
          { x: 2, y: 2 }, { x: 2, y: 5 },
        ],
      },
      enemies: ['shelf_pikeman', 'shelf_pikeman', 'shelf_pikeman'],
      enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 7, y: 4 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      noSpecials: true,
      goals: [
        { slug: 'held_the_gate', name: 'Held the Gate', description: 'Turn back the first column without losing anyone.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 0.95, medium: 1.25, hard: 1.28, nightmare: 1.32 },  // kill-all (tutorial: easy sits high on purpose)
    },

    // e2 — Barricade Night (siege). Hold the square while the column keeps
    // coming down two streets. The vanguards' Leaping Slam VAULTS the
    // barricade line — the wall you built is the wall they jump.
    e2: {
      level: 2,
      terrain: {
        theme: 'forest',
        blocked: [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 5 }, { x: 4, y: 6 }],
      },
      enemies: ['shelf_pikeman', 'volley_archer'],
      enemyPlacement: [{ x: 6, y: 3 }, { x: 7, y: 2 }],
      playerPlacement: [{ x: 2, y: 2 }, { x: 2, y: 5 }, { x: 3, y: 3 }, { x: 3, y: 4 }],
      waves: [
        { enemies: ['vanguard'], placement: [{ x: 7, y: 3 }], trigger: { on: 'round', round: 3 } },
        { enemies: ['breaker'], placement: [{ x: 6, y: 0 }], trigger: { on: 'round', round: 5 } },
      ],
      hpScaleOverride: { easy: 0.80, medium: 1.00, hard: 1.10, nightmare: 1.20 },  // kill-all + waves, L2 party is body-count fragile
    },

    // e3 — The Two Bridges (hold). Cover both bridgeheads at once while
    // pikemen try to SHOVE holders off the marks — shield_bash versus a
    // simultaneous-tiles objective is the whole puzzle, and it is new.
    e3: {
      level: 2,
      terrain: {
        theme: 'forest',
        // The river: a blocked channel with two bridge gaps at y=1 and y=6.
        blocked: [
          { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 7 },
        ],
      },
      objective: {
        text: 'Hold both bridgeheads at once',
        win: [{
          kind: 'units_at_tiles', scope: 'any', simultaneous: true,
          tiles: [{ x: 4, y: 1 }, { x: 4, y: 6 }],
        }],
      },
      // The pikemen stand ON the bridgeheads, not beside them: a `hold` whose
      // marks are unguarded is a stroll, and e3 measured dead FLAT (75/78/73/70)
      // across the whole scale range while they sat at (5,1)/(5,6). Now the
      // marks must be taken off them, so enemy HP finally matters here.
      //
      // ⚠ THE ARCHER AND BREAKER SIT AT x=7, NOT x=6 (2026-08-24). With them at
      // (6,3)/(6,4) this encounter was not a difficulty setting, it was a COMP
      // FILTER: nightmare measured melee 2% · ranged 0% · balanced 100%, a
      // 100-point archetype spread, and spreadSweep found NO start distance
      // that balanced the three (moving everyone together just traded which
      // archetype was excluded). The cause is specific: the win needs two units
      // STANDING on contested forward tiles simultaneously, and a ranged party
      // has nothing durable enough to survive there while those two killers are
      // in range. Pushing only the killers back — the pikemen stay on the marks
      // — gives a fragile party the turns it needs to clear them first.
      // Spread after: 45 pts on medium, 2 on nightmare (from 98/100). A party
      // is LOCKED for the campaign, so an archetype that cannot play an
      // encounter is a wall, not identity.
      // ⚠ Moving the CROSSINGS was tried first and made it worse (ranged 40% ->
      // 2% on medium): marks nearer the centre sit nearer the backline. The
      // marks belong at the board edges; it is the killers that had to move.
      enemies: ['shelf_pikeman', 'shelf_pikeman', 'volley_archer', 'breaker'],
      enemyPlacement: [{ x: 4, y: 1 }, { x: 4, y: 6 }, { x: 7, y: 2 }, { x: 7, y: 5 }],
      playerPlacement: [{ x: 1, y: 2 }, { x: 1, y: 5 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      goals: [
        { slug: 'every_lantern_lit', name: 'Every Lantern Lit', description: 'Hold both bridgeheads with the whole party still standing.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 0.50, medium: 0.65, hard: 0.75, nightmare: 0.85 },  // hold — re-walked after guards moved ONTO the marks
    },

    // e4 — The Burning Grove (hazard). Sorrel's poachers are torching the
    // emberwood — the beacon's only fuel — for charcoal money. Fire lanes
    // among the trees; a LIVING enemy interlude, fire against snow.
    e4: {
      level: 3,
      terrain: {
        theme: 'forest',
        blocked: [{ x: 2, y: 2 }, { x: 3, y: 5 }, { x: 5, y: 2 }, { x: 6, y: 5 }],
        hazards: [
          { pos: { x: 3, y: 2 }, type: 'fire' }, { pos: { x: 4, y: 3 }, type: 'fire' },
          { pos: { x: 4, y: 4 }, type: 'fire' }, { pos: { x: 5, y: 5 }, type: 'fire' },
          { pos: { x: 2, y: 6 }, type: 'fire' },
        ],
      },
      enemies: ['poacher_cutter', 'poacher_cutter', 'glacier_poacher', 'poacher_torchhand'],
      enemyPlacement: [{ x: 5, y: 3 }, { x: 5, y: 6 }, { x: 6, y: 2 }, { x: 6, y: 6 }],
      playerPlacement: [{ x: 1, y: 2 }, { x: 1, y: 5 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      hpScaleOverride: { easy: 1.00, medium: 1.15, hard: 1.25, nightmare: 1.30 },  // hazard carve
    },

    // e5 — The Icefall (carve). Fighting UP a frozen cascade: ice pillars,
    // archers volleying from the high shelf, wisps drifting through the
    // pillars the party must path around. Differs from e1's funnel-defense in
    // both carve (scatter vs funnel) and direction (assault vs defense).
    e5: {
      level: 4,
      terrain: {
        theme: 'cave',
        blocked: [
          { x: 3, y: 1 }, { x: 2, y: 3 }, { x: 4, y: 4 }, { x: 3, y: 6 },
          { x: 5, y: 2 }, { x: 6, y: 5 },
        ],
      },
      enemies: ['volley_archer', 'volley_archer', 'blizzard_wisp', 'frozen_watchman'],
      enemyPlacement: [{ x: 7, y: 2 }, { x: 7, y: 5 }, { x: 5, y: 4 }, { x: 6, y: 3 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 2 }, { x: 1, y: 5 }],
      hpScaleOverride: { easy: 0.85, medium: 0.92, hard: 1.00, nightmare: 1.02 },  // carve
    },

    // e6 — The Frozen Mere (novel). The drowned company rises through the
    // lake ice. Undertow DRAGS crossers back and roots them; siphon keeps the
    // drowned fed. Win by getting the whole party to the far shore — their
    // pull literally undoes your progress, which no encounter has done before.
    e6: {
      level: 5,
      terrain: { theme: 'cave' },
      objective: {
        text: 'Get everyone across the Frozen Mere',
        win: [{
          kind: 'units_at_tiles', scope: 'all',
          tiles: [{ x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
        }],
        // The ice closes. Without a clock this encounter was completely
        // hpScale-INERT (100% at every scale from 0.90 to 2.20): you win by
        // ARRIVING, so a tankier drowned just lives longer. The clock is what
        // makes bodies cost you rounds — CAMPAIGN_BALANCING.md's escape note.
        // Set LATER than the 'Dry Boots' achievement (round 8) so that goal
        // stays a real choice rather than a restatement of the loss.
        loss: [{ kind: 'round_reached', round: 6 }],
      },
      // Start distance is the SPREAD lever (CAMPAIGN_BALANCING.md), and e6's
      // problem was spread, not mean: ranged crossed ~98% at every scale from
      // 0.9 to 2.4 by killing the drowned from standoff, while the balanced
      // party failed the CLOCK. Close starts deny the standoff and bring the
      // engagement forward, which pulls both ends toward the middle.
      // PLACEMENT IS LOAD-BEARING AND ALREADY CORRECT — do not "fix" it.
      // undertow is `pull: toward_caster`, so a drowned standing between the
      // party and the far shore TOWS crossers toward the exit. Sweeping the
      // company west, mid-lane and east all made the encounter flat or
      // NON-MONOTONIC (easier as scale rose, because tankier drowned live to
      // cast more free tows). The authored mid-mere placement is the one
      // geometry where the tow punishes: the party must get PAST them, and is
      // then dragged back. With the round-6 clock the curve is clean and
      // monotonic (93/70/41 at 0.70/1.00/1.30). Measured 2026-08-21.
      enemies: ['meredrowned', 'meredrowned', 'meredrowned'],
      enemyPlacement: [{ x: 4, y: 2 }, { x: 4, y: 5 }, { x: 5, y: 4 }],
      waves: [
        { enemies: ['meredrowned'], placement: [{ x: 3, y: 3 }], trigger: { on: 'round', round: 4 } },
        // HARD/NIGHTMARE ONLY — the first use of difficulty-scoped waves
        // (types.ts). This escape is hpScale-inert (you win by arriving), so
        // hard and nightmare sat TOO EASY with no lever that would not also
        // break the passing easy/medium. A second drowned rising early is
        // pressure in the currency this fight trades in: bodies cost rounds,
        // and the round-6 clock makes rounds the whole game.
        // A BLIZZARD WISP, not more drowned (third iteration, measured):
        //   +1 drowned behind the runners  -> median 88 -> 84 (~nothing)
        //   +2 drowned AHEAD, on the exits -> median 88 (nothing at all)
        // The histogram says why: wins are honest "whole party escaped" races,
        // and a killable body is a speed bump to a party that out-damages it.
        // The clock is the game here, and the only thing that costs a RUNNER a
        // round is a LOST TURN — which is what the wisp's freeze is. One cast
        // over the mere freezes half the crossing against a 6-round deadline.
        // Dosed per tier (what the scoped dial is FOR): the round-2 single
        // wisp measured hard 88 -> 76 and nightmare 92 -> 68 — right currency,
        // shy dose. Hard's wisp now rises at ROUND 1 (one more cast inside the
        // clock); nightmare gets a second wisp on the south lane.
        // FLANK lanes (6,1)/(6,6), not the centre (6,3)/(6,4): a wisp standing
        // in the centre corridor sat exactly where the brain plans its charges,
        // producing "Charge destination is not reachable" validation errors
        // every game (a brain/engine path disagreement the harness papers over
        // by SKIPPING the player's turn — which both fails smoke and quietly
        // inflates the measured difficulty with a tax that is not the fight).
        // Blizzard is a placed AoE; the freeze reaches the crossing from the
        // flanks just as well.
        // ON THE EXIT TILES (third geometry, measured honestly this time).
        // Flank spawns barely bit — the freeze from (6,1)/(6,6) missed the
        // crossing (hard median 76, nm 84 with NO validation tax). But the win
        // needs all four runners ON the four exit tiles, so a wisp STANDING on
        // an exit is not a speed bump: it must die before the party can finish,
        // which is the one way a body genuinely costs rounds in an escape. Off
        // the charge corridor, so the brain's pathing stays clean.
        // Dose, measured: ~20 pts for the FIRST exit wisp on a tier, ~4 for
        // the second (diminishing — a party already at the shore kills them in
        // passing). hard runs two, nightmare three; every one occupies an exit
        // tile the win condition needs, so each is a mandatory kill inside the
        // clock. Final state: nightmare 1.70 CERTIFIES (median 44/45); hard is
        // a documented PARK at median ~76 vs 65 with ZERO walls — four
        // geometries (corridor, flank, 1-exit, 2-exit) all measured 76-80
        // honest, so this is the encounter's floor for that tier, not a
        // missing rung. The safe-direction miss: a breather, nobody bricked.
        { enemies: ['blizzard_wisp'], placement: [{ x: 7, y: 2 }], trigger: { on: 'round', round: 1 }, difficulties: ['hard', 'nightmare'] },
        { enemies: ['blizzard_wisp'], placement: [{ x: 7, y: 5 }], trigger: { on: 'round', round: 2 }, difficulties: ['hard', 'nightmare'] },
        { enemies: ['blizzard_wisp'], placement: [{ x: 7, y: 3 }], trigger: { on: 'round', round: 3 }, difficulties: ['nightmare'] },
      ],
      playerPlacement: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
      goals: [
        // ⚠ round 4, not 6. The loss clock IS round 6, so "cross by round 6" was
        // granted automatically on every win — a goal you cannot fail is not a
        // goal. 4 asks for a genuinely direct crossing. (Balance untouched: a
        // goal never gates acceptance.)
        { slug: 'dry_boots', name: 'Dry Boots', description: 'Cross the Frozen Mere by round 4.', check: { kind: 'win_by_round', round: 4 } },
      ],
      hpScaleOverride: { easy: 1.20, medium: 1.30, hard: 1.20, nightmare: 1.70 },  // escape — re-walked against the round-6 clock
    },

    // e7 — The Storm Door (race). ONE unit must reach the Vigil's door before
    // the storm buries the trail. scope:'any' inverts the usual escape: the
    // party spends itself to punch a single runner through, while Winter's
    // Voices FREEZE runners (a skipped turn is a lost round) and wisps phase
    // through the drift walls.
    e7: {
      level: 6,
      terrain: {
        theme: 'cave',
        blocked: [
          { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 6 },
          { x: 5, y: 1 }, { x: 5, y: 3 }, { x: 5, y: 5 }, { x: 5, y: 7 },
        ],
      },
      objective: {
        text: 'Reach the Vigil\'s door before the storm closes (9 rounds)',
        win: [{ kind: 'units_at_tiles', scope: 'any', tiles: [{ x: 7, y: 4 }] }],
        loss: [{ kind: 'round_reached', round: 9 }],
      },
      enemies: ['winters_voice', 'winters_voice', 'blizzard_wisp', 'blizzard_wisp'],
      enemyPlacement: [{ x: 6, y: 2 }, { x: 6, y: 6 }, { x: 4, y: 2 }, { x: 4, y: 5 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
      hpScaleOverride: { easy: 1.22, medium: 1.45, hard: 1.80, nightmare: 1.70 },  // escape with a clock
    },

    // e8 — The Vigil (rooms). Three floors UP the tower — the host's honor
    // watch came to see the beacon truly dark. Unused toys spent here:
    // doorMode:'always' (floor 1: you may bar the stair behind you mid-fight),
    // a wave triggered on:'door' (floor 2's landing guard), and a `surprise`
    // room (floor 2 — the watch kneels at the cold hearth, caught off guard).
    e8: {
      level: 7,
      rooms: [
        {
          // Floor 1 — the undercroft. Flee upward mid-fight if you dare.
          terrain: { theme: 'crypt', blocked: [{ x: 3, y: 2 }, { x: 3, y: 5 }, { x: 5, y: 3 }, { x: 5, y: 4 }] },
          enemies: ['shelf_pikeman', 'frozen_watchman'],
          enemyPlacement: [{ x: 5, y: 2 }, { x: 6, y: 5 }],
          exitDoors: [{ x: 7, y: 3 }, { x: 7, y: 4 }],
          doorMode: 'always',
        },
        {
          // Floor 2 — the keeper's floor. The watch is caught off guard
          // (surprise), but stepping to the stair springs the landing guard.
          terrain: { theme: 'crypt', blocked: [{ x: 4, y: 2 }, { x: 4, y: 5 }] },
          enemies: ['frozen_watchman', 'breaker'],
          enemyPlacement: [{ x: 5, y: 3 }, { x: 6, y: 5 }],
          entryTiles: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
          exitDoors: [{ x: 7, y: 4 }],
          doorMode: 'on_clear',
          surprise: true,
          waves: [
            { enemies: ['shelf_pikeman'], placement: [{ x: 6, y: 4 }], trigger: { on: 'door', tile: { x: 6, y: 3 } } },
          ],
        },
        {
          // Floor 3 — the beacon platform, cold for the first time in 400 years.
          terrain: { theme: 'crypt' },
          enemies: ['blizzard_wisp', 'blizzard_wisp', 'honor_guard'],
          enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 5 }, { x: 6, y: 4 }],
          entryTiles: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
        },
      ],
      playerPlacement: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
      hpScaleOverride: { easy: 1.00, medium: 1.30, hard: 1.45, nightmare: 1.70 },  // rooms
    },

    // e9 — The Long Night (survive). Sheltering in the road-cave as the
    // column marches PAST in ranks. Differs from SD's survive (open floor,
    // phasing kiters) by being a chokepoint endurance: heavy melee flowing
    // through a two-tile mouth, no phasers at all.
    e9: {
      level: 8,
      terrain: {
        theme: 'cave',
        blocked: [
          { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 5 }, { x: 3, y: 6 }, { x: 3, y: 7 },
        ],
      },
      objective: {
        text: 'Hold the cave mouth until the column passes (8 rounds)',
        win: [{ kind: 'round_reached', round: 8 }],
      },
      enemies: ['vanguard', 'shelf_pikeman'],
      enemyPlacement: [{ x: 5, y: 3 }, { x: 5, y: 4 }],
      waves: [
        { enemies: ['frozen_watchman', 'breaker'], placement: [{ x: 7, y: 3 }, { x: 7, y: 4 }], trigger: { on: 'round', round: 3 } },
        // +1 body rather than more scale: `survive` is scale-inert up high
        // (2.90 -> 3.40 barely moved nightmare), and its difficulty lives in
        // round count x wave size.
        { enemies: ['vanguard', 'volley_archer', 'shelf_pikeman'], placement: [{ x: 7, y: 2 }, { x: 7, y: 5 }, { x: 7, y: 6 }], trigger: { on: 'round', round: 5 } },
      ],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      hpScaleOverride: { easy: 1.20, medium: 1.70, hard: 1.85, nightmare: 2.40 },  // survive — re-walked after +1 body in the round-5 wave
    },

    // e10 — The Muster Field (escort — but ARMED, the registry's fix for the
    // defenseless-VIP pattern). Tam Emberwright fights their own way to the
    // parley ring to read the discharge aloud; mode:'follow' (first use), so
    // Tam moves with the party instead of walking a scripted lane.
    e10: {
      level: 9,
      allies: {
        tam: {
          name: 'Tam Emberwright', baseClass: 'cleric',
          maxHealth: 70, armorClass: 11,
          abilities: ['mace', 'heal'],
          behavior: { mode: 'follow' },
          placement: { x: 0, y: 4 },
        },
      },
      objective: {
        text: 'Bring Tam to the parley ring to read the discharge',
        win: [{ kind: 'ally_at_tiles', allyKey: 'tam', tiles: [{ x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }] }],
        loss: [{ kind: 'ally_dead', allyKey: 'tam' }],
      },
      enemies: ['muster_warden', 'muster_warden', 'shelf_pikeman', 'volley_archer'],
      enemyPlacement: [{ x: 6, y: 1 }, { x: 6, y: 6 }, { x: 5, y: 4 }, { x: 7, y: 2 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 3 }, { x: 2, y: 5 }],
      goals: [
        { slug: 'reader_unharmed', name: 'The Reading', description: 'Bring Tam to the parley ring without a scratch on anyone.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 1.15, medium: 1.30, hard: 1.60, nightmare: 1.78 },  // escort
    },

    // e11 — The Adjutant (boss). The host's champion answers the challenge
    // first — a phasing duelist who hunts the HERO specifically
    // (priorityTarget:'main', never used before). main_dead loss = the duel's
    // stakes; deliberately harsh and deliberately late, per the cookbook.
    e11: {
      level: 10,
      objective: {
        text: 'Answer the Adjutant\'s challenge',
        win: [{ kind: 'units_dead', enemyKeys: ['the_adjutant'] }],
        loss: [{ kind: 'main_dead' }],
      },
      terrain: {
        theme: 'cave',
        blocked: [{ x: 2, y: 2 }, { x: 5, y: 2 }, { x: 2, y: 5 }, { x: 5, y: 5 }],
      },
      enemies: ['the_adjutant', 'blizzard_wisp', 'blizzard_wisp'],
      enemyPlacement: [{ x: 6, y: 4 }, { x: 7, y: 2 }, { x: 7, y: 5 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      goals: [
        { slug: 'answered_alone', name: 'Answered Alone', description: 'Let the hero personally strike down the Adjutant.', check: { kind: 'killing_blow_by_main' } },
      ],
      hpScaleOverride: { easy: 1.30, medium: 1.70, hard: 1.80, nightmare: 1.90 },  // boss — ALL rungs must stay >=0.89 (cliff, see note)
    },

    // e12 — The Standard (novel finale). Marshal Vail fights with the
    // campaign kit (halt_the_line, muster_charge). DUAL WIN — the first in any
    // campaign: strike the Marshal down, OR the hero cuts through to SEIZE the
    // standard behind his line. Two different fights hiding in one encounter,
    // and the player picks which one to have.
    e12: {
      level: 10,
      objective: {
        text: 'Strike down the Marshal — or seize the Standard',
        win: [
          { kind: 'units_dead', enemyKeys: ['marshal_vail'] },
          { kind: 'units_at_tiles', scope: 'main', tiles: [{ x: 7, y: 4 }] },
        ],
      },
      terrain: {
        theme: 'cave',
        blocked: [{ x: 5, y: 1 }, { x: 5, y: 6 }],
      },
      enemies: ['marshal_vail', 'honor_guard', 'honor_guard', 'winters_voice'],
      enemyPlacement: [{ x: 5, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 5 }, { x: 7, y: 2 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
      goals: [
        { slug: 'whole_line_home', name: 'The Whole Line Home', description: 'Face the Marshal and lose no one.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 1.58, medium: 1.80, hard: 1.95, nightmare: 2.30 },  // boss, dual-win
    },
  },

  nodes: {
    intro: {
      kind: 'story',
      text: 'For four hundred years, a light has burned above Coldgate Pass. Nobody in Frostmere remembers who lit it first — only that the keeper keeps it, the way her mother did, the way the mountain keeps the snow. The town saying goes: "While the Vigil burns, the ice sleeps sound."\n\nThree nights ago, in the worst storm of the year, the Vigil went out.\n\nTonight {mainName} stands at the town gate, watching a single point of frost-blue light come down the glacier road. It walks like a soldier. It does not stop at the gate. And behind it, high on the White Shelf, a hundred more lights are forming into columns.',
      next: 'gate_pre',
    },
    gate_pre: {
      kind: 'encounter', encounter: 'e1',
      preText: 'They come through the gate in step — three soldiers of frost-rimed bone, shields locked, pikes level, snow settling on shoulders that have not felt it in four centuries. They do not shout. They do not hurry. {mainName} plants the party in the market lane, between the barricades, and the first shove of the winter begins.',
      next: 'lv2',
    },
    lv2: { kind: 'levelup', level: 2, next: 'tam_arrives' },
    tam_arrives: {
      kind: 'story',
      text: 'The column withdraws in good order — withdraws, {mainName} notices, not flees — and the square erupts in questions nobody can answer. Alderman Pell keeps saying "the light keeps them asleep" in the voice of a man reciting a rhyme he no longer believes.\n\nThen the crowd parts. A figure staggers in off the pass road, snow-caked to the eyebrows: Tam Emberwright, the keeper\'s grandchild and apprentice, half-frozen and wild-eyed.\n\n"Gran\'s gone," Tam manages. "And the beacon — she LET it go out. She said — she said she was going to—" Whatever Maren Emberwright said, Tam is asleep on their feet before they can finish saying it. The town decides it was grief talking. Somebody doused that light, they mutter. Poachers, probably.\n\nOn the White Shelf, the columns keep forming.',
      next: 'night_pre',
    },
    night_pre: {
      kind: 'encounter', encounter: 'e2',
      preText: 'They come again at midnight, down both streets at once, patient as the tide. The barricades hold the pikemen — until the first vaulting shape clears the wall entirely in one impossible leap and lands in the square. {mainName} holds the center as the night grinds on.',
      next: 'lv3',
    },
    lv3: { kind: 'levelup', level: 3, next: 'fork_town' },
    fork_town: {
      kind: 'choice',
      text: 'Dawn buys a pause, not a peace. The column will come again at dusk, and Frostmere must decide before it does. Alderman Pell looks to {mainName}: the keep\'s cellars are stone and deep, but a trap if the walls fail; the bridges lead out across the Merewater, but a column of families on the ice road is slow, cold, and exposed. Where do the people go?',
      choices: [
        { label: 'Shelter them in the keep — stone walls, and the party holds the line.', setFlags: { sheltered: true }, grantAchievement: 'held_the_keep', next: 'bridges_pre' },
        { label: 'Send them across the bridges — get everyone out of the road entirely.', setFlags: { sheltered: false }, grantAchievement: 'crossed_the_water', next: 'bridges_pre' },
      ],
    },
    bridges_pre: {
      kind: 'encounter', encounter: 'e3',
      preText: '{if sheltered}With the families barred safe inside the keep, the bridges become the thing to DENY — if the column crosses the Merewater it can flank the keep by morning. {mainName} splits the party to hold both bridgeheads at once, and the pikemen come on with their shields up, shoving for the marks.{else}The wagons start across at first light, families and lanterns and everything that can be carried. The column reads the movement and turns for the bridges. {mainName} splits the party to hold both bridgeheads until the last wagon is over — and the pikemen come shoving.{/if}',
      next: 'road_note',
    },
    road_note: {
      kind: 'story',
      text: 'The bridgeheads hold, and for one long breath the valley is quiet.\n\n"They\'ll keep coming," Tam says, awake at last and refusing to be put back to bed. "As long as the beacon\'s dark, they\'ll keep coming. So light it again — that\'s the answer, isn\'t it? Except—" Tam\'s face does something complicated. "Except Gran said... no. Never mind what Gran said. The Vigil burns emberwood. The grove\'s halfway up the pass. Go. I\'ll mind the town."\n\nHalfway up the pass, {mainName} smells the answer before seeing it: woodsmoke. The emberwood grove is burning — and not by accident. Poachers move among the trees with torches and sledges, stripping four hundred years of the beacon\'s fuel supply for charcoal money while the town below fights for its life.',
      next: 'grove_pre',
    },
    grove_pre: {
      kind: 'encounter', encounter: 'e4',
      preText: 'A woman in a fine fur coat — Sorrel, by the way the others keep looking at her — sees the party and sighs like an accountant interrupted at lunch. "The dead don\'t buy charcoal," she calls across the burning grove. "You want to lecture somebody, lecture them." Her crew fans out among the fire lanes, knives and torches out. They know exactly which ground is about to burn.',
      next: 'lv4',
    },
    lv4: { kind: 'levelup', level: 4, next: 'icefall_note' },
    icefall_note: {
      kind: 'story',
      text: 'Sorrel is gone before the last torch drops — poachers always know a back way — but the grove is gone with her. What emberwood the fire spared, the sledges took. There will be no relighting the Vigil this winter. Perhaps not for a generation.\n\n{mainName} looks up the pass, past the smoke, to where the beacon tower stands dark against the White Shelf. If the light cannot be restored, then the answer is wherever Maren Emberwright went — and the only way is up: the frozen cascade the pass-folk call the Icefall, glittering, silent, and watched.',
      next: 'icefall_pre',
    },
    icefall_pre: {
      kind: 'encounter', encounter: 'e5',
      preText: 'Archers of the Host hold the high shelf, patient behind four hundred winters of ice pillars, and something pale drifts BETWEEN the pillars without going around them. {mainName} starts up the cascade, cover to cover, into the volleys.',
      next: 'lv5',
    },
    lv5: { kind: 'levelup', level: 5, next: 'mere_note' },
    mere_note: {
      kind: 'story',
      text: 'Above the Icefall the pass opens out, and {mainName} understands where the Merewater begins: a mountain lake, frozen ten feet down, white as a held breath. The trail runs straight across it.\n\nOld pass-folk stories say a supply company went under the ice here, wagons and all, the winter the Host first marched — still waiting, the stories say, for the quartermaster\'s whistle to tell them the ford is safe.\n\nOut on the white, something knocks, politely, from underneath.',
      next: 'mere_pre',
    },
    mere_pre: {
      kind: 'encounter', encounter: 'e6',
      preText: 'The drowned company rises through the ice without breaking it — waterlogged, patient, reaching. Every step forward, cold hands drag somebody back. {mainName} strings the party out across the mere and pushes for the far shore: keep moving, keep together, do not stop to fight what only wants you to stop.',
      next: 'fork_trail',
    },
    fork_trail: {
      kind: 'choice',
      text: 'On the far shore stands the trailhead shrine — the last shelter below the Vigil, kept stocked by generations of Emberwrights. Inside: the keeper\'s spare oilskins, waxed and ward-stitched against the storm... and a rack of old snowshoes, mended and true. The climb ahead is steep and the storm is building. The party can carry one or the other, not both.',
      choices: [
        { label: 'Take the warded oilskins — let the storm break on them, not on you.', setFlags: { tookOilskins: true }, grantAchievement: 'keepers_oilskins', grantBoon: 'keepers_oilskins', next: 'storm_note' },
        { label: 'Take the snowshoes — speed over the drifts is its own armor.', setFlags: { tookOilskins: false }, grantAchievement: 'snowshoe_march', grantBoon: 'snowshoe_march', next: 'storm_note' },
      ],
    },
    storm_note: {
      kind: 'story',
      text: '{if tookOilskins}The oilskins settle over the party\'s shoulders like a promise kept — the storm\'s first gust breaks around them and finds no purchase.{else}The snowshoes bite true, and the drifts that should swallow a climber to the waist barely slow the party down.{/if}\n\nAbove, the Vigil tower appears and disappears in the whiteout. The storm is not weather, {mainName} realizes, watching pale shapes wheel inside it. The storm is a DOOR, and winter is holding it shut.',
      next: 'storm_pre',
    },
    storm_pre: {
      kind: 'encounter', encounter: 'e7',
      preText: 'The trail to the tower door is a slot between drift-walls taller than a wagon, and the drifts are closing like a slow fist. Frost-voiced casters chant runners to a standstill; wisps ride the wind straight through the walls. One of the party has to reach that door before the trail seals — whoever can be spared, sped, and spent. {mainName} chooses the runner and the rest become the road.',
      next: 'lv7',
    },
    lv7: { kind: 'levelup', level: 7, next: 'vigil_pre' },
    vigil_pre: {
      kind: 'encounter', encounter: 'e8',
      preText: 'The door gives onto darkness and old stone stairs. The Vigil is not empty: soldiers of the Host stand watch on every floor — not ransacking, not searching. Waiting. As if the tower were suddenly the most important place in the world, and they had come to see for themselves that the light is truly out. {mainName} climbs, floor by floor, toward the cold beacon at the top.',
      next: 'lv8',
    },
    lv8: { kind: 'levelup', level: 8, next: 'rolls_note' },
    rolls_note: {
      kind: 'story',
      text: 'The beacon platform is scoured clean by wind. No body — of Maren Emberwright there is no sign at all but a chair, a spyglass, and a letter weighted under the great cold fire-bowl, addressed in a firm hand: "To whoever climbs next."\n\n"The rolls are in the chest," it begins. "Read them before you judge me."\n\nThe muster rolls of the Winter Host. Four hundred years old. And at the top, the standing order, copied fair in some long-dead clerk\'s best hand: HOLD THE PASS UNTIL THE BEACON ABOVE COLDGATE GOES DARK. DARK MEANS RELIEF IS COME. THEN MARCH HOME.\n\nThe letter again: "The war ended. Nobody sent the relief. The first keepers lit the light to keep an army standing at a post the world forgot — because home, for the Host, is the muster field down the valley, and the war-road home runs through the town we built on top of it. Four hundred years of NOT YET is not keeping faith. It is theft. I have given them their dark. I am sorry for what it costs, and I have gone ahead to say so to the Marshal myself.\n\nThere is a law in the rolls older than the beacon: the road may be contested by challenge. Take my ring. Take Tam. And ask the Marshal for the Standard."\n\n{mainName} looks down from the platform. Far below, on the White Shelf, the Winter Host is forming into a column four hundred years long — and it is pointed at Frostmere.',
      next: 'night2_pre',
    },
    night2_pre: {
      kind: 'encounter', encounter: 'e9',
      preText: 'There is no outrunning a column on its own road. Where the war-road cuts through the mountain, {mainName} shelters the party in the old road-cave and holds its narrow mouth while the vanguard of the Host marches PAST in the dark — rank on rank on rank, and every few ranks, some of them peel off toward the light of the party\'s fire.',
      next: 'fork_dawn',
    },
    fork_dawn: {
      kind: 'choice',
      text: 'The column camps below the shelf before its last descent — even the dead, it seems, keep march discipline. The challenge must be made before they move again. Tam arrives with the ring an hour before first light, having climbed half the night, and now there is one decision left: how does {mainName} spend the hours until the parley?',
      choices: [
        { label: 'Rest by the fire until dawn — meet the Host whole and warm.', setFlags: { choseDawn: true }, grantAchievement: 'waited_for_dawn', grantBoon: 'dawn_rest', next: 'muster_note' },
        { label: 'Walk the old battlefield and arm from the ice — shields for everyone.', setFlags: { choseDawn: false }, grantAchievement: 'armed_from_the_ice', grantBoon: 'battlefield_arms', next: 'muster_note' },
      ],
    },
    muster_note: {
      kind: 'story',
      text: '{if choseDawn}Dawn comes up gold and bitter cold, and the party rises rested for the first time since the beacon died.{else}By lantern light the party walks the old field, and the ice gives up what it has kept: shields with four hundred winters in them and no owners left to mind the borrowing.{/if}\n\nBelow, the muster field. The Host stands in perfect ranks around a ring of planted spears — the parley ring, exactly where the rolls said it would be. By the law of the road, the challenge must be READ by a keeper\'s line before it can be answered.\n\nTam Emberwright squares their shoulders, holds the ring so hard their knuckles go white, and says, "Right. Walk me in."\n\nThe Host does not intend to make it easy. Wardens are already moving to turn the reader back.',
      next: 'muster_pre',
    },
    muster_pre: {
      kind: 'encounter', encounter: 'e10',
      preText: 'Tam walks with the party, mace in one hand and Maren\'s ring in the other, patching wounds on the move and swinging when it comes to it — an Emberwright to the bone. The Host\'s wardens converge, bent on one thing only: no reader reaches the ring. {mainName} clears the way.',
      next: 'lv10',
    },
    lv10: { kind: 'levelup', level: 10, next: 'adjutant_pre' },
    adjutant_pre: {
      kind: 'encounter', encounter: 'e11',
      preText: 'Tam\'s voice carries across the muster field, reading the discharge into the wind, and the whole Host turns its head at once. From beside the Standard, something folds itself out of the cold — the Adjutant, the Marshal\'s own champion, drawn thin as a blade\'s shadow. It points, precisely, at {mainName}.\n\nThe law of the road: the champion answers first. This duel is the hero\'s to win — and the hero\'s to lose.',
      next: 'standard_note',
    },
    standard_note: {
      kind: 'story',
      text: 'The Adjutant comes apart like frost off a window, and — {mainName} would swear to it — bows on the way down.\n\nThe ranks part. At the heart of the muster field waits a tall figure in a general\'s tattered greatcoat, the great Standard of the Host planted in the ice at his back: Marshal Vail, four hundred years at attention, waiting beside a folding table on which sits — set out with terrible, hopeful care — a single cup, as if for a guest long expected.\n\n"Keeper\'s kin. Champion." The Marshal\'s voice is the sound of a gate in winter. "Your reading is heard. My soldiers have somewhere to be, and your town is standing in the road. The law gives us this: take the Standard from me, and the column halts where it stands. Fail, and we march at noon." He draws a sword that remembers being bright.\n\n"For what it is worth," he adds, quietly, "your keeper said the same. She is safe, and she argued well. But a lie four centuries old does not die of argument."',
      next: 'standard_pre',
    },
    standard_pre: {
      kind: 'encounter', encounter: 'e12',
      preText: 'The honor guard closes ranks before the Standard, and the Marshal rolls his shoulders like a man glad, after four hundred years, to finally be at something. Strike him down and the challenge is won — or cut through and let {mainName}\'s own hand seize the Standard from the ice. The law honors either. The Host watches, forty deep and silent, to see which it will be.',
      next: 'fork_rest',
    },
    fork_rest: {
      kind: 'choice',
      text: 'It is over. The Standard leans in {mainName}\'s grip, and the entire Winter Host stands at ease for the first time in four centuries, awaiting one last order. Marshal Vail — what remains of him, settling into the ice with his salute unbroken — leaves the choice to the challenger, as the law requires. Where does the Host go?',
      choices: [
        { label: 'Into the glacier — lay them to rest at the post they kept so long.', setFlags: { laidToIce: true }, grantAchievement: 'laid_to_ice', next: 'end' },
        { label: 'Down the long road — march them the slow way around the valley, home to the muster field at last.', setFlags: { laidToIce: false }, grantAchievement: 'marched_home', next: 'end' },
      ],
    },
    end: {
      kind: 'end',
      text: '{if laidToIce}{mainName} plants the Standard high on the White Shelf, and the Winter Host marches into the glacier by companies, in perfect order, each rank saluting the colors as it passes into the blue. The ice takes them the way a bed takes a tired soldier. The mountain has never been so quiet.{else}{mainName} carries the Standard at the head of the column, down the long eastern road that spares the valley, two days\' march to a snow-covered field that was once called the muster ground. There the Winter Host forms up one final time, dresses its lines, and — released at last — lies down in the snow it has waited four hundred years to reach. Where each soldier rests, the snow holds the shape of someone finally home.{/if}\n\nMaren Emberwright is waiting in Frostmere when the party returns — alive, unrepentant, and already arguing with Alderman Pell about what to tell the children. Tam relights the Vigil one last time on midwinter\'s night: not as a lock, but as a lamp — one bright night a year, so nobody forgets the four hundred dark ones it took to pay an army what it was owed.\n\n{if sheltered}The families come up from the keep cellars into the sunlight{else}The wagons come back across the bridges, families and lanterns and all{/if}, and Frostmere rings its bell until the icicles fall off it.\n\nTHE UNLIT BEACON — COMPLETE',
    },
  },

  boons: {
    // Pairings deliberately differ from The Sealed Deep's (shield/HP, move/AC).
    keepers_oilskins: {
      slug: 'keepers_oilskins', name: 'The Keeper\'s Oilskins',
      description: 'Ward-stitched against the storm — every unit starts each remaining encounter shielded.',
      effects: { startShielded: 'all' },
    },
    snowshoe_march: {
      slug: 'snowshoe_march', name: 'Snowshoe March',
      description: '+1 movement range for the rest of the climb.',
      effects: { partyMovement: 1 },
    },
    dawn_rest: {
      slug: 'dawn_rest', name: 'The Dawn Challenge',
      description: 'Rested and whole — +6 max HP for the rest of the run.',
      effects: { partyMaxHp: 6 },
    },
    battlefield_arms: {
      slug: 'battlefield_arms', name: 'Armed from the Ice',
      description: 'Shields with four hundred winters in them — +2 armor class for the rest of the run.',
      effects: { partyArmorClass: 2 },
    },
  },
};
