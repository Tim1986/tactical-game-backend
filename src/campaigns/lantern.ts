/**
 * lantern.ts — "The Lantern of Elmsworth", the FREE campaign.
 *
 * ═══ GROUND-UP REDESIGN 2026-08-24 (TRILOGY_REDESIGN.md §3) ═══════════════
 * Was a 5-encounter teaser sharing one skeleton with Goblinopolis and
 * Moonberry (CAMPAIGN_BEATS.md §1: "the same campaign wearing three coats of
 * paint"). Now a FULL L1→10 album, 12 encounters, forks at L6 and L9 — given
 * away whole, because the strongest ad for the paid shelf is a complete free
 * record rather than a demo cut.
 *
 * WHAT THIS CAMPAIGN IS FOR, beyond itself: it is the storefront. Its twelve
 * encounters use TWELVE DISTINCT PALETTE TYPES — every type the grammar has
 * except `novel` — so a new player meets the entire vocabulary of the game
 * before they are asked to pay for anything.
 *
 * The trilogy's shared beats are repaid here rather than repeated: Lantern is
 * now the ONLY campaign allowed the festival-theft driver and the pincer
 * tutorial (CAMPAIGN_BEATS §2 bans 1, 2, 5 — honored by giving them to exactly
 * one campaign instead of three).
 *
 * THE TWIST, and why the campaign is no longer a straight fetch quest: the
 * goblins' own hearth-flame, the Emberheart, died a month ago. Grubnash stole
 * light because his warren is going dark and he is too proud to ask a human
 * town for embers. The party learns this at e9 — an ACT before the finale —
 * so the last third is played knowing that carrying the lantern home, exactly
 * as ordered, leaves a thousand goblins in the cold. (Twist shape: "the
 * villain's crime has a true need under it" — distinct from Goblinopolis's
 * "the permission always existed" and Moonberry's "the prize was never in the
 * vault", and it retires the trilogy's spent schemer twist entirely.)
 *
 * ⚠ LEVEL GRAPH TRAP: the live game builds the party at `run.level`, which
 * advances ONLY at `levelup` nodes — while sims build at `encounter.level`.
 * The two disagree by one across a fork (a choice node carries no level), and
 * that is HARMLESS today only because PLAYER_HP_DELTA is 0 for L4-L10. The
 * one gate that does bite is L10's second special charge, so every level-10
 * encounter MUST sit after a real `lv10` node. It does here (lv10 → e11, e12).
 *
 * BALANCE: hpScaleOverride values on reused encounters are their D2-certified
 * numbers as STARTING POINTS ONLY — the party level under several of them
 * changed, so nothing transfers. New encounters carry provisional scales
 * marked PROVISIONAL. The full battery is the balance pass, not this file.
 */
import { CampaignDefinition } from './types.js';

