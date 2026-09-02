/**
 * goblinopolis.ts — "The Bell of Goblinopolis" (PAID).
 *
 * ═══ GROUND-UP REDESIGN 2026-08-24 (TRILOGY_REDESIGN.md §4) ═══════════════
 * Was a 5-encounter teaser built on the trilogy's shared skeleton (festival →
 * theft → pincer ambush → gate brute → boss-plus-healer). Now a full L1→10
 * album: 12 encounters, forks at L6 and L9.
 *
 * THE DRIVER CHANGED, and that is the point. Nobody steals anything. Amrun's
 * flood-bell simply CRACKED, the only foundry that can cast a replacement is
 * in Goblinopolis, and the rain season is three weeks out. The campaign is a
 * DELIVERY — one of the two structures CAMPAIGN_BEATS §6 lists as never used
 * — and the whole map is the obstacle. The trilogy's stolen-object driver now
 * belongs to Lantern alone (§2 bans 1 and 2, repaid by giving each beat to
 * exactly one campaign).
 *
 * VILLAIN: Undersecretary Snagg, a middle-clerk whose entire authority exists
 * only while the delivery is stalled. Not evil — LOAD-BEARING. If the bell
 * moves, he goes back to filing. Menacing the way a records office is
 * menacing, which is the register this campaign has always been best at and
 * never fully committed to.
 *
 * TWIST: "the permission always existed." The last permit needs the Warboss's
 * seal — and Gurm signed it years ago, a standing order that bells always pass
 * ("wars are loud enough"). Snagg has been sitting on the signed form the
 * entire campaign. This retires Gurm as a boss (the old twist, "a schemer
 * played both sides", is spent 2/3 across the trilogy and is retired
 * everywhere) and keeps him as its best cameo.
 *
 * ENDING: not a boss. Snagg falls MID-campaign at e9, and the finale is the
 * race the whole story promised — rain falling, lower town flooding, get the
 * bell up the tower and ring it. CAMPAIGN_BEATS §7.6 asked for a finale that
 * is not a boss fight; this is one.
 *
 * ⚠ ART: this campaign has NO tile theme yet. Its whole setting is urban and
 * the shipped set is crypt/cave/forest/snow/ice — town/interior/canal tiles
 * are requested in TILE_ART_SPEC.md v2. Every encounter below is authored so
 * that adding `theme: 'town' | 'interior' | 'canal'` later is a one-line
 * change per encounter; the fiction already names which one it wants.
 *
 * BALANCE: hpScaleOverride values are PROVISIONAL except where a reused
 * encounter's D2 numbers are noted. The battery is the balance pass.
 */
import { CampaignDefinition } from './types.js';

export const goblinopolisCampaign: CampaignDefinition = {
  slug: 'goblinopolis',
  title: 'The Bell of Goblinopolis',
  blurb: 'Amrun\'s flood-bell has cracked, the rain is three weeks out, and the only foundry that can cast a new one is in a city where moving a bell requires a form nobody has invented yet.',
  enemyFactionName: 'Bluecaps',
  free: false,
  startNode: 'intro',
  // TODO(skins): no skin system yet — unlock recorded in campaign meta locally.
  rewardSkin: { classSlug: 'ranger', skinId: '40101', name: 'Bluecap Pathfinder' },

  achievements: [
    // Completion slugs UNCHANGED so existing meta stays valid.
    { slug: 'complete_easy',      name: 'Bell-Road Beginner', description: 'Complete The Bell of Goblinopolis on Easy.' },
    { slug: 'complete_medium',    name: 'Buckbridge Deputy',  description: 'Complete The Bell of Goblinopolis on Medium.' },
    { slug: 'complete_hard',      name: 'Goblinopolis Envoy', description: 'Complete The Bell of Goblinopolis on Hard.' },
    { slug: 'complete_nightmare', name: 'Ringer of the Impossible Bell', description: 'Complete The Bell of Goblinopolis on Nightmare — unlocks the Bluecap Pathfinder skin.' },
    // L6 fork
    { slug: 'the_sparkyard',   name: 'The Sparkyard Route', description: 'Take the bell through the foundry district.' },
    { slug: 'the_ledger_quarter', name: 'The Ledger Quarter', description: 'Take the bell through the old clerks\' quarter.' },
    // L9 fork
    { slug: 'published_the_lot', name: 'Published the Lot',  description: 'Nail every stalled permit to the Records Hall door.' },
    { slug: 'returned_by_hand',  name: 'Returned by Hand',   description: 'Carry every stalled permit back to the goblin who filed it.' },
    // Battle goals — slugs match the goal slugs below.
    { slug: 'nothing_pilfered', name: 'Nothing Pilfered',  description: 'Hold the foundry yard without losing anyone.' },
    { slug: 'not_a_scratch',    name: 'Not a Scratch',     description: 'Bring the bell-wagon through its first mile untouched.' },
    { slug: 'exact_change',     name: 'Exact Change',      description: 'Clear the tollgate without losing anyone.' },
    { slug: 'in_triplicate',    name: 'In Triplicate',     description: 'Clear the Office of Forms with the whole party standing.' },
    { slug: 'dry_pages',        name: 'Dry Pages',         description: 'Cross the Ink Works without losing anyone to the fire.' },
    { slug: 'cleared_customs',  name: 'Cleared Customs',   description: 'Clear the customs barge by round 6.' },
    { slug: 'true_weight',      name: 'True Weight',       description: 'Hold both scale platforms with nobody down.' },
    { slug: 'held_the_yard',    name: 'Held the Yard',     description: 'Survive the impound yard with the whole party standing.' },
    { slug: 'audited_him',      name: 'Audited Him',       description: 'Let the hero personally close Snagg\'s file.' },
    { slug: 'above_the_water',  name: 'Above the Water',   description: 'Survive the first rain without a single loss.' },
    { slug: 'up_the_stair',     name: 'Up the Stair',      description: 'Carry the bell up the Stair of Stamps with nobody lost.' },
    { slug: 'rung_on_time',     name: 'Rung On Time',      description: 'Ring the flood-bell by round 7.' },
  ],

  boons: {
    // L6 pairing: armor vs reach. Deliberately a different axis from
    // Lantern's (HP vs movement) and both paid campaigns' (shield/HP, move/AC).
    sparkyard_plate: {
      slug: 'sparkyard_plate', name: 'Sparkyard Plate',
      description: 'Foundry offcuts, hammered to fit — +2 armor class for the rest of the run.',
      effects: { partyArmorClass: 2 },
    },
    ledger_boots: {
      slug: 'ledger_boots', name: 'Ledger-Runner Boots',
      description: 'The quarter\'s couriers know every shortcut — +1 movement range for the rest of the run.',
      effects: { partyMovement: 1 },
    },
    // L9 pairing: the city's goodwill, two ways.
    the_published_lot: {
      slug: 'the_published_lot', name: 'Published the Lot',
      description: 'A city that suddenly owes you a favor — every unit starts each remaining encounter shielded.',
      effects: { startShielded: 'all' },
    },
    returned_by_hand: {
      slug: 'returned_by_hand', name: 'Returned by Hand',
      description: 'Fed at every door you knocked on — +6 max HP for the rest of the run.',
      effects: { partyMaxHp: 6 },
    },
  },

  // A6 — Goblinopolis's own abilities (2026-09-01 redesign). The campaign
  // shipped with none; its villain was "warlock + grasp" and the brief's own
  // line for him — "drags you back into the queue you were trying to leave"
  // — is an ability, so now it is one.
  abilities: {
    // The Ironbell Wardens' signature: they do not kill you, they CONFISCATE
    // you. Two turns rooted on a switchback stair (e11) or a flooding street
    // is the campaign's whole threat in one verb. Counterplay: purify, or
    // never end a turn in a warden's reach. Sized above Sword's 11 so the
    // brain prefers it (kit-probe rule: a special must out-score the basic).
    impound: {
      id: 'impound', slug: 'impound', name: 'Impound',
      description: 'Seized under Annex Four: 14 damage to an adjacent enemy, and they are rooted for 2 turns.',
      targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 99,
      canTargetAlly: false, isSpecial: true, isUnblockable: false,
      excludeAllies: false, areaShape: 'chebyshev', isMultiHit: false,
      effects: [
        { type: 'damage', formula: 'flat', value: 14 },
        { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 2 },
      ],
    },
    red_tape: {
      id: 'red_tape', slug: 'red_tape', name: 'Red Tape',
      description: 'A flurry of forms lands on a tile within 4 steps: 2 unblockable damage to every enemy around it, and they are weakened for 2 turns.',
      // Targeted (R2: self-centred at r2 it was cast 0.33/game and a ranged
      // party kited an immovable Snagg for 100% twice running).
      targetingType: 'aoe', range: 4, areaRadius: 1, cooldownTurns: 99,
      canTargetAlly: false, isSpecial: true, isUnblockable: true,
      excludeAllies: true, areaShape: 'chebyshev', isMultiHit: false,
      effects: [
        { type: 'damage', formula: 'flat', value: 2 },
        { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 2 },
      ],
    },
  },

  enemies: {
    bluecap_scout: {
      baseClass: 'ranger', name: 'Bluecap Scout',
      maxHealth: 36, armorClass: 10,
      nightmare: { acBonus: 1 },
    },
    // The city's couriers. Fast, and always carrying something away from you.
    bellrunner: {
      baseClass: 'rogue', name: 'Bellrunner',
      // Vengeful: a courier who has been caught once runs harder. Counterplay:
      // finish what you start on him — a half-dead runner is the dangerous one.
      passiveFlags: ['vengeful'],
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
    kettlehelm_orc: {
      baseClass: 'fighter', name: 'Kettlehelm Orc',
      // Thorns: it is a KETTLE. Hitting it hurts. Counterplay: shoot it, or
      // strike from the diagonal (thorns is orthogonal-only).
      passiveFlags: ['thorns'], thornsDamage: 4,
      maxHealth: 47, armorClass: 12, specialSlug: 'shield_bash',
      nightmare: { hpBonus: 6, passiveFlags: ['immovable'] },
    },
    mudboot_bruiser: {
      baseClass: 'barbarian', name: 'Mudboot Bruiser',
      passiveFlags: ['vengeful'],
      maxHealth: 46, armorClass: 9, specialSlug: 'shockwave',
      nightmare: { hpBonus: 5 },
    },
    patchcoat_mender: {
      baseClass: 'cleric', name: 'Patchcoat Mender',
      maxHealth: 46, armorClass: 11, specialSlug: 'heal',
      nightmare: { hpBonus: 4 },
    },
    ironbell_warden: {
      baseClass: 'fighter', name: 'Ironbell Warden',
      abilities: ['sword', 'impound'],
      maxHealth: 62, armorClass: 12,
      passiveFlags: ['immovable'],
      nightmare: { hpBonus: 6 },
    },
    // ── NEW ──────────────────────────────────────────────────────────────
    // The villain. Warlock chassis: Grasp is a clerk's true weapon — it drags
    // you back into the queue you were trying to leave.
    undersecretary_snagg: {
      baseClass: 'warlock', name: 'Undersecretary Snagg',
      // Grasp pulls you back into the queue; Red Tape is the queue. Baseline:
      // a ranged party kited him for a free 100% at medium.
      abilities: ['eldritch', 'grasp', 'red_tape'],
      maxHealth: 92, armorClass: 11, specialSlug: 'grasp',
      // Stalwart: a desk does not move, and it does not get rooted. Immovable
      // stays (he is furniture). Counterplay is the clerks, not the pull.
      passiveFlags: ['immovable', 'stalwart'],
      nightmare: { hpBonus: 8, passiveFlags: ['warded'] },
    },
    // Snagg's department. Two flavours so the Records Hall is not a mirror
    // match: one stamps, one files.
    clerk_of_seals: {
      baseClass: 'cleric', name: 'Clerk of Seals',
      // Warded: the seal is on HERSELF too. The order trap at e9: she wards
      // Snagg once; bait it with a small hit, then commit the big one.
      passiveFlags: ['warded'],
      maxHealth: 44, armorClass: 10, specialSlug: 'ward',
      nightmare: { hpBonus: 4 },
    },
    clerk_of_stamps: {
      baseClass: 'rogue', name: 'Clerk of Stamps',
      maxHealth: 38, armorClass: 9, specialSlug: 'expose',
      nightmare: { acBonus: 1 },
    },
    // Flood-night opportunists — not the city, just people in a bad hour.
    wet_boot_looter: {
      baseClass: 'rogue', name: 'Wet-Boot Looter',
      maxHealth: 34, armorClass: 8, movementRange: 4,
      nightmare: { acBonus: 1 },
    },
    // e10's looters: the same people in a worse hour, and these ones want
    // the BELL. Dedicated definition so the hunt hint reaches e10 only.
    flood_looter: {
      baseClass: 'rogue', name: 'Wet-Boot Looter',
      maxHealth: 34, armorClass: 8, movementRange: 4,
      aiHints: { priorityTarget: 'ally' },
    },
    // Inspectors: the barge's authority, and genuinely just doing their jobs.
    customs_inspector: {
      baseClass: 'ranger', name: 'Customs Inspector',
      maxHealth: 42, armorClass: 11, specialSlug: 'pinning',
      nightmare: { acBonus: 1 },
    },
  },

  encounters: {
    // ═══ PALETTE ════════════════════════════════════════════════════════════
    // e1 kill-all · e2 escort · e3 carve · e4 rooms · e5 hazard · e6 race ·
    // e7 hold · e8 siege · e9 boss · e10 survive · e11 escape · e12 race.
    // Eleven distinct types across twelve encounters; `race` repeats at e6 and
    // e12, non-consecutively, and the finale reprise is deliberate — the
    // campaign's whole promise is "get the bell there in time", so it opens
    // that question at the customs barge and answers it at the belfry.
    // ════════════════════════════════════════════════════════════════════════

    // e1 — The Foundry Yard (kill-all). Tutorial. Deliberately NOT a pincer:
    // that shape belongs to Lantern alone now. Thieves come over ONE wall in
    // two beats, so the first fight teaches "hold a line and focus fire"
    // rather than "you are surrounded".
    e1: {
      level: 1,
      terrain: { theme: 'town' },
      // Rebuilt to its brief [2026-09-01] — "dockside metal-thieves come over
      // one wall, in two beats". Shipped as two ARCHERS and a looter, which at
      // L1 (no specials) out-traded a ranged party at every scale the tuner
      // tried and every distance the sweep tried: ranged 25 / 5 / 0 at
      // medium / hard / nightmare. Thieves are knives, and they come in two
      // beats: two over the wall now, two more on round 2.
      enemies: ['wet_boot_looter', 'wet_boot_looter', 'bluecap_scout'],
      // spreadSweep +1 (2026-09-01): ranged 23 -> 62, spread 70 -> 33.
      enemyPlacement: [{ x: 5, y: 4 }, { x: 6, y: 5 }, { x: 6, y: 4 }],
      // Second beat is ONE thief on round 3 (R2: two on round 2 made five
      // Twin-Strike bodies at L1 — 8 / 2 / 8 across the comps).
      waves: [
        { enemies: ['wet_boot_looter'], placement: [{ x: 7, y: 2 }], trigger: { on: 'round', round: 3 } },
      ],
      playerPlacement: [{ x: 2, y: 3 }, { x: 2, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
      noSpecials: true,
      goals: [
        { slug: 'nothing_pilfered', name: 'Nothing Pilfered', description: 'Hold the yard without losing anyone.', check: { kind: 'no_party_deaths' } },
      ],
      // ⚠ TUTORIAL EXEMPTION at easy AND medium (CAMPAIGNS.md §Balancing).
      // Retuned 2026-08-24 with the rest of the catalog's e1s: 1.46 -> 74%
      // mean, 1.32 -> 84%/88% median, 1% walls.
      // Provisional after the rebuild (five bodies now, not three); the tuner
      // re-walks this on the new content.
      hpScaleOverride: { easy: 0.90, medium: 1.00, hard: 1.10, nightmare: 1.20 },
    },

    // e2 — The First Mile (escort). The campaign's thesis in one fight: the
    // BELL is the escorted unit. It cannot fight, it cannot dodge, and it
    // moves on a fixed route — every later encounter is a variation on
    // "protect the thing you are delivering".
    //
    // ⚠ The wagon is an OBJECT, authored tough from the start (96 HP,
    // immovable, no kit) for the reason CAMPAIGN_BEATS §2 #10 records: both
    // prior defenseless-VIP encounters had to be rescued late with a boss-tier
    // HP pool or ranged parties get walled. Spend the beat honestly.
    e2: {
      level: 2,
      terrain: {
        theme: 'town',
        blocked: [{ x: 3, y: 1 }, { x: 3, y: 6 }],
      },
      allies: {
        wagon: {
          name: 'The Bell-Wagon', baseClass: 'fighter',
          // 96 -> 120 [2026-09-01]: the wagon does not scale with hpScale.
          maxHealth: 120, armorClass: 10, movementRange: 2,
          abilities: [],
          behavior: { mode: 'route', waypoints: [{ x: 4, y: 4 }, { x: 7, y: 4 }] },
          placement: { x: 1, y: 4 },
        },
      },
      objective: {
        text: 'Get the bell-wagon down the road',
        win: [{ kind: 'ally_at_tiles', allyKey: 'wagon', tiles: [{ x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }] }],
        loss: [{ kind: 'ally_dead', allyKey: 'wagon' }],
      },
      // ⚠ Battery 1 read 100% at EVERY tier: the wagon's route is six tiles at
      // movement 2, so it arrived in three turns with three enemies still
      // walking toward it. An escort with nothing intercepting it is a walk.
      enemies: ['bluecap_scout', 'wet_boot_looter', 'bellrunner'],
      // Off the road [2026-09-01]: at (5,3)/(5,5)/(6,4) the line stood ON the
      // wagon's route, so the escort walked into a wall a ranged party could
      // not screen — ranged read 15% at medium, "party has fallen" x40. The
      // opportunists now come at the road from the eaves, as the story says.
      enemyPlacement: [{ x: 6, y: 1 }, { x: 6, y: 6 }, { x: 7, y: 2 }],
      waves: [
        { enemies: ['wet_boot_looter', 'bluecap_scout'], placement: [{ x: 4, y: 1 }, { x: 4, y: 6 }], trigger: { on: 'round', round: 2 } },
        { enemies: ['bellrunner'], placement: [{ x: 4, y: 4 }], trigger: { on: 'round', round: 3 }, difficulties: ['nightmare'] },
      ],
      playerPlacement: [{ x: 1, y: 3 }, { x: 2, y: 4 }, { x: 1, y: 5 }, { x: 0, y: 4 }],
      goals: [
        { slug: 'not_a_scratch', name: 'Not a Scratch', description: 'Finish with the whole party standing.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 0.95, medium: 1.12, hard: 1.12, nightmare: 1.25 },
    },

    // e3 — Blue-Ribbon Tollgate (carve). REUSED from the shipped e2 and native
    // here: a tollgate is the purest expression of this campaign. Barricade
    // line with the toll gap on the direct lane — cover sits on the APPROACH,
    // never screening the shooters (the rule three failed layouts taught).
    e3: {
      level: 3,
      // ⚠ REBUILT after battery 1 read 44/4/0/0% with 37-100% of builds
      // WALLED. I wrote the exact anti-pattern this campaign's sibling file
      // warns about in its own comments: a wall line at x=4 with the enemies
      // BEHIND it screens the shooters and taxes only the crosser, so a party
      // funnelling through two gaps ate a pinning ranger and an ignite
      // sorcerer for free. Lantern e2's note says it plainly — "cover must sit
      // on the APPROACH so the party advances behind it" — and three failed
      // layouts taught it there.
      //
      // The barricade is now on the PARTY's side of the toll gap: something to
      // advance behind, with nothing screening the goblins.
      terrain: {
        theme: 'town',
        blocked: [{ x: 2, y: 2 }, { x: 2, y: 5 }, { x: 3, y: 3 }],
      },
      enemies: ['kettlehelm_orc', 'bluecap_pathfinder', 'bluecap_scout', 'sparkcap_slinger'],
      // One step closer [2026-09-01, spreadSweep +1]: at x=6 the balanced comp
      // was walled (41 / 18 / 8 across tiers) while melee and ranged coasted;
      // at x=5 the spread closes 50 -> 28 with the mean up 10 — so the scale
      // goes back up to pay for it.
      enemyPlacement: [{ x: 5, y: 3 }, { x: 5, y: 2 }, { x: 5, y: 5 }, { x: 5, y: 4 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
      goals: [
        { slug: 'exact_change', name: 'Exact Change', description: 'Clear the gate without losing anyone.', check: { kind: 'no_party_deaths' } },
      ],
      // Walked after the terrain rebuild. ⚠ The scales came DOWN hard (1.30 ->
      // 0.85 at medium) because the old row was propping up a board that was
      // walling most builds outright — once cover stopped shielding the
      // goblins, the encounter's real difficulty showed.
      //   easy      0.65 -> 97% (too easy) · 0.75 -> 89%, 0% walls ✓
      //   medium    0.75 -> 84% · 0.85 -> 74%, 1% walls ✓ · 1.00 -> 43%, 31% walls
      //   hard      0.95 -> 56%, 4% walls ✓ · 1.05 -> 42%, 13% walls ✓
      //   nightmare 1.05 -> 21%, 23% walls ✓ · 1.10 -> 14%, 38% walls (too far)
      hpScaleOverride: { easy: 0.85, medium: 0.95, hard: 1.05, nightmare: 1.15 },
    },

    // e4 — The Office of Forms (rooms). REUSED from the shipped e4's two-room
    // crawl, re-fictioned from the Bell-Arch into the permit office:
    // antechamber, then the stamp hall. HP and cooldowns carry across the
    // door, so the antechamber is a resource decision.
    e4: {
      level: 4,
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
      rooms: [
        {
          terrain: { theme: 'interior', blocked: [{ x: 3, y: 1 }, { x: 3, y: 6 }, { x: 5, y: 3 }] },
          enemies: ['clerk_of_stamps', 'bluecap_scout'],
          enemyPlacement: [{ x: 5, y: 4 }, { x: 6, y: 2 }],
          exitDoors: [{ x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
        },
        {
          terrain: { theme: 'interior', blocked: [{ x: 4, y: 2 }, { x: 4, y: 5 }, { x: 2, y: 4 }] },
          enemies: ['clerk_of_seals', 'kettlehelm_orc', 'clerk_of_stamps'],
          enemyPlacement: [{ x: 6, y: 3 }, { x: 5, y: 4 }, { x: 6, y: 5 }],
          entryTiles: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
        },
      ],
      goals: [
        { slug: 'in_triplicate', name: 'In Triplicate', description: 'Clear both rooms with the whole party standing.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      hpScaleOverride: { easy: 0.99, medium: 1.11, hard: 1.27, nightmare: 1.27 },
    },

    // e5 — The Ink Works (hazard). Spilled lamp-oil and printer's ink, burning
    // in lanes across the press floor. Fire is on the CROSSING, not around the
    // enemy — same rule as e3's cover.
    e5: {
      level: 5,
      terrain: {
        theme: 'interior',
        blocked: [{ x: 2, y: 2 }, { x: 2, y: 5 }, { x: 5, y: 1 }, { x: 5, y: 6 }],
        hazards: [
          { pos: { x: 3, y: 3 }, type: 'fire' }, { pos: { x: 3, y: 4 }, type: 'fire' },
          { pos: { x: 4, y: 2 }, type: 'fire' }, { pos: { x: 4, y: 5 }, type: 'fire' },
        ],
      },
      enemies: ['sparkcap_slinger', 'sparkcap_slinger', 'mudboot_bruiser', 'bluecap_scout'],
      enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 6 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
      goals: [
        { slug: 'dry_pages', name: 'Dry Pages', description: 'Lose nobody to the fire.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 0.98, medium: 1.1, hard: 1.22, nightmare: 1.22 },
    },

    // e6 — The Customs Barge (race). REUSED from the shipped e3's ferry relay,
    // re-fictioned as a customs inspection. ⚠ A real race, not a walk: the
    // deadline is tight against the distance (the mistake unlitbeacon e7 made
    // — a 9-round clock on a 3-turn walk — is not repeated here).
    e6: {
      level: 5,
      terrain: {
        theme: 'canal',
        blocked: [{ x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 6 }, { x: 3, y: 7 }],
      },
      objective: {
        text: 'Clear the barge before it casts off',
        win: [{ kind: 'all_enemies_dead' }],
        // Clock by tier [2026-09-01]: two pinning inspectors root a melee party
        // and the flat 7-round clock did the rest (melee 37% at medium, "the
        // deadline passed"). Easy gets a round; nightmare loses one.
        loss: [{ kind: 'round_reached', round: 7, roundByDifficulty: { easy: 8, nightmare: 6 } }],
      },
      enemies: ['customs_inspector', 'customs_inspector', 'bellrunner', 'kettlehelm_orc'],
      // Tier by BODIES [2026-09-01]: two pinning inspectors root a melee party
      // into the clock (melee 37% at medium, "the deadline passed" x37). Easy
      // and medium meet one inspector and a scout; hard and nightmare meet
      // the full customs desk. The B4 lever, first use in this campaign.
      enemiesByDifficulty: {
        easy: ['customs_inspector', 'bluecap_scout', 'bellrunner', 'kettlehelm_orc'],
        medium: ['customs_inspector', 'bluecap_scout', 'bellrunner', 'kettlehelm_orc'],
      },
      enemyPlacement: [{ x: 6, y: 2 }, { x: 6, y: 5 }, { x: 5, y: 4 }, { x: 5, y: 3 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      goals: [
        { slug: 'cleared_customs', name: 'Cleared Customs', description: 'Clear the barge by round 6.', check: { kind: 'win_by_round', round: 6 } },
      ],
      hpScaleOverride: { easy: 0.80, medium: 0.86, hard: 0.92, nightmare: 1.00 },
    },

    // ── FORK 1 (L6) sits here in the graph ──────────────────────────────────

    // e7 — The Weighbridge (hold). Both scale platforms must be occupied at
    // once while the bell is weighed — step off either and the reading voids.
    // `simultaneous` is the whole puzzle, and shove effects are the threat.
    e7: {
      level: 6,
      terrain: {
        theme: 'town',
        // v6 (2026-09-01): the scale-house wall. Traced twice — a Swift rogue
        // reached the far plate in ONE move down any open lane, so the plate
        // now sits behind a wall column with a gap at each end. Reaching it is
        // two moves for the fastest unit and three for most, past the kettle
        // (north gap) or the bruiser (south gap) — the weighbridge is a
        // building, and you go around it.
        blocked: [{ x: 3, y: 2 }, { x: 3, y: 5 }, { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 6, y: 6 }],
      },
      objective: {
        // THE TWO-PLATES HOLD its brief specified ("leave either, the reading
        // voids") — shipped as a plain survive with the plates in the banner
        // text only. Now: a hero on each plate AT THE SAME TIME before the
        // clock, with the waves landing while the party is split. Design
        // 2026-09-01; the shape validated on Lantern e8's underbridge.
        // v5 (2026-09-01). Four geometries of "a hero on each plate before the
        // clock" each walled one archetype (7/15/100 · 15/93/73 · 100/28/15):
        // whichever comp could not dislodge or survive the far plate's guard
        // lost to the deadline. So the reading is no longer a deadline — it is
        // the SLOW way. Win by taking both plates at once (the fast way, for
        // comps that can split and shove), or by holding out until the
        // reading takes on its own. Every comp has a path; the plates reward
        // the clever one.
        text: 'Hold both weigh-plates at once to take the reading early — or hold out until it takes on its own',
        win: [
          { kind: 'units_at_tiles', scope: 'any', simultaneous: true, tiles: [{ x: 0, y: 4 }, { x: 7, y: 4 }] },
          { kind: 'round_reached', round: 7, roundByDifficulty: { easy: 6, hard: 8, nightmare: 8 } },
        ],
      },
      // Cast lightened (D2: melee 0%, balanced 8%, "party has fallen" — expose +
      // thorns + vengeful + pinning on one board was a DPS check, not a hold).
      // The Clerk of Stamps belongs to Snagg's department (e4/e9/e11), not here.
      enemies: ['bluecap_pathfinder', 'kettlehelm_orc', 'mudboot_bruiser', 'bluecap_scout'],
      // The PATHFINDER stands on the east plate. A melee guard walks off it to
      // fight (traced: the bruiser left the plate to shockwave on turn 1 and a
      // cleric charged onto it — win in three turns); a Thorns kettle on it
      // walled melee and ranged (D1: 7 / 15 / 100). An archer has no reason to
      // leave: he pins from the plate, and the answer is to shove him (Shield
      // Bash, Shockwave, Fear) or shoot him off it. Kettle and bruiser behind.
      enemyPlacement: [{ x: 7, y: 3 }, { x: 5, y: 1 }, { x: 5, y: 6 }, { x: 7, y: 5 }],
      waves: [
        // Scoped to medium+ — battery 1 had easy at 76% median with 14% walls
        // and medium at 44%/21%, i.e. the low tiers were carrying the same
        // two-front pressure as the high ones.
        {
          enemies: ['bellrunner', 'bluecap_scout'],
          placement: [{ x: 0, y: 2 }, { x: 0, y: 5 }],
          trigger: { on: 'round', round: 3 },
          difficulties: ['medium', 'hard', 'nightmare'],
        },
        {
          enemies: ['mudboot_bruiser'],
          placement: [{ x: 7, y: 4 }],
          trigger: { on: 'round', round: 4 },
          difficulties: ['hard', 'nightmare'],
        },
      ],
      // Start at x=2-3 (D2: from x=1-2 the balanced comp shoved the bruiser off
      // the far plate and stood on both marks in THREE turns — the near plate
      // was adjacent). Two steps to the near plate, four to the far one.
      playerPlacement: [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      goals: [
        { slug: 'true_weight', name: 'True Weight', description: 'Take the plates with nobody down.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      // v6 read 70/88/30 (balanced wiped on the survive path; the plates are
      // a HUMAN path — the brain does not coordinate a split around a wall,
      // so the sim measures the survive floor). Provisional; tuner re-walks.
      hpScaleOverride: { easy: 0.65, medium: 0.72, hard: 0.90, nightmare: 1.00 },
    },

    // e8 — The Impound Yard (siege). Snagg impounds the bell "pending review";
    // the party defends the depot through the night while the city's muscle
    // arrives at both gates.
    e8: {
      level: 7,
      terrain: {
        theme: 'town',
        blocked: [
          { x: 2, y: 1 }, { x: 2, y: 6 }, { x: 5, y: 1 }, { x: 5, y: 6 },
          { x: 3, y: 3 }, { x: 4, y: 4 },
        ],
      },
      objective: {
        text: 'Hold the impound yard until dawn',
        win: [{ kind: 'round_reached', round: 7, roundByDifficulty: { easy: 6, hard: 8, nightmare: 8 } }],
      },
      enemies: ['ironbell_warden', 'kettlehelm_orc', 'bluecap_pathfinder'],
      enemiesByDifficulty: { easy: ['ironbell_warden', 'kettlehelm_orc', 'bluecap_scout'] },
      enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 7, y: 5 }],
      waves: [
        {
          enemies: ['mudboot_bruiser', 'bluecap_scout'],
          placement: [{ x: 0, y: 3 }, { x: 0, y: 4 }],
          trigger: { on: 'round', round: 3 },
        },
        {
          enemies: ['bellrunner', 'sparkcap_slinger'],
          placement: [{ x: 7, y: 2 }, { x: 0, y: 5 }],
          trigger: { on: 'round', round: 5 },
        },
        {
          enemies: ['kettlehelm_orc', 'patchcoat_mender'],
          placement: [{ x: 7, y: 3 }, { x: 7, y: 4 }],
          trigger: { on: 'round', round: 4 },
          difficulties: ['hard', 'nightmare'],
        },
      ],
      playerPlacement: [{ x: 3, y: 4 }, { x: 4, y: 3 }, { x: 2, y: 3 }, { x: 5, y: 4 }],
      goals: [
        { slug: 'held_the_yard', name: 'Held the Yard', description: 'Survive with the whole party standing.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      // Survive cells are scale-inert; the clock above is the tier lever.
      hpScaleOverride: { easy: 0.85, medium: 0.95, hard: 1.00, nightmare: 1.05 },
    },

    // e9 — The Audit (boss). MID-CAMPAIGN, deliberately: Snagg is the
    // obstacle, not the climax, and killing the obstacle is not the same as
    // finishing the delivery. Kill-target so the clerks are a problem you may
    // solve or outrun — never a scripted "kill the healer first"
    // (CAMPAIGN_BEATS §2 ban #3).
    e9: {
      level: 8,
      terrain: {
        theme: 'interior',
        blocked: [{ x: 3, y: 2 }, { x: 3, y: 5 }, { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 2, y: 4 }],
      },
      objective: {
        text: 'Close Undersecretary Snagg\'s file',
        win: [{ kind: 'units_dead', enemyKeys: ['undersecretary_snagg'] }],
      },
      enemies: ['undersecretary_snagg', 'clerk_of_seals', 'clerk_of_stamps', 'ironbell_warden'],
      enemyPlacement: [{ x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 5 }, { x: 4, y: 4 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      goals: [
        { slug: 'audited_him', name: 'Audited Him', description: 'Let the hero strike the final blow.', check: { kind: 'killing_blow_by_main' } },
      ],
      hpScaleOverride: { easy: 0.93, medium: 1.21, hard: 1.33, nightmare: 1.40 },
    },

    // ── FORK 2 (L9) sits here in the graph ──────────────────────────────────

    // e10 — The First Rain (survive). The rain arrives early. Lower town
    // floods, and the looters are not the city's muscle — just people having
    // a very bad hour. Survive the panic.
    e10: {
      level: 9,
      terrain: {
        theme: 'town',
        blocked: [{ x: 2, y: 2 }, { x: 2, y: 5 }, { x: 5, y: 2 }, { x: 5, y: 5 }, { x: 3, y: 0 }, { x: 4, y: 7 }],
      },
      // PROTECT, not survive [2026-09-01]. As a survive this was a 90% walkover
      // that ended as a kill-all in half its games — e8 again with looters, and
      // no water. Now the bell-wagon sits in the rising street and the looters
      // want IT: the party survives easily; the bell does not unless it is
      // screened. Distinct from e2 (route) and e8 (the party survives).
      allies: {
        wagon: {
          name: 'The Bell-Wagon', baseClass: 'fighter',
          // 140 -> 200 after R2 (ranged 25%, "your charge has fallen" x45):
          // the A5 rule — a defenceless VIP wants boss-tier HP for its tier.
          maxHealth: 160, armorClass: 11, movementRange: 0,
          abilities: [],
          behavior: { mode: 'hold' },
          placement: { x: 4, y: 4 },
        },
      },
      objective: {
        text: 'Keep the bell above the water until the street drains',
        win: [{ kind: 'round_reached', round: 7, roundByDifficulty: { easy: 6, hard: 8, nightmare: 8 } }],
        loss: [{ kind: 'ally_dead', allyKey: 'wagon' }],
      },
      enemies: ['flood_looter', 'flood_looter', 'bellrunner', 'mudboot_bruiser'],
      enemyPlacement: [{ x: 6, y: 3 }, { x: 1, y: 2 }, { x: 6, y: 5 }, { x: 1, y: 5 }],
      waves: [
        {
          enemies: ['flood_looter', 'flood_looter'],
          placement: [{ x: 0, y: 4 }, { x: 7, y: 3 }],
          trigger: { on: 'round', round: 3 },
        },
        {
          enemies: ['bellrunner', 'flood_looter'],
          placement: [{ x: 7, y: 5 }, { x: 0, y: 2 }],
          trigger: { on: 'round', round: 5 },
          difficulties: ['hard', 'nightmare'],
        },
        // A survive objective barely feels scale (see unlitbeacon e9's notes),
        // so 100/100/92% at easy/medium/hard is fixed with BODIES.
        { enemies: ['flood_looter'], placement: [{ x: 2, y: 6 }], trigger: { on: 'round', round: 2 } },
      ],
      playerPlacement: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 5 }, { x: 4, y: 5 }],
      goals: [
        { slug: 'above_the_water', name: 'Above the Water', description: 'Nobody lost to the flood.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 0.85, medium: 0.95, hard: 1.00, nightmare: 1.05 },
    },

    // e11 — The Stair of Stamps (escape). Up the tower's switchback with the
    // bell, the yard filling behind you. The win is ARRIVING, not clearing.
    e11: {
      level: 10,
      terrain: {
        theme: 'interior',
        blocked: [
          { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 },
          { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 },
          { x: 4, y: 3 },
        ],
      },
      objective: {
        text: 'Carry the bell to the belfry stair — get everyone up',
        win: [{
          kind: 'units_at_tiles', scope: 'all',
          tiles: [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }],
        }],
      },
      enemies: ['ironbell_warden', 'kettlehelm_orc', 'bluecap_pathfinder', 'clerk_of_stamps'],
      enemyPlacement: [{ x: 5, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 5 }, { x: 6, y: 4 }],
      waves: [
        {
          // Flanks, two bodies [2026-09-01]: three spawns on the party's own
          // start tiles put a bruiser on the back rank of every ranged comp
          // (32% at medium). The stair is still watched from below.
          enemies: ['bellrunner', 'wet_boot_looter'],
          placement: [{ x: 1, y: 1 }, { x: 1, y: 6 }],
          trigger: { on: 'round', round: 2 },
        },
        // An escape is won by ARRIVING, so scale is a weak lever — the stair
        // read 100/92/86/84% on it. A second pursuit is the honest dial.
        { enemies: ['kettlehelm_orc', 'mudboot_bruiser'], placement: [{ x: 0, y: 2 }, { x: 0, y: 5 }], trigger: { on: 'round', round: 4 } },
      ],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
      goals: [
        { slug: 'up_the_stair', name: 'Up the Stair', description: 'Get everyone up with nobody lost.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 0.85, medium: 1.05, hard: 1.30, nightmare: 1.55 },
    },

    // e12 — Ring It (race). THE FINALE, and not a boss: the crest is coming up
    // the lower streets and the bell has to sound before it arrives. The hero
    // must reach the bell-rope tile. Everything else on the board is trying to
    // make that take one turn longer.
    e12: {
      level: 10,
      terrain: {
        theme: 'interior',
        blocked: [{ x: 3, y: 2 }, { x: 3, y: 5 }, { x: 5, y: 1 }, { x: 5, y: 6 }, { x: 6, y: 3 }],
      },
      objective: {
        text: 'Ring the flood-bell before the crest arrives',
        win: [{ kind: 'units_at_tiles', scope: 'main', tiles: [{ x: 7, y: 4 }] }],
        // D2: a move-3 hero needs three moves and a fight to reach the rope;
        // balanced read 40% "the deadline passed" with no pinner on the board.
        loss: [{ kind: 'round_reached', round: 9, roundByDifficulty: { easy: 10, hard: 8, nightmare: 7 } }],
      },
      enemies: ['ironbell_warden', 'kettlehelm_orc', 'bluecap_pathfinder', 'sparkcap_slinger'],
      // D2: melee 30 / balanced 40, "the deadline passed" — a pinned hero
      // loses a move it does not have. Easy and medium: no pinner on the rope.
      enemiesByDifficulty: {
        easy: ['ironbell_warden', 'kettlehelm_orc', 'bluecap_scout', 'bluecap_scout'],
        medium: ['ironbell_warden', 'kettlehelm_orc', 'bluecap_scout', 'sparkcap_slinger'],
      },
      // Warden off the rope [2026-09-01]: at (6,4) an immovable stood between
      // the hero and the one goal tile — a corridor plug (BEATS §2 #4), and
      // balanced read 23% "the deadline passed". He keeps the middle now; the
      // shooters flank the rope and pin/burn whoever runs for it.
      enemyPlacement: [{ x: 4, y: 4 }, { x: 5, y: 3 }, { x: 7, y: 6 }, { x: 7, y: 1 }],
      waves: [
        {
          // Behind, not in the lane [2026-09-01]: at (4,3)/(4,5) the r3 wave
          // landed square in the hero's only path with five rounds left —
          // melee 33% / balanced 18% at medium, "the deadline passed". The
          // chase now comes up the avenue behind the party, as the crest does.
          enemies: ['bellrunner', 'clerk_of_stamps'],
          placement: [{ x: 0, y: 2 }, { x: 0, y: 5 }],
          trigger: { on: 'round', round: 3 },
        },
        // ⚠ MOVED OFF THE GOAL. This wave used to drop two bodies at (7,3) and
        // (7,5) — flanking the bell-rope tile at (7,4) — on the encounter the
        // hero must REACH that tile to win. Battery 1: 12/0/0% at
        // medium/hard/nightmare with 66-83% of builds walled. Spawning
        // blockers adjacent to a win tile does not make a race harder, it
        // makes it unwinnable for anyone who was not already past them.
        // They now arrive BEHIND the party, so they chase rather than wall.
        {
          enemies: ['mudboot_bruiser', 'kettlehelm_orc'],
          placement: [{ x: 1, y: 2 }, { x: 1, y: 5 }],
          trigger: { on: 'round', round: 5 },
          difficulties: ['hard', 'nightmare'],
        },
      ],
      playerPlacement: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
      goals: [
        { slug: 'rung_on_time', name: 'Rung On Time', description: 'Ring it by round 7.', check: { kind: 'win_by_round', round: 7 } },
      ],
      hpScaleOverride: { easy: 0.85, medium: 0.95, hard: 1.05, nightmare: 1.15 },
    },
  },

  nodes: {
    intro: {
      kind: 'story',
      text: 'The flood-bell of Amrun has hung in its tower for two hundred years, and for two hundred years it has rung twice: once a season for practice, and eleven times for real. Every one of those eleven, the lower town got out in time.\n\nLast Tuesday it cracked. Not dramatically — a hairline, and a sound like a dropped plate.\n\nThe rain season is three weeks out. The only foundry that can cast a bell that size is in Goblinopolis, four days downriver, and Goblinopolis has already agreed to sell them one at a fair price.\n\n"So it\'s simple," says the Amrun reeve, handing {mainName} a purse and a receipt. "Go and fetch it."\n\nIt is not simple.',
      next: 'foundry_pre',
    },
    foundry_pre: {
      kind: 'encounter', encounter: 'e1',
      preText: 'The bell is beautiful. Two tons of new bronze, still warm, sitting in the foundry yard under a tarp — and the foundry yard, at dusk, turns out to be a popular place for people who like bronze.\n\nThey come over the east wall in ones and twos, hopeful rather than organised. {mainName} puts the company between them and the bell.',
      next: 'lv2',
    },
    lv2: { kind: 'levelup', level: 2, next: 'permit_1' },
    permit_1: {
      kind: 'story',
      text: 'In the morning a goblin in a very clean coat is standing at the yard gate with a clipboard.\n\n"Bell?" he says. "Moving a bell requires Form 12-C. Movement of Cast Goods Exceeding One Ton Within City Limits."\n\n"We bought it. Here\'s the receipt."\n\n"The receipt is excellent. Twelve-C is about MOVEMENT." He produces one, stamps it, hands it over, and looks quietly pleased. "Undersecretary Snagg. You\'ll be seeing me."\n\nThe form is, as far as anyone can tell, entirely genuine.',
      next: 'first_mile_pre',
    },
    first_mile_pre: {
      kind: 'encounter', encounter: 'e2',
      preText: 'The wagon is the slowest thing on the road and the loudest thing in the city — two tons of bronze on ungreased axles, announcing itself to every opportunist within four streets.\n\nIt cannot fight, {mainName}. It cannot even hurry. Walk it to the crossroads.',
      next: 'lv3',
    },
    lv3: { kind: 'levelup', level: 3, next: 'tollgate_note' },
    tollgate_note: {
      kind: 'story',
      text: 'At the Blue-Ribbon Tollgate a kettlehelm orc reads Form 12-C twice, upside down once, and shakes his head.\n\n"Twelve-C\'s movement. This here\'s a GATE. Gate needs 12-C ANNEX FOUR."\n\n"Where do we get Annex Four?"\n\nHe points back down the road you came from, at a small office you have already walked past twice.\n\n"Or," he says, in the voice of a man offering a great kindness, "you could pay the toll."\n\nThe toll is precisely the amount of money the company is carrying.',
      next: 'tollgate_pre',
    },
    tollgate_pre: {
      kind: 'encounter', encounter: 'e3',
      preText: 'Nobody at the tollgate wants a fight. They want the toll, and they want it more than they want to be reasonable, and somewhere between the third and fourth explanation the barricade stops being a formality.\n\n{mainName} takes the direct lane. The gap in the barricade is the whole argument.',
      next: 'lv4',
    },
    lv4: { kind: 'levelup', level: 4, next: 'office_note' },
    office_note: {
      kind: 'story',
      text: 'The Office of Forms occupies a building the size of a granary, and every window is lit at midnight.\n\nInside there is an antechamber for people waiting to be told which queue to join, and beyond it the stamp hall, where the actual stamping happens. Between them: one door, one clerk, and a sign reading PLEASE HAVE YOUR FORM READY.\n\nThe company\'s form is ready. The company\'s form has been ready for two days.',
      next: 'office_pre',
    },
    office_pre: {
      kind: 'encounter', encounter: 'e4',
      preText: 'The clerk looks at Annex Four, then at the party, then at the clock — which reads four minutes to closing — and reaches, with enormous deliberation, for a different stamp.\n\nWhat happens next is technically a queue dispute. {mainName} will have to get through the antechamber AND the hall, and there is no rest between them.',
      next: 'lv5',
    },
    lv5: { kind: 'levelup', level: 5, next: 'ink_note' },
    ink_note: {
      kind: 'story',
      text: 'Annex Four is stamped. Annex Four, it turns out, must be COUNTERSIGNED, and the countersigning office is on the far side of the Ink Works.\n\nThe Ink Works is where Goblinopolis prints its forms. All of them. Vats of lamp-black, presses the size of houses, and a floor that is slick with two centuries of spilled ink and lamp oil.\n\nSomebody has knocked over a lamp. The lanes between the presses are burning, and the print crew — reasonably — assumes the party did it.',
      next: 'ink_pre',
    },
    ink_pre: {
      kind: 'encounter', encounter: 'e5',
      preText: 'Fire runs in lanes across the press floor, exactly where you would want to walk. Sparkcap slingers throw more of it from the clear ground beyond.\n\nThere is no way around, {mainName}. Only through, and only where the ground is not yet burning.',
      next: 'barge_note' ,
    },
    barge_note: {
      kind: 'story',
      text: 'Countersigned. Stamped. Annexed. The bell reaches the river dock with four days to spare and a folder two inches thick.\n\nThe customs barge casts off at the turn of the tide, and it is the only crossing that can take the wagon\'s weight. The inspectors want to open the folder. All of it. Page by page.\n\nThe tide, unlike the inspectors, is not negotiable.',
      next: 'barge_pre',
    },
    barge_pre: {
      kind: 'encounter', encounter: 'e6',
      preText: 'Seven rounds until the barge casts off with or without you, {mainName}. The inspectors are not villains — they are people with a job and a checklist, standing exactly where you need to be.\n\nSettle it quickly. The tide is the enemy here.',
      next: 'fork_district',
    },
    // ── FORK 1 (level 6) ────────────────────────────────────────────────────
    fork_district: {
      kind: 'choice',
      text: 'Across the river, two roads run up to the Records Hall, and the wagon can take one.\n\nThe Sparkyard is the foundry district — hot, loud, and full of people who work metal for a living and have opinions about a company hauling two tons of it.\n\nThe Old Ledger Quarter is where the city\'s clerks live: narrow, quiet, and threaded with courier shortcuts that do not appear on any map the city admits to.',
      choices: [
        { label: 'Take the Sparkyard — let the smiths look at the bell.', setFlags: { sparkRoute: true }, grantAchievement: 'the_sparkyard', grantBoon: 'sparkyard_plate', next: 'district_note' },
        { label: 'Take the Old Ledger Quarter — follow the couriers.', setFlags: { sparkRoute: false }, grantAchievement: 'the_ledger_quarter', grantBoon: 'ledger_boots', next: 'district_note' },
      ],
    },
    district_note: {
      kind: 'story',
      text: '{if sparkRoute}The Sparkyard smiths come out to look at the bell the way farriers look at a good horse, and by the time the wagon is through, half the company is wearing hammered offcuts strapped over their gear. Nobody offered. Nobody asked. It simply happened.{else}The Ledger Quarter\'s couriers take one look at the folder, another at the wagon, and start calling directions from the rooftops — left here, cut through, mind the step. By the far end the company is moving a third faster and has learned six shortcuts that do not exist.{/if}\n\nAhead, the Records Hall. And in front of it, an entire street of weighing machinery.',
      next: 'weigh_pre',
    },
    weigh_pre: {
      kind: 'encounter', encounter: 'e7',
      preText: 'The city will not issue the final permit without a certified weight, and a certified weight requires both plates of the municipal weighbridge to hold steady for a full reading.\n\nBoth plates, {mainName}. Step off either one and the needle drops and the reading voids — and the Bellrunners have worked out exactly what that means.',
      next: 'lv7',
    },
    lv7: { kind: 'levelup', level: 7, next: 'impound_note' },
    impound_note: {
      kind: 'story',
      text: 'The certified weight is 2.04 tons. Form 12-C covers goods "exceeding one ton". Annex Four covers "exceeding two".\n\n"So we\'re covered," says {mainName}.\n\n"You\'re covered TWICE," Snagg agrees, delighted. "Which is an irregularity. I\'m impounding pending review."\n\nAnd there it is, finally, plain: he does not want the bell. He does not want the money. He wants the delivery to remain, permanently, in progress.\n\nThe impound yard gates lock at sundown. The company is inside them, with the bell, and the review is scheduled for a date Snagg has not yet chosen.',
      next: 'impound_pre',
    },
    impound_pre: {
      kind: 'encounter', encounter: 'e8',
      preText: 'They come over the yard walls all night, in shifts, with the patience of people being paid by the hour.\n\nHold until dawn, {mainName}. At dawn the gates open on their own — that, at least, is in the regulations.',
      next: 'lv8',
    },
    lv8: { kind: 'levelup', level: 8, next: 'audit_note' },
    audit_note: {
      kind: 'story',
      text: 'At dawn {mainName} does not take the bell out of the yard. {mainName} walks into the Records Hall and asks, for the first time, the question nobody has asked all week:\n\n"Who signs the final permit?"\n\nThe answer is on the wall in a frame, and it has been there for eleven years. THE WARBOSS. And under it, in Gurm\'s enormous careless hand, a standing order:\n\n*"LET BELLS THROUGH. WARS ARE LOUD ENOUGH."*\n\nSigned. Sealed. Eleven years old. It covers every bell that has ever entered or left this city, and it has been hanging four rooms from Snagg\'s desk the entire time.\n\nSnagg is already reaching for the file cabinet.',
      next: 'audit_pre',
    },
    audit_pre: {
      kind: 'encounter', encounter: 'e9',
      preText: '"That order," Snagg says, with the first real feeling he has shown all week, "is UNFILED."\n\nHe is not a warrior. He is a middle-clerk with a grasp like a closing drawer and two departments who will do as they are told, and he is standing between {mainName} and eleven years of signed permission.\n\nOnly Snagg has to fall. The clerks are a problem you may solve or simply walk around.',
      next: 'fork_cabinet',
    },
    // ── FORK 2 (level 9) ────────────────────────────────────────────────────
    fork_cabinet: {
      kind: 'choice',
      text: 'Snagg\'s file cabinet is enormous, and it is full.\n\nNot of nothing — of PERMITS. Hundreds of them. Stalled applications going back years: a bakery expansion, a bridge repair, a widow\'s pension, a school. Every one of them stamped, complete, and never released.\n\nOutside, the rain has started early.',
      choices: [
        { label: 'Nail every one of them to the Records Hall door.', setFlags: { publishedLot: true }, grantAchievement: 'published_the_lot', grantBoon: 'the_published_lot', next: 'rain_note' },
        { label: 'Carry each one back to whoever filed it.', setFlags: { publishedLot: false }, grantAchievement: 'returned_by_hand', grantBoon: 'returned_by_hand', next: 'rain_note' },
      ],
    },
    rain_note: {
      kind: 'story',
      text: '{if publishedLot}By noon the Records Hall door is papered edge to edge and there is a crowd four deep reading it, and somewhere near the back a woman starts laughing and cannot stop. The city knows the company\'s faces now. Doors open as the wagon passes.{else}It takes until dusk and the company knocks on ninety-one doors. At the fortieth, someone starts following along to help carry. By the ninetieth there are a dozen of them, and every one is fed, soaked, and extremely well informed about where the party is going next.{/if}\n\nAnd the rain does not stop. It is three weeks early and it is not stopping.\n\nAmrun is four days downriver. The bell is here. The lower town is there.\n\nThere is no version of this where the wagon arrives in time.\n\n"Then we don\'t send the bell," says {mainName}. "We send the SOUND. Goblinopolis has a tower."',
      next: 'first_rain_pre',
    },
    first_rain_pre: {
      kind: 'encounter', encounter: 'e10',
      preText: 'The lower streets are already shin-deep and the water is still rising. The bell has to get to the tower, and everyone in Goblinopolis with a wet boot and a bad idea is between here and there.\n\nThey are not soldiers, {mainName}. They are frightened people in a flooding city. Keep the bell above the water.',
      next: 'stair_pre',
    },
    stair_pre: {
      kind: 'encounter', encounter: 'e11',
      preText: 'The Stair of Stamps is a switchback of ninety-one steps, and the bell weighs two tons, and it is going UP.\n\nThe yard is filling behind you with everyone who would rather this did not happen. Get the whole company to the belfry landing, {mainName}. Nobody left on the stair.',
      next: 'lv10',
    },
    lv10: { kind: 'levelup', level: 10, next: 'ring_pre' },
    ring_pre: {
      kind: 'encounter', encounter: 'e12',
      preText: 'The bell hangs. The rope is in reach. Down in the lower streets the crest is coming up the avenue like a hand pushed under a rug — and four days downriver, Amrun\'s watchmen are standing in the rain waiting for a sound that cannot possibly come from their own cracked tower.\n\nSound carries a long way over water, {mainName}. Eight rounds. Reach the rope.',
      next: 'finale',
    },
    finale: {
      kind: 'end',
      text: 'The new bell of Goblinopolis rings for the first time at twenty past four in the afternoon, in driving rain, four days upriver of the town that paid for it.\n\nIt is not, by any measure, where it was supposed to be.\n\nAmrun hears it. Nobody there can explain how — the river fog, the valley, two hundred years of knowing exactly what that sound means and not needing to be told twice — but the lower town is empty by dark, and when the water comes through at midnight it takes eleven houses, a mill, and nobody at all.\n\nThe bell stays. Amrun votes on it, formally, and the vote is not close: a bell that rang for them from another city\'s tower is not a bell you take down. Goblinopolis rings it every season now, twice — once for practice, and once, at the turn of the year, for a town four days downriver that can hear it.\n\n{if publishedLot}The bakery expansion was approved eleven days later. So was the school.{else}The widow whose pension you carried up three flights of stairs sends a letter to Amrun every year, and has never once mentioned the flood.{/if}\n\nUndersecretary Snagg was reassigned to Rural Fencing Disputes, where he is, by all accounts, extremely thorough and completely harmless.\n\nWarboss Gurm never learned any of it had happened. He signed the order eleven years ago, on a Tuesday, between two other things, and has not thought about bells since.\n\nTHE BELL OF GOBLINOPOLIS — COMPLETE',
    },
  },
};