export const lanternCampaign: CampaignDefinition = {
  slug: 'lantern',
  title: 'The Lantern of Elmsworth',
  blurb: 'Goblins have stolen the Harvest Lantern on the eve of the festival — and the reason why is colder than the theft.',
  enemyFactionName: 'Goblins',
  free: true,
  startNode: 'intro',
  // TODO(skins): no skin system exists yet — unlock is recorded in campaign
  // meta locally; wire to the skin picker when skins ship.
  rewardSkin: { classSlug: 'rogue', skinId: '50101', name: 'Goblin King' },

  achievements: [
    // Completion — slugs UNCHANGED from the 5-encounter version so existing
    // meta (completedDifficulties, skin unlock) stays valid.
    { slug: 'complete_easy',      name: 'Lantern Lit',        description: 'Complete The Lantern of Elmsworth on Easy.' },
    { slug: 'complete_medium',    name: 'Lantern Blazing',    description: 'Complete The Lantern of Elmsworth on Medium.' },
    { slug: 'complete_hard',      name: 'Festival Hero',      description: 'Complete The Lantern of Elmsworth on Hard.' },
    { slug: 'complete_nightmare', name: 'Light in the Dark',  description: 'Complete The Lantern of Elmsworth on Nightmare — unlocks the Goblin King skin.' },
    // Legacy fork achievements — kept live (the crossroads fork survives).
    { slug: 'friend_of_the_mill', name: 'Friend of the Mill', description: 'Defend the miller\'s cart.' },
    { slug: 'swift_justice',      name: 'Swift Justice',      description: 'Run down the goblin scouts.' },
    // L6 fork
    { slug: 'fed_the_pack',       name: 'Fed the Pack',       description: 'Give the wolfpelts the party\'s provisions.' },
    { slug: 'kept_the_larder',    name: 'Kept the Larder',    description: 'Keep the provisions for the descent.' },
    // L9 fork
    { slug: 'the_scullery_door',  name: 'The Scullery Door',  description: 'Enter the Undervault through the kitchens.' },
    { slug: 'the_coalgate',       name: 'The Coalgate',       description: 'Force the Coalgate and walk in the front way.' },
    // Battle goals (each achieved goal becomes this achievement — slugs match).
    { slug: 'not_a_spark_lost',   name: 'Not a Spark Lost',   description: 'Bring the ember-cart through with its brazier untouched.' },
    { slug: 'through_the_smoke',  name: 'Through the Smoke',  description: 'Cross the burning orchard without losing anyone.' },
    { slug: 'held_the_hollow',    name: 'Held the Hollow',    description: 'Hold the wolfpelt camp with the whole party standing.' },
    { slug: 'cut_them_off',       name: 'Cut Them Off',       description: 'Catch the lantern-carriers on the ridge by round 6.' },
    { slug: 'last_one_through',   name: 'Last One Through',   description: 'Escape the cave mouth without losing anyone.' },
    { slug: 'both_ends_held',     name: 'Both Ends Held',     description: 'Hold both ends of the Underbridge with nobody down.' },
    { slug: 'kept_the_dark_out',  name: 'Kept the Dark Out',  description: 'Survive the Dark Between without a single loss.' },
    { slug: 'the_cook_repaid',    name: 'The Cook Repaid',    description: 'Bring Nib through the sculleries without a scratch on the party.' },
    { slug: 'crowned_yourself',   name: 'Crowned Yourself',   description: 'Let the hero personally strike down King Grubnash.' },
  ],

  boons: {
    // L6 pairing: HP vs damage-in-the-dark. Deliberately different axes from
    // the paid campaigns' pairings (shield/HP and move/AC are spent).
    fed_the_pack: {
      slug: 'fed_the_pack', name: 'Fed the Pack',
      description: 'Well-fed and unhunted — +4 max HP for every hero, for the rest of the run.',
      effects: { partyMaxHp: 4 },
    },
    kept_the_larder: {
      slug: 'kept_the_larder', name: 'Kept the Larder',
      description: 'Full packs for the long dark — +1 movement range for the rest of the run.',
      effects: { partyMovement: 1 },
    },
    // L9 pairing: guided-and-quiet vs forced-and-armored.
    scullery_door: {
      slug: 'scullery_door', name: 'The Scullery Door',
      description: 'Nib\'s pilfered kitchen plate, strapped on in the dark — +2 armor class for the rest of the run.',
      effects: { partyArmorClass: 2 },
    },
    coalgate_forced: {
      slug: 'coalgate_forced', name: 'The Coalgate Forced',
      description: 'Warden\'s shields, taken the hard way — every hero starts each remaining encounter shielded.',
      effects: { startShielded: 'all' },
    },
  },

  // A6 — Lantern's own abilities (added 2026-09-01, redesign pass). Until now
  // this campaign had NONE: three of its ten enemies were bare class chassis,
  // and CAMPAIGNS.md flagged it as "the exposure" — two status-applying
  // monsters in twelve encounters, so root/purify counterplay had nothing to
  // bite on. Every ability here cashes a story hook the board never paid:
  // goblins who catch you in the squeeze, a pack that LEAPS, a dark that
  // makes your blades worth less, a king whose crown is the weapon.
  abilities: {
    // Sized by the kit probe (2026-09-01). As "6 + rooted 1" and then "8 +
    // weakened 2" the brain never cast it — on a ROGUE chassis a special
    // competes with Twin Strike's 16, and a rider does not close a 10-point
    // gap. At 14 + weakened 2 it is a real once-per-battle blow (a goblin's
    // low cut that leaves you swinging weaker), and the third status family
    // in the campaign (rooted / weakened / burning) — purify and ward finally
    // have something to answer here.
    hamstring: {
      id: 'hamstring', slug: 'hamstring', name: 'Hamstring',
      description: 'A low cut: 14 damage to an adjacent enemy, and they are weakened for 2 turns.',
      targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 99,
      canTargetAlly: false, isSpecial: true, isUnblockable: false,
      excludeAllies: false, areaShape: 'chebyshev', isMultiHit: false,
      effects: [
        { type: 'damage', formula: 'flat', value: 14 },
        { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 2 },
      ],
    },
    pounce: {
      id: 'pounce', slug: 'pounce', name: 'Pounce',
      description: 'The runner leaps up to 3 tiles and bites everything around where it lands for 7 damage.',
      targetingType: 'aoe', range: 3, areaRadius: 1, cooldownTurns: 99,
      canTargetAlly: false, isSpecial: true, isUnblockable: false,
      excludeAllies: true, areaShape: 'ring', isMultiHit: false,
      effects: [
        { type: 'move_self' },
        { type: 'damage', formula: 'flat', value: 7 },
      ],
    },
    snuff: {
      id: 'snuff', slug: 'snuff', name: 'Snuff',
      description: 'The dark closes in: 3 unblockable damage to every enemy around a tile within 4 steps, and they are weakened for 2 turns.',
      targetingType: 'aoe', range: 4, areaRadius: 1, cooldownTurns: 99,
      canTargetAlly: false, isSpecial: true, isUnblockable: true,
      excludeAllies: true, areaShape: 'chebyshev', isMultiHit: false,
      effects: [
        { type: 'damage', formula: 'flat', value: 3 },
        { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 2 },
      ],
    },
    crown_blaze: {
      id: 'crown_blaze', slug: 'crown_blaze', name: 'Crown Blaze',
      description: 'The lantern-crown flares: 9 unblockable damage to every adjacent enemy, and they burn for 2 turns.',
      targetingType: 'aoe', range: 0, areaRadius: 1, cooldownTurns: 99,
      canTargetAlly: false, isSpecial: true, isUnblockable: true,
      excludeAllies: true, areaShape: 'chebyshev', isMultiHit: false,
      effects: [
        { type: 'damage', formula: 'flat', value: 9 },
        { type: 'apply_status', statusSlug: 'burning', stacks: 1, durationTurns: 2 },
      ],
    },
    mine: {
      id: 'mine', slug: 'mine', name: 'MINE!',
      description: 'The King grabs: 4 unblockable damage, drags the target 3 tiles toward the throne, and roots them for 1 turn.',
      targetingType: 'single', range: 3, areaRadius: 0, cooldownTurns: 99,
      canTargetAlly: false, isSpecial: true, isUnblockable: true,
      excludeAllies: false, areaShape: 'chebyshev', isMultiHit: false,
      effects: [
        { type: 'damage', formula: 'flat', value: 4 },
        { type: 'pull', direction: 'toward_caster', distance: 3 },
        { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 1 },
      ],
    },
  },

  enemies: {
    goblin_scrapper: {
      baseClass: 'rogue', name: 'Goblin Scrapper',
      maxHealth: 36, armorClass: 9,
      // specialSlug (not `abilities`) on purpose: the specialSlug path honours
      // e1's noSpecials, a custom kit would not — the tutorial stays basic-only.
      specialSlug: 'hamstring',
      nightmare: { acBonus: 1 },
    },
    goblin_slinger: {
      baseClass: 'ranger', name: 'Goblin Slinger',
      maxHealth: 36, armorClass: 10,
      // Pinning, not the default Longshot: a slinger that ROOTS is the goblins'
      // "catch you in the squeeze" style at range — the second status source.
      specialSlug: 'pinning',
      nightmare: { acBonus: 1 },
    },
    wolfpelt_runner: {
      // The goblins' "wolves": goblins in wolf pelts, running on all fours.
      // Humanoid (rogue chassis, goblin art) — real wolves can't be animated.
      baseClass: 'rogue', name: 'Wolfpelt Runner',
      maxHealth: 33, armorClass: 8, movementRange: 4,
      specialSlug: 'pounce',
      nightmare: {},
    },
    // e6's quarry. A thief that starts SHIELDED: the ridge race is built from
    // distance and guards (the brain cannot flee), and the ward is what stops
    // a ranged alpha strike from ending the race before it starts.
    ember_carrier: {
      baseClass: 'rogue', name: 'Ember Carrier',
      maxHealth: 36, armorClass: 9, movementRange: 5,
      specialSlug: 'dagger_toss',
      // Ward REMOVED after R2 (2026-09-01): warded + corners + guards + a
      // 7-round clock read ranged 18% / balanced 2% ("the deadline passed")
      // and nightmare 1%. Three levers on one race was one too many; the
      // ward is the one whose cost the party cannot see coming.
      nightmare: { acBonus: 1 },
    },
    // e10's hunter: a dedicated definition so only IT hunts the cook
    // (aiHints attach to the key — never hint the shared chaff).
    ladle_snatcher: {
      baseClass: 'rogue', name: 'Ladle Snatcher',
      maxHealth: 34, armorClass: 9, movementRange: 5,
      specialSlug: 'hamstring',
      aiHints: { priorityTarget: 'ally' },
      nightmare: { acBonus: 1 },
    },
    // e11 room 2: the throne approach is lit by the stolen fire, and it burns.
    ember_warden: {
      baseClass: 'sorcerer', name: 'Ember Warden',
      maxHealth: 38, armorClass: 10,
      specialSlug: 'flame_jet',
      nightmare: { hpBonus: 4 },
    },
    // NEW — the light thieves. Fast, fragile, and always running AWAY with
    // something: the campaign's recurring "you cannot just stand and fight"
    // pressure, and the reason the ridge chase (e6) is a race at all.
    ember_thief: {
      baseClass: 'rogue', name: 'Ember Thief',
      maxHealth: 32, armorClass: 9, movementRange: 5,
      specialSlug: 'dagger_toss',
      nightmare: { acBonus: 1 },
    },
    // NEW — the orchard burners. Sorcerer chassis (goblin art): the fire in
    // e4 is THEIRS, and they keep making more of it.
    torch_hurler: {
      baseClass: 'sorcerer', name: 'Torch Hurler',
      maxHealth: 34, armorClass: 9,
      specialSlug: 'ignite',
      nightmare: { hpBonus: 4 },
    },
    orc_bruiser: {
      baseClass: 'fighter', name: 'Orc Bruiser',
      maxHealth: 68, armorClass: 12,
      passiveFlags: ['immovable'],
      nightmare: { hpBonus: 4 },
    },
    // NEW — the voice in the black. A warlock that PULLS heroes off the
    // formation and into the dark; the mechanical reason e9's blackout is
    // frightening rather than merely long.
    dark_croaker: {
      baseClass: 'warlock', name: 'Dark Croaker',
      maxHealth: 40, armorClass: 9,
      // Two specials: the pull (out of the circle) and the DARK itself — Snuff
      // weakens the whole party, which is what "you cannot see" means on a
      // board. Before this the dark did nothing and e9 was a kill-all.
      abilities: ['eldritch', 'grasp', 'snuff'],
      nightmare: { hpBonus: 6 },
    },
    // NEW — the Undervault's door-keeper. Immovable, but NOT a road-gate: he
    // holds a bridgehead (e8) and a throne room (e11), never a corridor the
    // party must squeeze past (CAMPAIGN_BEATS §2 ban #4).
    coalgate_warden: {
      baseClass: 'fighter', name: 'Coalgate Warden',
      maxHealth: 62, armorClass: 11,
      specialSlug: 'shield_bash',
      passiveFlags: ['immovable'],
      nightmare: { hpBonus: 6 },
    },
    moss_shaman: {
      baseClass: 'cleric', name: 'Moss Shaman',
      maxHealth: 34, armorClass: 10,
      // WARD, not heal (2026-09-01). CAMPAIGN_BEATS §2 #3 bans boss+mender on
      // MEASURED grounds — the pair does not scale (baseline 90% at medium
      // again). A shaman who shields the King ONCE makes the alpha strike fail
      // instead of undoing damage forever: a decision, not a script.
      specialSlug: 'ward',
      nightmare: {},
    },
    king_grubnash: {
      // Barbarian chassis = orc art: Grubnash is a huge orc the goblins crowned.
      // Kill-target boss: `undying` so the kill needs follow-through instead of
      // one alpha strike.
      baseClass: 'barbarian', name: 'King Grubnash',
      maxHealth: 110, armorClass: 10,
      // A boss with a KIT (2026-09-01): the crown is the weapon, and MINE! drags
      // a hero onto the throne steps. Before this: a basic attack and 110 HP.
      abilities: ['strike', 'crown_blaze', 'mine'],
      passiveFlags: ['immovable', 'undying'],
      // Nightmare: a wounded King hits harder. Counterplay: burst him through
      // the half-health window rather than chipping.
      nightmare: { hpBonus: 8, passiveFlags: ['vengeful'] },
    },
  },

  encounters: {
    // ═══ PALETTE (the storefront claim) ═════════════════════════════════════
    // e1 kill-all · e2 carve · e3 protect · e4 hazard · e5 siege · e6 race ·
    // e7 escape · e8 hold · e9 survive · e10 escort · e11 rooms · e12 boss.
    // TWELVE encounters, TWELVE distinct types — the whole grammar except
    // `novel`, none consecutive with itself. A new player meets every kind of
    // tactical problem the game knows how to pose before paying for anything.
    // ════════════════════════════════════════════════════════════════════════

    // e1 — The Hedgerow Road (kill-all). Tutorial: no terrain, no objective,
    // no specials. The trilogy's ONE surviving pincer (ban #5 repaid).
    e1: {
      level: 1,
      terrain: { theme: 'forest' },
      enemies: ['goblin_scrapper', 'goblin_scrapper', 'goblin_scrapper'],
      // Rear scrapper (1,4) -> (0,6) [2026-09-01]: at (1,4) the pincer denied a
      // ranged party its first volley — hard read melee 87 / ranged 15, a
      // 72-point spread at LEVEL ONE. From the corner it still arrives, one
      // round later, and the ambush beat is kept.
      enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 0, y: 6 }],
      playerPlacement: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }],
      noSpecials: true,
      // Easy sits above band by design — tutorial exemption (near-certain first win).
      // ⚠ Three identical scrappers share damage breakpoints, so the whole cell
      // moves at once and the walk is steep (~31 pts per 0.07 at medium).
      // ⚠ TUTORIAL EXEMPTION at medium (owner standard, 2026-08-24). A
      // campaign's FIRST fight — level 1, no specials, party at -8 max HP —
      // is calibrated to ~85% mean / ~90% median with no walled archetype,
      // which reads TOO EASY against the general medium band on purpose. The
      // owner played unlitbeacon e1 at a measured-PASS 78% mean and called it
      // "about the level I would expect of HARD for a first encounter": win
      // rate does not measure GRIND, and every e1 in the catalog sat in that
      // same 71-78% zone. Survey (80 builds x 25 games/rung) and the rung
      // chosen here:
      //   1.20 -> 71% mean/80% median · 1.08 -> 80% · 1.00 -> 84%/88%, 0% walls
      // TUNE-D1: easy/medium are the owner's opener (untouched); hard/nightmare from the tuner.
      hpScaleOverride: { easy: 0.93, medium: 1.00, hard: 1.35, nightmare: 1.45 },
    },

    // e2 — The Old Mill (carve). Millstone cover on the APPROACH lane, never
    // screening the shooters: three layouts that walled the goblins instead
    // took melee 52% -> 35% -> 4% while ranged sat near 100%.
    e2: {
      level: 2,
      terrain: {
        theme: 'forest',
        blocked: [{ x: 3, y: 2 }, { x: 3, y: 5 }],
      },
      enemies: ['goblin_scrapper', 'goblin_scrapper', 'goblin_slinger'],
      // One step closer [2026-09-01, spreadSweep]: at x=6 the millstones were
      // cover for the SLINGER's farm, not the party's approach — medium read
      // melee 33 / ranged 93. Offset +1 collapses the spread to 10/3/11 points
      // across medium/hard/nightmare (balance_runs/lantern_spread_e2.log).
      enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 5 }, { x: 5, y: 3 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 0, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      hpScaleOverride: { easy: 1.20, medium: 1.44, hard: 1.55, nightmare: 1.68 },
    },

    // e3 — The Ember-Cart (protect). NEW. The village sends its brazier after
    // the party; thieves want the coals more than they want the heroes.
    //
    // ⚠ The cart is a WAGON, not a person: 96 HP, immovable, no kit. That is
    // deliberate design, not an accident of tuning — CAMPAIGN_BEATS §2 #10
    // flags "a defenseless NPC the party must keep alive" at 2 uses, and BOTH
    // prior uses had to be rescued late with a boss-tier HP pool because a
    // ranged party otherwise gets walled. Authoring the tough object up front
    // spends the beat honestly and skips the balance discovery.
    e3: {
      level: 3,
      terrain: {
        theme: 'forest',
        blocked: [{ x: 4, y: 1 }, { x: 4, y: 6 }],
      },
      allies: {
        cart: {
          name: 'The Ember-Cart', baseClass: 'fighter',
          // 96 -> 130 [2026-09-01]: allies do not scale with hpScale, so a burst
          // a melee party body-blocks killed the cart under a ranged party every
          // time (12% at medium, "Your charge has fallen" x52/60; nightmare 0%
          // with 97% of builds walled). The clock is the tier lever now.
          maxHealth: 130, armorClass: 11, movementRange: 0,
          abilities: [],
          behavior: { mode: 'hold' },
          placement: { x: 2, y: 4 },
        },
      },
      objective: {
        text: 'Keep the ember-cart burning — hold them off until the wagon-team is hitched',
        win: [{ kind: 'round_reached', round: 6, roundByDifficulty: { easy: 5 } }],
        loss: [{ kind: 'ally_dead', allyKey: 'cart' }],
      },
      enemies: ['ember_thief', 'ember_thief', 'goblin_scrapper', 'goblin_slinger'],
      enemyPlacement: [{ x: 6, y: 2 }, { x: 6, y: 5 }, { x: 5, y: 3 }, { x: 6, y: 4 }],
      waves: [
        {
          enemies: ['ember_thief', 'goblin_scrapper'],
          placement: [{ x: 7, y: 3 }, { x: 7, y: 4 }],
          trigger: { on: 'round', round: 3 },
          difficulties: ['hard', 'nightmare'],
        },
      ],
      playerPlacement: [{ x: 2, y: 3 }, { x: 3, y: 4 }, { x: 2, y: 5 }, { x: 1, y: 4 }],
      goals: [
        { slug: 'not_a_spark_lost', name: 'Not a Spark Lost', description: 'Finish with the whole party standing.', check: { kind: 'no_party_deaths' } },
      ],
      // ⚠ Battery 1 read TOO EASY at ALL FOUR tiers (98/90/95/73% mean). A
      // hold-the-clock protect is weakly HP-sensitive exactly as predicted —
      // tankier thieves live longer but do not burn the cart faster — so the
      // scale goes up AND the top tiers get more bodies (the scoped wave
      // above), which is the lever this encounter actually trades in.
      // Halved [2026-09-01]: campaignTune wanted 1.35/1.46/1.04/1.20 — when
      // HALVING the scale still leaves ranged at 22%/8%, scale was never the
      // lever. Provisional monotonic ladder; re-walk after the confirm battery.
      // TUNE-D1: the hard/nightmare WAVE is the cliff (4% / 0%, 70-89% walled at 1.65/1.80), so the ladder flattens and the top tiers' clock does the work.
      hpScaleOverride: { easy: 1.60, medium: 1.80, hard: 1.80, nightmare: 1.90 },
    },

    // e4 — The Burning Orchard (hazard). NEW. The thieves fire the orchard to
    // cover their retreat; the party crosses ground that is actively burning
    // while hurlers make more of it. Fire is on the CROSSING, not around the
    // enemy — the same rule that makes e2's cover fair.
    e4: {
      level: 4,
      terrain: {
        theme: 'forest',
        blocked: [{ x: 3, y: 1 }, { x: 3, y: 6 }, { x: 5, y: 2 }, { x: 5, y: 5 }],
        hazards: [
          { pos: { x: 3, y: 3 }, type: 'fire' },
          { pos: { x: 3, y: 4 }, type: 'fire' },
          { pos: { x: 4, y: 2 }, type: 'fire' },
          { pos: { x: 4, y: 5 }, type: 'fire' },
        ],
      },
      enemies: ['torch_hurler', 'torch_hurler', 'goblin_scrapper', 'ember_thief'],
      // Easy meets ONE hurler: the fire still crosses your path, but only one
      // goblin is making more of it.
      enemiesByDifficulty: { easy: ['torch_hurler', 'goblin_scrapper', 'goblin_scrapper', 'ember_thief'] },
      enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 5, y: 6 }, { x: 6, y: 1 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
      goals: [
        { slug: 'through_the_smoke', name: 'Through the Smoke', description: 'Lose nobody to the fire or the hurlers.', check: { kind: 'no_party_deaths' } },
      ],
      // ⚠ First battery: medium/hard walled 27%/29% and nightmare read 0% with
      // 78% walled — a fire board punishes the same archetypes twice (you burn
      // crossing it, then fight at a deficit), so it needs a GENTLER scale
      // ladder than an open board, not a steeper one.
      // TUNE-D1 (2026-09-02): campaignTune ladder, reconciled monotonic; see LANTERN_BALANCE_NOTES §7.
      hpScaleOverride: { easy: 0.93, medium: 1.02, hard: 1.13, nightmare: 1.22 },
    },

    // e5 — The Wolfpelt Camp (siege). REUSED from the shipped e3, now at L5
    // instead of L3. Survive-the-clock, because four fast melee runners on an
    // open board is an un-winnable damage race for a ranged party — the D1
    // ranged brick this design fixed.
    e5: {
      level: 5,
      terrain: {
        theme: 'forest',
        blocked: [{ x: 3, y: 3 }, { x: 3, y: 5 }, { x: 6, y: 1 }, { x: 2, y: 2 }],
      },
      objective: {
        text: 'Hold out until the pack breaks off',
        win: [{ kind: 'round_reached', round: 7, roundByDifficulty: { easy: 6 } }],
      },
      enemies: ['wolfpelt_runner', 'wolfpelt_runner', 'wolfpelt_runner'],
      enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 4 }, { x: 5, y: 6 }],
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
        {
          enemies: ['wolfpelt_runner', 'wolfpelt_runner'],
          placement: [{ x: 7, y: 5 }, { x: 0, y: 6 }],
          trigger: { on: 'round', round: 4 },
          // Nightmare only after R3 (2026-09-01): with pounce on every runner,
          // eight bodies read 6% with the best party at 15%. Hard is six
          // runners at 1.45; nightmare is eight at 1.30 — the bodies ARE the tier.
          difficulties: ['nightmare'],
        },
      ],
      playerPlacement: [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 5 }, { x: 2, y: 5 }],
      goals: [
        { slug: 'held_the_hollow', name: 'Held the Hollow', description: 'Still standing, all four, when the pack breaks.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      // ⚠ Certified against an L3 party; at L5 the battery read TOO EASY at
      // easy/medium/hard (95/85/92% mean). Round count is the COARSE lever
      // (~25 points per step) and scale the fine one — but a survive objective
      // barely feels scale at all, so the top tiers also get a third wave.
      // Down from 1.50/1.90/2.20/2.60 [2026-09-01]: baseline medium read
      // 25/47/63 — party wipes, melee walled — on a survive whose bodies now
      // POUNCE. The leap is the threat; the tiers are the clock and the wave.
      // R2: nightmare 1% / best party 3% at 1.60 + clock 8 — eight pouncing
      // runners is already the nightmare. Scale to 1.45 (= hard), clock 7.
      // TUNE-D1: nightmare's +2 wave is the tier; scale flat at the top (tuner wanted 1.08 there — an inversion).
      hpScaleOverride: { easy: 1.25, medium: 1.28, hard: 1.31, nightmare: 1.31 },
    },

    // e6 — The Ridge Chase (race). NEW. The lantern's glow is MOVING: cut the
    // carriers off before they crest the ridge. Win by reaching the ridge line
    // (their escape route), lose on the clock — the party's first fight where
    // standing and winning the melee is the losing play.
    e6: {
      level: 5,
      terrain: {
        theme: 'forest',
        blocked: [{ x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 6 }, { x: 4, y: 7 }],
      },
      // ⚠ REBUILT after the first battery read 100% at EVERY difficulty — no
      // scale rung can fix a race nobody loses. The original won on
      // `units_at_tiles scope:'any'`: ONE unit touching a tile five steps from
      // the party's own start line, inside seven rounds. That is not a race,
      // it is a walk, and it was also a near-copy of e7's escape.
      //
      // The race is now against the CARRIERS: both ember thieves must fall
      // before they crest the ridge. Their guards stand between, so the clock
      // buys focus-fire discipline rather than footspeed — and it is a
      // genuinely different problem from e7's "get everyone out".
      objective: {
        // The brain has no flee behaviour, so a race against runners is a race
        // against DISTANCE [2026-09-01]: carriers in the far corners, warded,
        // behind two guards on the middle lane, and a clock that tightens by
        // tier. Baseline read 98-100% with the carriers dead in 19-30 turns —
        // "The target is destroyed" — a kill-all wearing a stopwatch.
        text: 'Bring down both lantern-carriers before they crest the ridge',
        win: [{ kind: 'units_dead', enemyKeys: ['ember_carrier'] }],
        // R3: without the ward and at clock 7 the race read 85/100/92 — the
        // clock is the whole race now. Medium 6 (nightmare at 6 read 27%).
        loss: [{ kind: 'round_reached', round: 6, roundByDifficulty: { easy: 8, hard: 6, nightmare: 6 } }],
      },
      enemies: ['ember_carrier', 'ember_carrier', 'goblin_scrapper', 'wolfpelt_runner'],
      // Carriers out on the far flanks with a head start; the guards plant
      // themselves in the middle lane so the party cannot simply walk at them.
      enemyPlacement: [{ x: 7, y: 1 }, { x: 7, y: 6 }, { x: 4, y: 3 }, { x: 4, y: 4 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
      goals: [
        { slug: 'cut_them_off', name: 'Cut Them Off', description: 'Reach the ridge by round 6.', check: { kind: 'win_by_round', round: 6 } },
      ],
      // PROVISIONAL. A race is won by ARRIVING, so hpScale is a weak lever
      // here (see the difficulties-scoped-wave note in types.ts) — if the
      // tiers will not separate, add a difficulty-scoped blocking wave rather
      // than chasing scale.
      // First numbers for the REBUILT race (kill both carriers on a clock).
      // TUNE-D1 (2026-09-02): campaignTune ladder, reconciled monotonic; see LANTERN_BALANCE_NOTES §7.
      hpScaleOverride: { easy: 1.40, medium: 1.50, hard: 1.50, nightmare: 1.60 },
    },

    // ── FORK 1 (L6) sits here in the graph ──────────────────────────────────

    // e7 — The Cave Mouth (escape). REUSED from the shipped e4, now at L6.
    // The win is getting THROUGH, not killing the doorman — which is what the
    // story always said and the old mechanics never did.
    e7: {
      level: 6,
      terrain: {
        theme: 'cave',
        blocked: [
          // (5,5) was opened after R2 (melee 22% draws against the one-tile
          // gap) and CLOSED again after R3: a two-tile throat let the pack pour
          // through onto the balanced comp — 13%, "party has fallen" x51.
          // The cork stays; the melee stall is the lesser cost, and the draw
          // cap ends it.
          { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 },
          { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 },
        ],
      },
      objective: {
        text: 'Push past the cave mouth — get everyone through',
        win: [{
          kind: 'units_at_tiles', scope: 'all',
          tiles: [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }],
          // B4 lever: the far side narrows at the top tiers.
          tilesByDifficulty: {
            hard: [{ x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
            nightmare: [{ x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
          },
        }],
      },
      enemies: ['orc_bruiser', 'goblin_scrapper', 'goblin_scrapper', 'goblin_slinger'],
      enemyPlacement: [{ x: 5, y: 3 }, { x: 6, y: 1 }, { x: 6, y: 4 }, { x: 6, y: 6 }],
      // Committing to the throat springs the ambush the story always described:
      // the stragglers are the ones who get caught, which is what makes an
      // all-must-escape win bite.
      waves: [
        {
          // Ambush to the FLANKS, two bodies [2026-09-01]: three spawns on
          // (3,3)/(3,4)/(2,4) landed on the back rank of a party that wants to
          // stand back — ranged read 7% at medium with stalemate DRAWs. The
          // stragglers still get caught; the archer is no longer the bait.
          enemies: ['goblin_scrapper', 'wolfpelt_runner'],
          placement: [{ x: 2, y: 1 }, { x: 2, y: 6 }],
          trigger: { on: 'door', tile: { x: 5, y: 4 } },
        },
      ],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      goals: [
        { slug: 'last_one_through', name: 'Last One Through', description: 'Get out with nobody lost in the squeeze.', check: { kind: 'no_party_deaths' } },
      ],
      // nightmare eased from the L4-certified 1.70: at L6 the smoke wiped the
      // party 6/6 (a scaled-up pack survives the throat and chases you down).
      // hard/nightmare read TOO EASY at 74%/72% mean in battery 1 — an escape
      // barely feels scale, so these climb a long way before they bite.
      // TUNE-D1 (2026-09-02): campaignTune ladder, reconciled monotonic; see LANTERN_BALANCE_NOTES §7.
      hpScaleOverride: { easy: 0.76, medium: 1.00, hard: 1.05, nightmare: 1.20 },
    },

    // e8 — The Underbridge (hold). NEW. Both ends of a span over the
    // Under-river, at once, while the way down is opened behind you. The
    // warden holds one end; he is immovable but he is NOT a corridor plug.
    e8: {
      level: 7,
      terrain: {
        theme: 'cave',
        blocked: [
          { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 6 }, { x: 2, y: 7 },
          { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 6 }, { x: 5, y: 7 },
        ],
      },
      objective: {
        // Redesigned [2026-09-01]. As a survive this was a 94-100% walkover and
        // the second of two consecutive clock-holds (palette rule). The briefing
        // always said "hold BOTH ends" — now the board does: a hero on each
        // bridgehead AT THE SAME TIME. The warden stands ON the far end
        // (immovable — kill him or he keeps it), the runner takes the near one,
        // and the waves arrive while you are split. Nightmare adds the mid-span
        // mark: three bodies on three tiles under fire.
        text: 'Take both ends of the bridge at once, before the way down closes',
        win: [{
          kind: 'units_at_tiles', scope: 'any', simultaneous: true,
          // R2 (warden ON the far mark): ranged 100 / melee 32. R3 (warden
          // BESIDE it with two friends): ranged 2 / melee 58. Both were fights
          // over one tile. The marks are now the SPAN's own bridgeheads, two
          // steps from the party's start, and the guards stand BEHIND them —
          // taking a mark costs standing in reach of a bash, not killing a
          // 62-HP wall first.
          tiles: [{ x: 1, y: 4 }, { x: 6, y: 4 }],
        }],
        loss: [{ kind: 'round_reached', round: 8, roundByDifficulty: { easy: 9, hard: 7, nightmare: 7 } }],
      },
      enemies: ['coalgate_warden', 'goblin_scrapper', 'goblin_slinger', 'wolfpelt_runner'],
      // R2: warden ON (7,4) turned the hold into "kill a 62-HP AC-12 wall in
      // 7 rounds" — ranged 100%, melee 32%. He now stands BESIDE the mark and
      // bashes whoever takes it; the runner likewise off the near one.
      enemyPlacement: [{ x: 7, y: 4 }, { x: 7, y: 3 }, { x: 7, y: 5 }, { x: 0, y: 4 }],
      waves: [
        {
          enemies: ['wolfpelt_runner', 'goblin_scrapper'],
          placement: [{ x: 0, y: 3 }, { x: 1, y: 5 }],
          trigger: { on: 'round', round: 3 },
        },
        {
          // Difficulty-scoped: the hold is won by SURVIVING, so scale barely
          // moves it. Extra pressure on the top tiers is the honest lever.
          enemies: ['goblin_slinger', 'wolfpelt_runner'],
          placement: [{ x: 7, y: 2 }, { x: 0, y: 5 }],
          trigger: { on: 'round', round: 4 },
          difficulties: ['hard', 'nightmare'],
        },
      ],
      playerPlacement: [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 4 }],
      goals: [
        { slug: 'both_ends_held', name: 'Both Ends Held', description: 'Take the span with nobody down.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      // ⚠ hard/nightmare eased hard (1.30/1.55 -> 1.00/1.10): the first battery
      // read 16%/6% with 39%/50% of builds WALLED. The round-4 scoped wave is
      // already this encounter's difficulty dial — piling a high HP scale on
      // top of two extra bodies double-charges the same tier.
      // TUNE-D1: objective cell — floors only. Nightmare's third mark removed (22% walls, ranged 7 / balanced 0).
      hpScaleOverride: { easy: 0.84, medium: 1.10, hard: 1.20, nightmare: 1.20 },
    },

    // e9 — The Dark Between (survive). NEW, and the campaign's THESIS FIGHT:
    // the party's own lantern gutters in the deep and they learn, from the
    // inside, what a warren without a hearth is. Croakers drag heroes out of
    // the formation into the black. Immediately after this fight the party
    // finds the dead Emberheart — the reveal is EARNED by having been cold.
    e9: {
      level: 8,
      terrain: {
        theme: 'cave',
        blocked: [
          { x: 2, y: 2 }, { x: 2, y: 5 }, { x: 5, y: 2 }, { x: 5, y: 5 },
          { x: 3, y: 0 }, { x: 4, y: 7 },
        ],
      },
      objective: {
        // Two croakers from the start [2026-09-01], each carrying Snuff: the
        // dark now WEAKENS the party and pulls it apart. Baseline read 97% with
        // "Every enemy has fallen" ending half the games — the thesis fight was
        // a kill-all with the lights on. Tiers are the clock.
        text: 'Keep the circle until the dark thins',
        win: [{ kind: 'round_reached', round: 7, roundByDifficulty: { easy: 6, hard: 8, nightmare: 8 } }],
      },
      enemies: ['dark_croaker', 'dark_croaker', 'wolfpelt_runner', 'goblin_slinger'],
      enemyPlacement: [{ x: 6, y: 3 }, { x: 1, y: 2 }, { x: 6, y: 5 }, { x: 1, y: 5 }],
      waves: [
        {
          enemies: ['wolfpelt_runner', 'wolfpelt_runner'],
          placement: [{ x: 0, y: 4 }, { x: 7, y: 3 }],
          trigger: { on: 'round', round: 3 },
        },
        {
          enemies: ['dark_croaker', 'goblin_scrapper'],
          placement: [{ x: 7, y: 5 }, { x: 0, y: 2 }],
          trigger: { on: 'round', round: 5 },
          // Medium added after R2 (94%, kill-all in half the games): the third
          // croaker IS the dark deepening. Easy keeps two.
          difficulties: ['medium', 'hard', 'nightmare'],
        },
      ],
      playerPlacement: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }],
      goals: [
        { slug: 'kept_the_dark_out', name: 'Kept the Dark Out', description: 'Nobody lost to the black.', check: { kind: 'no_party_deaths' } },
      ],
      // ⚠ Same double-charge as e8, and worse: 10%/4% with half the builds
      // walled. The round-5 scoped wave (a second croaker + a scrapper) is the
      // top-tier pressure; the scale must come DOWN to pay for it.
      // TUNE-D1 (2026-09-02): campaignTune ladder, reconciled monotonic; see LANTERN_BALANCE_NOTES §7.
      hpScaleOverride: { easy: 1.00, medium: 1.06, hard: 1.08, nightmare: 1.10 },
    },

    // ── FORK 2 (L9) sits here in the graph ──────────────────────────────────

    // e10 — The Scullery Run (escort). NEW. Nib the deserter cook leads the
    // party through the kitchens. He is ARMED and mobile (`follow`), which is
    // the deliberate difference from the defenseless-VIP pattern — an escort
    // who can defend himself does not need a boss-tier HP pool to stop ranged
    // parties being walled.
    e10: {
      level: 9,
      terrain: {
        theme: 'cave',
        blocked: [
          { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 5 }, { x: 3, y: 6 },
          { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 6, y: 5 },
        ],
      },
      allies: {
        nib: {
          // ⚠ 72 HP / AC 12 and NOT a token: smoke at 52/10 lost the escort in
          // every single nightmare game and most hard ones ("Your charge has
          // fallen" x2 across all three archetypes). `follow` walks an ally
          // INTO the front rank, so a follow-mode escort has to be able to
          // stand in the scrum — the flavor (a cook in stolen kitchen plate,
          // swinging a pan) is doing real mechanical work here.
          name: 'Nib the Cook', baseClass: 'cleric',
          maxHealth: 72, armorClass: 12, movementRange: 3,
          abilities: ['mace', 'heal'],
          behavior: { mode: 'follow' },
          placement: { x: 1, y: 4 },
        },
      },
      objective: {
        text: 'Get Nib to the throne-room stair',
        win: [{ kind: 'ally_at_tiles', allyKey: 'nib', tiles: [{ x: 7, y: 3 }, { x: 7, y: 4 }, { x: 6, y: 3 }] }],
        loss: [{ kind: 'ally_dead', allyKey: 'nib' }],
      },
      // ⚠ NO croaker here, deliberately. `grasp` PULLS a unit out of the
      // formation, and an escort yanked out of its guard ring dies before the
      // party can walk back to it — that is the mechanic that makes escorts
      // impossible to balance rather than merely hard. Pull effects belong in
      // encounters where the victim can be rescued.
      // Up-board and hunted [2026-09-01]: with scrappers at x=4 the fight was
      // in the party's lap and ended as a kill-all in 40% of games — an escort
      // in costume. The snatcher is the only thing that HUNTS Nib.
      enemies: ['ladle_snatcher', 'goblin_slinger', 'ember_thief', 'goblin_scrapper'],
      // Hard and nightmare send TWO snatchers after the cook.
      enemiesByDifficulty: {
        hard: ['ladle_snatcher', 'ladle_snatcher', 'goblin_slinger', 'ember_thief'],
        nightmare: ['ladle_snatcher', 'ladle_snatcher', 'goblin_slinger', 'ember_thief'],
      },
      enemyPlacement: [{ x: 6, y: 3 }, { x: 7, y: 6 }, { x: 6, y: 4 }, { x: 7, y: 2 }],
      waves: [
        {
          enemies: ['wolfpelt_runner', 'goblin_scrapper'],
          placement: [{ x: 0, y: 3 }, { x: 0, y: 5 }],
          trigger: { on: 'round', round: 3 },
        },
      ],
      playerPlacement: [{ x: 1, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 5 }, { x: 0, y: 2 }],
      goals: [
        { slug: 'the_cook_repaid', name: 'The Cook Repaid', description: 'Bring Nib through with the whole party alive.', check: { kind: 'no_party_deaths' } },
      ],
      // TOO EASY at easy/medium/hard in battery 1 (95/76/72% mean).
      // TUNE-D1 (2026-09-02): campaignTune ladder, reconciled monotonic; see LANTERN_BALANCE_NOTES §7.
      hpScaleOverride: { easy: 1.50, medium: 1.60, hard: 1.90, nightmare: 2.20 },
    },

    // e11 — The Undervault (rooms). NEW. Two rooms: the cold hall where the
    // Emberheart sits dead, then the throne approach. HP and cooldowns carry
    // across the door, so room 1 is a resource decision, not a warm-up.
    e11: {
      level: 10,
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
      rooms: [
        // ⚠ Five enemies across the two rooms, not seven, and no wall on the
        // crossing lane. The first draft ran 3+4 with blockers at (4,3)/(4,4)
        // — dead centre of the approach, screening a slinger behind them —
        // and melee read 0% at EVERY difficulty while ranged coasted. That is
        // the e2 lesson repeating: cover on the approach helps the crosser,
        // cover between the crosser and a shooter only taxes them. Blockers
        // now flank the lane instead of plugging it.
        {
          terrain: {
            theme: 'cave',
            blocked: [{ x: 3, y: 1 }, { x: 3, y: 6 }, { x: 5, y: 2 }],
          },
          // ember_warden here, not in room 2 (R2: paired with the croaker's
          // snuff + grasp he walled ranged at 25%). Room 1 has no puller.
          // ember_warden tried here (R3) and in room 2 (R2): flame_jet's
          // unblockable line walls a ranged party wherever he stands (8% / 25%).
          // He is out of e11; the definition stays for e12's court.
          enemies: ['coalgate_warden', 'goblin_scrapper'],
          enemyPlacement: [{ x: 5, y: 3 }, { x: 5, y: 4 }],
          exitDoors: [{ x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
        },
        {
          terrain: {
            theme: 'cave',
            blocked: [{ x: 4, y: 1 }, { x: 4, y: 6 }, { x: 2, y: 2 }],
          },
          enemies: ['dark_croaker', 'ember_thief', 'goblin_scrapper'],
          enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 5 }, { x: 5, y: 4 }],
          entryTiles: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
        },
      ],
      // Walked (80 builds x 25): 1.60 -> 84% mean · 1.75 -> 72%, 4% walls ✓ ·
      // 1.90 -> 56%, 16% walls · 2.20 -> 24%, 58% walls. A brutally steep cliff
      // — five enemies across two rooms all cross their focus-fire breakpoints
      // together — so the tiers are packed tight on purpose.
      // TUNE-D1 (2026-09-02): campaignTune ladder, reconciled monotonic; see LANTERN_BALANCE_NOTES §7.
      hpScaleOverride: { easy: 1.65, medium: 1.74, hard: 1.87, nightmare: 2.01 },
    },

    // e12 — The Lantern Court (boss). REUSED from the shipped e5, now at L10
    // against a party with double special charges — so the old numbers are a
    // starting point only. Kill-target: only Grubnash must fall, and the
    // shaman is a complication you may solve or race past, never a scripted
    // "kill the healer first" (CAMPAIGN_BEATS §2 ban #3).
    e12: {
      level: 10,
      terrain: {
        theme: 'cave',
        blocked: [{ x: 3, y: 3 }, { x: 3, y: 5 }, { x: 6, y: 6 }, { x: 2, y: 1 }],
      },
      objective: {
        text: 'Bring down King Grubnash',
        win: [{ kind: 'units_dead', enemyKeys: ['king_grubnash'] }],
      },
      // [2026-09-01] The King has a kit (crown_blaze, MINE!), the shaman wards
      // him once instead of mending forever (CAMPAIGN_BEATS §2 #3), and a
      // slinger pins whoever he drags in. Baseline: 90% at medium.
      enemies: ['king_grubnash', 'moss_shaman', 'goblin_scrapper', 'goblin_slinger'],
      enemyPlacement: [{ x: 5, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 5 }, { x: 4, y: 2 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      goals: [
        { slug: 'crowned_yourself', name: 'Crowned Yourself', description: 'Let the hero strike the final blow.', check: { kind: 'killing_blow_by_main' } },
      ],
      // ⚠ Was certified at L5. At L10 the party has double special charges and
      // full Deep Gifts — expect these to rise substantially.
      // Walked (80 builds x 25): 1.35 -> 83% mean · 1.50 -> 66%, 10% walls ✓ ·
      // 1.60 -> 57%, 17% walls · 2.20 -> 12%, 87% walls. The old L5-certified
      // row (0.72-1.13) read 100% at EVERY tier against an L10 party with
      // double special charges — the single largest gap the rebuild created.
      // TUNE-D1: bossViability read p75 100% at hard and median 72% at nightmare — a walkover for every class.
      hpScaleOverride: { easy: 1.60, medium: 1.80, hard: 2.05, nightmare: 2.20 },
    },
  },

  nodes: {
    intro: {
      kind: 'story',
      text: 'On the eve of the Harvest Festival, the great Lantern of Elmsworth vanishes from the village square — and goblin tracks lead east into the Bramblewood. The elders wring their hands. The festival cannot happen in the dark.\n\n{mainName} steps forward. "We\'ll bring it back before the first dance."\n\nThree companions shoulder their packs and follow you onto the east road. Behind you the square is very quiet, and colder than an autumn evening has any business being.',
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
      preText: 'The scouts lead you straight to the old mill and dive behind their friends. A slinger scrambles up beside the mill wheel, sling already spinning. The sack they dropped is full of festival pastries — and, oddly, charcoal.',
      next: 'lv3',
    },
    lv3: { kind: 'levelup', level: 3, next: 'cart_note' },
    cart_note: {
      kind: 'story',
      text: '{if helpedMiller}The grateful miller will not let you leave empty-handed.{else}Word of the chase reaches Elmsworth before you do.{/if} By dusk a wagon comes creaking up the east road after you — the village brazier, packed in sand, still burning.\n\n"If the Lantern\'s gone," says the carter, "the festival still needs a FIRE. You get the light. We\'ll keep this lit until you do."\n\nIt is a kind, impractical, entirely Elmsworth idea. And within the hour, {mainName}, something in the trees decides it wants those coals very badly indeed.',
      next: 'e3_pre',
    },
    e3_pre: {
      kind: 'encounter', encounter: 'e3',
      preText: 'They come out of the bramble for the CART, not for you — quick little shapes with cloth-wrapped hands, reaching straight past your blades for the hot coals.\n\nThe carter dives clear. The brazier cannot run and cannot fight. Six rounds until the wagon-team is hitched and away, {mainName}. Keep it burning.',
      next: 'lv4',
    },
    lv4: { kind: 'levelup', level: 4, next: 'orchard_note' },
    orchard_note: {
      kind: 'story',
      text: 'The thieves flee east through the old orchard — and set it alight behind them.\n\nIt is not spite. You watch them do it: they touch a torch to the low branches almost apologetically, hands wrapped in the same rags they used for the coals, and run on cradling their stolen fire like an egg.\n\n"They\'re not burning the orchard to stop us," your companion says slowly. "They\'re burning it because they can\'t carry enough."',
      next: 'e4_pre',
    },
    e4_pre: {
      kind: 'encounter', encounter: 'e4',
      preText: 'Smoke lies flat between the rows and the fire is spreading with the wind — across your path, not theirs. Torch hurlers stand in the clear ground beyond, lobbing more of it into the gaps you would most like to use.\n\nThere is no way around, {mainName}. Only through, and only where the ground is not yet burning.',
      next: 'lv5',
    },
    lv5: { kind: 'levelup', level: 5, next: 'hollow_note' },
    hollow_note: {
      kind: 'story',
      text: 'Past the orchard the land drops into the Howling Hollow, and dusk comes down with it. From the treeline comes a long, wobbly howl — enthusiastic, but not very wolf-like. A second joins in, badly out of tune.\n\nThey are thinner than they should be, these wolfpelts. You can see it even at this distance, even under the pelts: too much shoulder, not enough belly. Something has been going hungry in the Bramblewood for a while now.',
      next: 'e5_pre',
    },
    e5_pre: {
      kind: 'encounter', encounter: 'e5',
      preText: 'The pack bursts from the trees — goblins in wolf pelts, sprinting on all fours, coming from three directions at once. The pelts have button eyes sewn on. The daggers are real.\n\nAnd they keep howling for friends. You will not clear this hollow, {mainName} — you only have to still be standing when they lose their nerve. Put the trees at your back and HOLD.',
      next: 'ridge_note',
    },
    ridge_note: {
      kind: 'story',
      text: 'The pack breaks and scatters into the dark, and in the sudden quiet somebody points east.\n\nThere — high on the ridge, moving fast — a warm gold glow, bobbing along at a dead run. Your lantern, {mainName}, in somebody\'s arms, going up and over.\n\nOnce it crosses that ridge line the trail forks four ways into the deep rock, and you will be guessing for a week.',
      next: 'e6_pre',
    },
    e6_pre: {
      kind: 'encounter', encounter: 'e6',
      preText: 'It is a footrace with knives in it. The carriers have the head start and the ridge is seven rounds away at a sprint.\n\nDo not stop to win the fight, {mainName}. Winning the fight IS losing the race — get somebody onto that ridge line.',
      next: 'fork_woods',
    },
    // ── FORK 1 (level 6): the boon fork. Both options are equal-weight and
    //    both lead to the cave mouth. ──────────────────────────────────────
    fork_woods: {
      kind: 'choice',
      text: 'You catch them at the ridge — and they drop the Lantern and run, which no thief has ever done in the history of thieving.\n\nBelow, in the scrub, the wolfpelts have regrouped. Not charging. Just watching the party eat, with the terrible patience of something that has not eaten in a while.\n\nYou have three days of provisions and a long dark descent ahead of you, {mainName}. And a decision.',
      choices: [
        { label: 'Set the provisions out for the pack — they are starving.', setFlags: { fedPack: true }, grantAchievement: 'fed_the_pack', grantBoon: 'fed_the_pack', next: 'cave_note' },
        { label: 'Keep the packs full — the deep rock is no place to go hungry.', setFlags: { fedPack: false }, grantAchievement: 'kept_the_larder', grantBoon: 'kept_the_larder', next: 'cave_note' },
      ],
    },
    cave_note: {
      kind: 'story',
      text: '{if fedPack}The wolfpelts take the food without a sound and vanish. Some way down the trail you notice the howling has stopped following you — and, a mile on, a fresh-killed hare left square in the middle of the path, which is either a gift or a very pointed comment.{else}The party keeps its larder and the wolfpelts keep their distance, howling from the ridge until the dark swallows the sound. Whatever else the descent brings, nobody in this company will be going hungry in it.{/if}\n\nAt the bottom of the trail, a warm orange glow spills from a cave mouth in the hillside. Not lantern-light. Firelight, and a lot of it — the Bramblewood goblins have taken every stolen ember down this hole.\n\nSomething very large is snoring just inside the entrance.',
      next: 'e7_pre',
    },
    e7_pre: {
      kind: 'encounter', encounter: 'e7',
      preText: 'The snoring stops. An orc bruiser fills the cave mouth like a boulder with shoulders, and he does not intend to move — so do not waste the evening trying to make him.\n\nThe gap beside him is barely wide enough for one. Scrappers slip along the walls to catch you in the squeeze. Get the whole party through to the far side, {mainName}, and let the doorman keep his door.',
      next: 'lv7',
    },
    lv7: { kind: 'levelup', level: 7, next: 'bridge_note' },
    bridge_note: {
      kind: 'story',
      text: 'Beyond the cave mouth the passage opens into a hall no goblin ever carved: a stone span over a black river, with lamp-brackets set into the walls every ten feet.\n\nEvery bracket is empty. Every one of them is scorched — decades of soot, centuries of it, and not a coal left anywhere.\n\n"{mainName}," says your companion quietly, "this place used to be LIT."',
      next: 'e8_pre',
    },
    e8_pre: {
      kind: 'encounter', encounter: 'e8',
      preText: 'They hit the span from both ends at once — a warden anchoring the far side, runners pouring in behind you. The bridge is the only way down and it is exactly wide enough to be a problem.\n\nSix rounds to hold both ends, {mainName}. Give up either one and you are fighting in two directions on a stone ribbon over a river.',
      next: 'lv8',
    },
    lv8: { kind: 'levelup', level: 8, next: 'dark_note' },
    dark_note: {
      kind: 'story',
      text: 'Below the bridge the warren goes properly dark.\n\nNot unlit — EXTINGUISHED. Cold hearths in every side-chamber, swept clean and stacked with kindling that nobody has lit. Sleeping-nooks crowded three deep around the chimney stones, as if the whole warren had been huddling in the same few rooms for weeks.\n\nAnd then your own lantern gutters, gasps, and goes out. Something in the dark makes a sound like a very large frog being polite.',
      next: 'e9_pre',
    },
    e9_pre: {
      kind: 'encounter', encounter: 'e9',
      preText: 'You cannot see the walls. You can see each other, barely, and that only while somebody keeps a blade raised to catch what light there is.\n\nThings come out of the black, take hold, and pull — and whoever gets pulled out of the circle is alone in a way that does not bear thinking about. Seven rounds until the dark thins, {mainName}. Keep the circle.',
      next: 'emberheart',
    },
    emberheart: {
      kind: 'story',
      text: 'When the dark finally thins, the party is standing in the biggest chamber yet — and at the center of it, in a firepit forty feet across, sits the reason for all of this.\n\nThe Emberheart. A hearth-stone the size of a cottage, banked and tended and fed for nine hundred years by every goblin generation of the Bramblewood.\n\nIt is dead. Grey through and through, cold as the river, with a month of untouched kindling stacked around it in hopeful little pyramids.\n\nA goblin child is asleep against the base of it, wrapped in three coats.\n\n"They didn\'t steal our light because they\'re thieves," {mainName} says, and nobody in the party has an answer to that. "They stole it because theirs went out and they were too proud to knock."',
      next: 'fork_door',
    },
    // ── FORK 2 (level 9): the boon fork. ────────────────────────────────────
    fork_door: {
      kind: 'choice',
      text: 'The throne room is one level up, and there are two ways into it.\n\nA goblin in a stained apron detaches himself from the shadows by the cold ovens and clears his throat. "Name\'s Nib. Cook. Was a cook." He looks at the dead Emberheart, then at the Lantern in your hands, and something in his face gives up. "There\'s a scullery stair nobody guards. I\'ll walk you up it. Just — don\'t let them scrap the little ones over a hat."\n\nThe other road is the Coalgate: wardens, shields, and a straight fight up the main stair.',
      choices: [
        { label: 'Follow Nib up the scullery stair.', setFlags: { tookScullery: true }, grantAchievement: 'the_scullery_door', grantBoon: 'scullery_door', next: 'e10_pre' },
        { label: 'Force the Coalgate and go up the front way.', setFlags: { tookScullery: false }, grantAchievement: 'the_coalgate', grantBoon: 'coalgate_forced', next: 'e10_pre' },
      ],
    },
    // Diamond: both fork branches run the SAME escort — either Nib guides you
    // up the quiet stair, or he insists on coming along through the kitchens
    // once the Coalgate proves louder than advertised.
    e10_pre: {
      kind: 'encounter', encounter: 'e10',
      preText: '{if tookScullery}Nib leads, and Nib is not quiet. Pans, apparently, are not designed for stealth.{else}The Coalgate goes down in splinters — and the noise brings every scullery in the warren out at once. Nib appears at your elbow anyway, ladle in hand, looking grimly resigned. "Front way. Course it was the front way."{/if}\n\nGet the cook to the throne-room stair, {mainName}. He is armed, he is willing, and he is the only one down here still speaking to you.',
      next: 'lv10',
    },
    lv10: { kind: 'levelup', level: 10, next: 'e11_pre' },
    e11_pre: {
      kind: 'encounter', encounter: 'e11',
      preText: 'Two chambers stand between the party and the throne: the cold hall where the Emberheart sits grey, and the throne approach beyond it.\n\nNo rest between them, {mainName}. Whatever you spend in the first room, you fight the second without.',
      next: 'court_approach',
    },
    court_approach: {
      kind: 'story',
      text: 'The throne room is warm. It is the only warm room in the Bramblewood, and it is warm because every stolen coal, every pilfered ember, every lamp and brazier and candle-stub from three days of raiding is heaped around one chair.\n\nAtop a throne of stolen furniture sits King Grubnash — an orc twice the size of his goblin subjects, wearing the Harvest Lantern as a crown, and looking less pleased with himself than the stories promised.\n\n"MINE," he announces, without much conviction. "Prettiest hat in the Bramblewood."\n\nNib, very quietly, from behind you: "It\'s been the warmest room since the Heart went out. He sits in it so the little ones can have the rest."\n\n"{mainName}," whispers your companion, "the crown is what we came for. Drop the King and the court scatters — but mind the shaman. Every wound you open, she closes."',
      next: 'e12_pre',
    },
    e12_pre: {
      kind: 'encounter', encounter: 'e12',
      preText: 'King Grubnash rises, lantern-crown blazing, and for one moment he looks exactly like what he is: a very large orc, standing between a cold warren and the last warm thing in it.\n\nThen he swings, and the moment is over.\n\nOnly the King has to fall, {mainName}. Silence the shaman first and take your time, or throw everything at the throne and hope he drops before she can mend him.',
      next: 'finale',
    },
    finale: {
      kind: 'end',
      text: 'Grubnash goes down like a felled oak, and the court scatters exactly as promised — out of the warm room, into the cold.\n\nThe Lantern is heavier than it looks. Warmer, too. {mainName} stands in a dead goblin warren holding a light that a village is waiting up for, and does the arithmetic that the whole descent has been building toward: one lantern, one festival, one night. Or one hearth, nine hundred years old, and a warren that will not see another winter without it.\n\nIt is not, in the end, a very hard sum.\n\nThe Emberheart takes the flame like something waking from a long faint — a crawl of orange through grey stone, then a breath of heat that knocks the kindling-pyramids over, then a roar. Goblins come out of the side-passages at a dead run, and stop, and stare, and start shouting for people who are still asleep.\n\nNib puts a pan on before the party is out of the chamber.\n\nElmsworth gets its festival two days late, in the dark, by candlelight — and every candle in the square was carried up out of the Bramblewood by somebody small and green who wanted to see what a harvest dance looked like. {if helpedMiller}The miller\'s family leads the first one.{else}The recovered pastries are served at the head table, only slightly dented.{/if} {if fedPack}The wolfpelts do not come to the square, but a great many hares are found on the village road that week, laid out very deliberately in the middle of the path.{/if}\n\nKing Grubnash, thoroughly dethroned, was last seen wearing a bucket and arguing about seating arrangements.\n\nTHE LANTERN OF ELMSWORTH — COMPLETE',
    },
  },
};
