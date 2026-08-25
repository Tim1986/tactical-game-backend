/**
 * moonberry.ts — "The Moonberry Masquerade" (PAID).
 *
 * ═══ GROUND-UP REDESIGN 2026-08-24 (TRILOGY_REDESIGN.md §5) ═══════════════
 * Was a 5-encounter teaser on the trilogy's shared skeleton (festival theft →
 * pincer ambush → gate brute → boss-plus-healer). Now a full L1→10 album:
 * 12 encounters, forks at L6 and L9.
 *
 * THE DRIVER CHANGED to a HEIST — the second of the two structures
 * CAMPAIGN_BEATS §6 lists as never used. The Night Cartographer holds the
 * Moonberry Charter, the deed to the city's night-market, won years ago in a
 * rigged game; once a year he throws a masquerade to celebrate it. The market
 * families hire the company to get in and take it back.
 *
 * THE REGISTER SWAPPED SIDES, and that is the whole trick. The registry calls
 * "a masked performing troupe as the antagonists" excellent and thoroughly
 * mined — so the troupe identity moves to the PARTY. A heist crew at a
 * masquerade IS a troupe: you audition, you get your colours, you work the
 * room. Same stage, opposite side of it, and nothing about the beat is reused.
 *
 * TWIST: "the vault is not where the prize is." The vault (e10) holds every
 * invitation, ledger and trinket he ever collected — and no Charter, because
 * on masquerade night he WEARS it, as the sash of his costume, as he always
 * has. The heist becomes a performance: beat him in front of his own guests,
 * take the sash, and get out. This retires the campaign's old schemer twist
 * ("the troupe's own lantern was stolen first"), which the trilogy has spent.
 *
 * ENDING: boss at e11, ESCAPE at e12 — rooftops, alarm, waves behind, exit at
 * the gondola line. Not an ending-as-choice: The Unlit Beacon spent that.
 *
 * ⚠ ART: no tile theme yet. The setting is canals, a palace and rooftops, and
 * the shipped set is crypt/cave/forest/snow/ice. town/interior/canal tiles are
 * requested in TILE_ART_SPEC.md v2; every encounter below is authored so
 * adding one is a one-line change, and the fiction names which it wants.
 *
 * BALANCE: hpScaleOverride values are PROVISIONAL except where a reused
 * encounter's numbers are noted. The battery is the balance pass.
 */
import { CampaignDefinition } from './types.js';

export const moonberryCampaign: CampaignDefinition = {
  slug: 'moonberry',
  title: 'The Moonberry Masquerade',
  blurb: 'The deed to the night-market hangs around one man\'s neck, one night a year, at a party you were not invited to.',
  enemyFactionName: 'Masquers',
  free: false,
  startNode: 'intro',
  // TODO(skins): no skin system yet — unlock recorded in campaign meta locally.
  rewardSkin: { classSlug: 'sorcerer', skinId: '60101', name: 'Ember Juggler' },

  achievements: [
    // Completion slugs UNCHANGED so existing meta stays valid.
    { slug: 'complete_easy',      name: 'Invited',            description: 'Complete The Moonberry Masquerade on Easy.' },
    { slug: 'complete_medium',    name: 'Masked and Welcome', description: 'Complete The Moonberry Masquerade on Medium.' },
    { slug: 'complete_hard',      name: 'The Quiet Guest',    description: 'Complete The Moonberry Masquerade on Hard.' },
    { slug: 'complete_nightmare', name: 'Star of the Evening', description: 'Complete The Moonberry Masquerade on Nightmare — unlocks the Ember Juggler skin.' },
    // L6 fork
    { slug: 'the_forger',    name: 'The Forger',    description: 'Recruit the forger and walk in the front gate.' },
    { slug: 'the_gondolier', name: 'The Gondolier', description: 'Recruit the gondolier and come up through the water-door.' },
    // L9 fork
    { slug: 'cut_the_lights', name: 'Cut the Lights', description: 'Sabotage the palace lanterns before the vault.' },
    { slug: 'cut_the_bells',  name: 'Cut the Bells',  description: 'Sabotage the alarm bells before the vault.' },
    // Battle goals — slugs match the goal slugs below.
    { slug: 'quiet_landing',   name: 'Quiet Landing',   description: 'Take the canal dock without losing anyone.' },
    { slug: 'unremarked',      name: 'Unremarked',      description: 'Bring the specialist through the market untouched.' },
    { slug: 'cased_it',        name: 'Cased It',        description: 'Hold the Silver Arch with the whole party standing.' },
    { slug: 'good_audition',   name: 'A Good Audition',  description: 'Take the ferry stage without losing anyone.' },
    { slug: 'below_stairs',    name: 'Below Stairs',    description: 'Cross the servants\' wing with the whole party standing.' },
    { slug: 'guest_list',      name: 'The Guest List',   description: 'Intercept the courier by round 5.' },
    { slug: 'held_the_landing', name: 'Held the Landing', description: 'Keep the specialist working with nobody down.' },
    { slug: 'no_reflection',   name: 'No Reflection',    description: 'Cross the Hall of Mirrors without losing anyone.' },
    { slug: 'still_masked',    name: 'Still Masked',     description: 'Survive the unmasking without a single loss.' },
    { slug: 'the_whole_take',  name: 'The Whole Take',   description: 'Clear the vault with the whole party standing.' },
    { slug: 'took_the_sash',   name: 'Took the Sash',    description: 'Let the hero personally take the Charter.' },
    { slug: 'clean_getaway',   name: 'Clean Getaway',    description: 'Reach the gondola line by round 6.' },
  ],

  boons: {
    // L6 pairing: the specialist you hire changes what the party can DO.
    // A different axis again from the other three campaigns' pairings.
    forgers_papers: {
      slug: 'forgers_papers', name: 'The Forger\'s Papers',
      description: 'Invitations good enough to be greeted by name — every unit starts each remaining encounter shielded.',
      effects: { startShielded: 'all' },
    },
    gondoliers_route: {
      slug: 'gondoliers_route', name: 'The Gondolier\'s Route',
      description: 'Every water-door and service stair in the city — +1 movement range for the rest of the run.',
      effects: { partyMovement: 1 },
    },
    // L9 pairing: what you sabotage before the vault.
    cut_the_lights: {
      slug: 'cut_the_lights', name: 'Cut the Lights',
      description: 'Working in the dark, and used to it — +2 armor class for the rest of the run.',
      effects: { partyArmorClass: 2 },
    },
    cut_the_bells: {
      slug: 'cut_the_bells', name: 'Cut the Bells',
      description: 'No alarm, no hurry, one good meal in the servants\' hall — +6 max HP for the rest of the run.',
      effects: { partyMaxHp: 6 },
    },
  },

  enemies: {
    lantern_lifter: {
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
    velvet_gate_guard: {
      baseClass: 'fighter', name: 'Velvet Gate Guard',
      maxHealth: 47, armorClass: 12, specialSlug: 'shield_bash',
      nightmare: { hpBonus: 6, passiveFlags: ['immovable'] },
    },
    silverthread_mender: {
      baseClass: 'cleric', name: 'Silverthread Mender',
      maxHealth: 46, armorClass: 11, specialSlug: 'ward',
      nightmare: { hpBonus: 4 },
    },
    // The escort hunter. Its own key because aiHints attach to a MONSTER, not
    // to an encounter slot — reusing a plain duelist here would make every
    // duelist in the campaign hunt escorts.
    crescent_stalker: {
      baseClass: 'rogue', name: 'Crescent Stalker',
      maxHealth: 38, armorClass: 9, movementRange: 5,
      aiHints: { priorityTarget: 'ally' },
      nightmare: { acBonus: 1 },
    },
    night_cartographer: {
      baseClass: 'warlock', name: 'The Night Cartographer',
      maxHealth: 100, armorClass: 10, specialSlug: 'grasp',
      passiveFlags: ['immovable', 'warded'],
      nightmare: { hpBonus: 8 },
    },
    // ── NEW ──────────────────────────────────────────────────────────────
    // The palace's own staff, as distinct from the Cartographer's troupe:
    // liveried, drilled, and not in costume.
    mirror_footman: {
      baseClass: 'fighter', name: 'Mirror Footman',
      maxHealth: 44, armorClass: 11, specialSlug: 'concussive',
      nightmare: { hpBonus: 5 },
    },
    list_courier: {
      baseClass: 'rogue', name: 'List Courier',
      maxHealth: 32, armorClass: 9, movementRange: 5,
      specialSlug: 'dagger_toss',
      nightmare: { acBonus: 1 },
    },
    palace_crier: {
      baseClass: 'sorcerer', name: 'Palace Crier',
      maxHealth: 38, armorClass: 9, specialSlug: 'ignite',
      nightmare: { hpBonus: 4 },
    },
  },

  encounters: {
    // ═══ PALETTE ════════════════════════════════════════════════════════════
    // e1 kill-all · e2 escort · e3 hold · e4 hazard · e5 rooms · e6 race ·
    // e7 protect · e8 carve · e9 survive · e10 rooms · e11 boss · e12 escape.
    // Eleven distinct types; `rooms` repeats at e5 and e10, non-consecutively —
    // the servants' wing teaches the palace's geometry and the vault pays it
    // off, which is a heist's own logic.
    // ════════════════════════════════════════════════════════════════════════

    // e1 — The Canal Dock (kill-all). Tutorial, and the trilogy's THIRD
    // distinct opening shape: all enemies frontal, then ONE late arrival
    // behind. It teaches that waves exist without teaching a pincer (that
    // shape is Lantern's alone now).
    e1: {
      level: 1,
      terrain: { theme: 'canal' },
      // ⚠ Battery 1 read this TUTORIAL as
      // TOO HARD+WALLS at ALL FOUR tiers — 78/42/16/4% median with 14-54% of
      // builds walled, at EASY included. The cause was mine: I kept the
      // retuned e1 scale from the old three-lifter tutorial and then ADDED a
      // round-3 wave on top, so a level-1 party with no specials faced four
      // move-5 rogues. The wave earns its place (it is what teaches a new
      // player that reinforcements exist) so the SCALE pays for it instead —
      // dropping to two lifters overcorrected to 99-100% at every rung, which
      // is a tutorial with nothing in it. Three bodies, much softer.
      enemies: ['lantern_lifter', 'lantern_lifter', 'lantern_lifter'],
      enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }],
      waves: [
        {
          enemies: ['lantern_lifter'],
          placement: [{ x: 1, y: 5 }],
          trigger: { on: 'round', round: 3 },
        },
      ],
      playerPlacement: [{ x: 2, y: 3 }, { x: 2, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
      noSpecials: true,
      goals: [
        { slug: 'quiet_landing', name: 'Quiet Landing', description: 'Take the dock without losing anyone.', check: { kind: 'no_party_deaths' } },
      ],
      // ⚠ TUTORIAL EXEMPTION at easy AND medium (CAMPAIGNS.md §Balancing).
      // Retuned 2026-08-24 with the catalog's other e1s: 1.26 -> 78% mean,
      // 1.08 -> 85%/92% median, 0% walls.
      //   0.72 -> 95% · 0.80 -> 91% · 0.90 -> 86% mean, 92% median, 1% walls ✓
      // ⚠ Battery 2 flags medium as TOO EASY (92% median vs an 80% cap). That
      // is the TUTORIAL EXEMPTION working as designed — do not 'fix' it.
      //   (the pre-fix 1.08 measured 42% median with 29% of builds walled)
      hpScaleOverride: { easy: 0.78, medium: 0.90, hard: 1.05, nightmare: 1.15 },
    },

    // e2 — The Market Escort (escort). REUSED from the shipped e4, re-fictioned:
    // the statue-act road becomes smuggling your specialist through the night
    // market. The crescent stalker hunts the ALLY specifically, which is what
    // makes this an escort rather than a walk.
    e2: {
      level: 2,
      terrain: {
        theme: 'town',
        blocked: [{ x: 3, y: 2 }, { x: 3, y: 5 }, { x: 5, y: 3 }],
      },
      allies: {
        contact: {
          name: 'The Contact', baseClass: 'rogue',
          maxHealth: 62, armorClass: 11, movementRange: 4,
          abilities: ['twin'],
          behavior: { mode: 'follow' },
          placement: { x: 1, y: 4 },
        },
      },
      objective: {
        text: 'Get your contact through the market',
        win: [{ kind: 'ally_at_tiles', allyKey: 'contact', tiles: [{ x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }] }],
        loss: [{ kind: 'ally_dead', allyKey: 'contact' }],
      },
      // Battery 1: 100/100/84% at medium and up — the stalker alone was not
      // enough interception for a follow-mode escort.
      enemies: ['crescent_stalker', 'lantern_lifter', 'mooncap_marksman'],
      enemyPlacement: [{ x: 4, y: 4 }, { x: 5, y: 2 }, { x: 6, y: 5 }],
      waves: [
        // ⚠ Both scoped UP after battery 2: hard read 12% with 46% walls and
        // nightmare 0% with 87%. A follow-mode escort dies to interception far
        // faster than the party does — the ally's HP does not scale with the
        // party's competence, so an escort's top tiers need LESS added
        // pressure than a kill-all's, not more.
        { enemies: ['starstep_duelist'], placement: [{ x: 5, y: 6 }], trigger: { on: 'round', round: 3 }, difficulties: ['hard', 'nightmare'] },
      ],
      playerPlacement: [{ x: 1, y: 3 }, { x: 2, y: 4 }, { x: 1, y: 5 }, { x: 0, y: 4 }],
      goals: [
        { slug: 'unremarked', name: 'Unremarked', description: 'Finish with the whole party standing.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 0.95, medium: 1.05, hard: 1.15, nightmare: 1.30 },
    },

    // e3 — The Silver Arch (hold). REUSED from the shipped e2. Casing the
    // palace's land gate: hold the arch long enough to read the guard rotation.
    e3: {
      level: 3,
      terrain: {
        theme: 'town',
        blocked: [{ x: 2, y: 2 }, { x: 2, y: 5 }, { x: 5, y: 2 }, { x: 5, y: 5 }],
      },
      objective: {
        text: 'Hold the arch and read the rotation (6 rounds)',
        win: [{ kind: 'round_reached', round: 6 }],
      },
      enemies: ['velvet_gate_guard', 'silverthread_mender', 'mooncap_marksman'],
      enemyPlacement: [{ x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 5 }],
      waves: [
        {
          enemies: ['lantern_lifter', 'starstep_duelist'],
          placement: [{ x: 0, y: 3 }, { x: 0, y: 5 }],
          trigger: { on: 'round', round: 3 },
        },
        {
          enemies: ['mirror_footman'],
          placement: [{ x: 7, y: 4 }],
          trigger: { on: 'round', round: 4 },
          difficulties: ['hard', 'nightmare'],
        },
        // A hold is scale-weak, and this one read 98/84/72/64% — too easy at
        // EVERY tier. Bodies are the lever: one more arrival for everybody.
        // Scoped up after battery 2 (easy 56%/18% walls, medium 36%/37%): one
        // extra body at round 2 was worth ~40 points on a 6-round hold.
        { enemies: ['velvet_gate_guard'], placement: [{ x: 7, y: 3 }], trigger: { on: 'round', round: 2 }, difficulties: ['hard', 'nightmare'] },
      ],
      playerPlacement: [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 4 }],
      goals: [
        { slug: 'cased_it', name: 'Cased It', description: 'Hold with the whole party standing.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      hpScaleOverride: { easy: 0.90, medium: 1.10, hard: 1.00, nightmare: 1.10 },
    },

    // e4 — The Ferry Stage (hazard). REUSED from the shipped e3: twin marksmen
    // and a juggler's embers. Re-fictioned as an AUDITION — the troupe's colours
    // are the party's way past the gate, and the jugglers do not throw soft.
    e4: {
      level: 4,
      terrain: {
        theme: 'canal',
        blocked: [{ x: 3, y: 1 }, { x: 3, y: 6 }, { x: 5, y: 3 }],
        hazards: [
          { pos: { x: 4, y: 3 }, type: 'fire' }, { pos: { x: 4, y: 4 }, type: 'fire' },
          { pos: { x: 3, y: 3 }, type: 'fire' }, { pos: { x: 5, y: 4 }, type: 'fire' },
        ],
      },
      enemies: ['ember_juggler', 'ember_juggler', 'mooncap_marksman', 'starstep_duelist'],
      enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 5, y: 5 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
      goals: [
        { slug: 'good_audition', name: 'A Good Audition', description: 'Take the stage without losing anyone.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 0.94, medium: 0.98, hard: 1.20, nightmare: 1.30 },
    },

    // e5 — The Servants' Wing (rooms). Two rooms, laundry then silver hall.
    // Learning the palace from below — and HP carries across the door, which
    // is the first taste of the vault's own logic.
    e5: {
      level: 5,
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
      rooms: [
        {
          terrain: { theme: 'interior', blocked: [{ x: 3, y: 1 }, { x: 3, y: 6 }, { x: 5, y: 4 }] },
          enemies: ['mirror_footman', 'lantern_lifter'],
          enemyPlacement: [{ x: 5, y: 3 }, { x: 6, y: 5 }],
          exitDoors: [{ x: 7, y: 3 }, { x: 7, y: 4 }],
        },
        {
          terrain: { theme: 'interior', blocked: [{ x: 4, y: 2 }, { x: 4, y: 5 }, { x: 2, y: 3 }] },
          enemies: ['mirror_footman', 'silverthread_mender', 'starstep_duelist'],
          enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 5, y: 5 }],
          entryTiles: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
        },
      ],
      goals: [
        { slug: 'below_stairs', name: 'Below Stairs', description: 'Clear both rooms with the whole party standing.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      hpScaleOverride: { easy: 1.20, medium: 1.37, hard: 1.45, nightmare: 1.55 },
    },

    // e6 — The Invitation Courier (race). The guest list is being carried to
    // the gate; once it arrives, forged invitations stop working. Kill the
    // couriers before the clock — the same shape Lantern's ridge chase uses,
    // and a genuine race rather than a walk.
    e6: {
      level: 5,
      terrain: {
        theme: 'town',
        blocked: [{ x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 6 }, { x: 4, y: 7 }],
      },
      objective: {
        text: 'Stop the guest list reaching the gate (6 rounds)',
        win: [{ kind: 'units_dead', enemyKeys: ['list_courier'] }],
        loss: [{ kind: 'round_reached', round: 6 }],
      },
      enemies: ['list_courier', 'list_courier', 'velvet_gate_guard', 'mooncap_marksman'],
      enemyPlacement: [{ x: 7, y: 2 }, { x: 7, y: 5 }, { x: 5, y: 4 }, { x: 5, y: 3 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
      goals: [
        { slug: 'guest_list', name: 'The Guest List', description: 'Intercept them by round 5.', check: { kind: 'win_by_round', round: 5 } },
      ],
      hpScaleOverride: { easy: 1.15, medium: 1.50, hard: 1.75, nightmare: 2.00 },
    },

    // ── FORK 1 (L6) sits here in the graph ──────────────────────────────────

    // e7 — The Front Door (protect). The specialist works the lock or the word
    // while the party holds the landing. ⚠ The specialist is ARMED and tough:
    // a defenseless VIP here would be the third use of a beat CAMPAIGN_BEATS
    // §2 #10 already flags at two, and both prior uses needed a boss-tier HP
    // pool to stop ranged parties being walled.
    e7: {
      level: 6,
      terrain: {
        theme: 'interior',
        blocked: [{ x: 2, y: 2 }, { x: 2, y: 5 }, { x: 5, y: 1 }, { x: 5, y: 6 }],
      },
      allies: {
        specialist: {
          name: 'Your Specialist', baseClass: 'rogue',
          maxHealth: 74, armorClass: 12, movementRange: 3,
          abilities: ['twin'],
          behavior: { mode: 'hold' },
          placement: { x: 3, y: 4 },
        },
      },
      objective: {
        text: 'Keep the specialist working (6 rounds)',
        win: [{ kind: 'round_reached', round: 6 }],
        loss: [{ kind: 'ally_dead', allyKey: 'specialist' }],
      },
      enemies: ['velvet_gate_guard', 'mirror_footman', 'mooncap_marksman', 'moonhook_caller'],
      enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 7, y: 2 }, { x: 7, y: 5 }],
      waves: [
        // Scoped to medium+ — battery 1 had easy walling 27% of builds and
        // medium 32%, with the specialist dying rather than the party. A
        // protect objective punishes the low tiers hardest because the ally's
        // HP does not scale with the party's competence.
        {
          enemies: ['starstep_duelist', 'lantern_lifter'],
          placement: [{ x: 0, y: 3 }, { x: 0, y: 5 }],
          trigger: { on: 'round', round: 3 },
          difficulties: ['medium', 'hard', 'nightmare'],
        },
        {
          enemies: ['mirror_footman'],
          placement: [{ x: 7, y: 4 }],
          trigger: { on: 'round', round: 4 },
          difficulties: ['hard', 'nightmare'],
        },
      ],
      playerPlacement: [{ x: 3, y: 3 }, { x: 4, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 3 }],
      goals: [
        { slug: 'held_the_landing', name: 'Held the Landing', description: 'Nobody down when the door opens.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      hpScaleOverride: { easy: 0.90, medium: 1.10, hard: 1.00, nightmare: 1.10 },
    },

    // e8 — The Hall of Mirrors (carve). The carve showcase: a maze of mirror
    // frames where the wrong lane costs turns. Cover sits ON the approach, not
    // between the party and the shooters (the rule three failed layouts taught
    // in Lantern e2).
    e8: {
      level: 7,
      terrain: {
        theme: 'interior',
        blocked: [
          { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 5 }, { x: 2, y: 6 },
          { x: 4, y: 3 }, { x: 4, y: 4 },
          { x: 6, y: 1 }, { x: 6, y: 6 },
        ],
      },
      enemies: ['mirror_footman', 'mirror_footman', 'mooncap_marksman', 'palace_crier'],
      enemyPlacement: [{ x: 5, y: 3 }, { x: 5, y: 4 }, { x: 7, y: 2 }, { x: 7, y: 5 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
      goals: [
        { slug: 'no_reflection', name: 'No Reflection', description: 'Cross without losing anyone.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 1.03, medium: 1.36, hard: 1.55, nightmare: 1.50 },
    },

    // e9 — The Unmasking (survive). Mid-ball, someone calls "impostors!" — the
    // room turns and the party has to last until the crowd re-mixes and the
    // masks stop meaning anything. Waves from all sides; you cannot clear it.
    e9: {
      level: 8,
      terrain: {
        theme: 'interior',
        blocked: [{ x: 3, y: 2 }, { x: 3, y: 5 }, { x: 5, y: 2 }, { x: 5, y: 5 }],
      },
      objective: {
        text: 'Survive the sweep until the room re-mixes (7 rounds)',
        win: [{ kind: 'round_reached', round: 7 }],
      },
      enemies: ['mirror_footman', 'palace_crier', 'starstep_duelist', 'moonhook_caller'],
      enemyPlacement: [{ x: 6, y: 3 }, { x: 1, y: 2 }, { x: 6, y: 5 }, { x: 1, y: 5 }],
      waves: [
        {
          enemies: ['mirror_footman', 'lantern_lifter'],
          placement: [{ x: 0, y: 4 }, { x: 7, y: 3 }],
          trigger: { on: 'round', round: 3 },
        },
        {
          enemies: ['velvet_gate_guard', 'mooncap_marksman'],
          placement: [{ x: 7, y: 5 }, { x: 0, y: 2 }],
          trigger: { on: 'round', round: 5 },
          difficulties: ['hard', 'nightmare'],
        },
        // 100/88% at easy/medium — the sweep needs to actually sweep.
        { enemies: ['starstep_duelist'], placement: [{ x: 7, y: 4 }], trigger: { on: 'round', round: 2 } },
      ],
      playerPlacement: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }],
      goals: [
        { slug: 'still_masked', name: 'Still Masked', description: 'Nobody lost in the sweep.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 0.85, medium: 1.00, hard: 0.95, nightmare: 1.05 },
    },

    // ── FORK 2 (L9) sits here in the graph ──────────────────────────────────

    // e10 — The Vault (rooms). Three rooms of collected things — and the story
    // node AFTER this one is the reveal that none of them is the Charter. The
    // fight has to be worth playing on its own, because its prize is a
    // discovery rather than an object.
    e10: {
      level: 9,
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
      rooms: [
        {
          terrain: { theme: 'interior', blocked: [{ x: 3, y: 2 }, { x: 3, y: 5 }] },
          enemies: ['mirror_footman', 'starstep_duelist'],
          enemyPlacement: [{ x: 5, y: 3 }, { x: 5, y: 5 }],
          exitDoors: [{ x: 7, y: 3 }, { x: 7, y: 4 }],
        },
        {
          terrain: { theme: 'interior', blocked: [{ x: 4, y: 1 }, { x: 4, y: 6 }, { x: 2, y: 4 }] },
          enemies: ['velvet_gate_guard', 'moonhook_caller'],
          enemyPlacement: [{ x: 6, y: 3 }, { x: 6, y: 5 }],
          exitDoors: [{ x: 7, y: 4 }],
          entryTiles: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
        },
        {
          terrain: { theme: 'interior', blocked: [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 5, y: 2 }, { x: 5, y: 5 }] },
          enemies: ['silverthread_mender', 'mirror_footman', 'palace_crier'],
          enemyPlacement: [{ x: 6, y: 4 }, { x: 5, y: 3 }, { x: 6, y: 2 }],
          entryTiles: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
        },
      ],
      goals: [
        { slug: 'the_whole_take', name: 'The Whole Take', description: 'Clear all three rooms with the party standing.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      hpScaleOverride: { easy: 0.94, medium: 1.18, hard: 1.25, nightmare: 1.15 },
    },

    // e11 — The Cartographer's Stage (boss). REUSED from the shipped e5, now
    // fought ONSTAGE in front of his own guests for the sash he is wearing.
    // Kill-target: the mender is a complication you may solve or race past,
    // never a scripted "kill the healer first".
    e11: {
      level: 10,
      terrain: {
        theme: 'interior',
        blocked: [{ x: 3, y: 3 }, { x: 3, y: 5 }, { x: 6, y: 6 }, { x: 2, y: 1 }],
      },
      objective: {
        text: 'Take the Charter from the Night Cartographer',
        win: [{ kind: 'units_dead', enemyKeys: ['night_cartographer'] }],
      },
      enemies: ['night_cartographer', 'silverthread_mender', 'mirror_footman', 'starstep_duelist'],
      enemyPlacement: [{ x: 5, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 5 }, { x: 4, y: 2 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      goals: [
        { slug: 'took_the_sash', name: 'Took the Sash', description: 'Let the hero strike the final blow.', check: { kind: 'killing_blow_by_main' } },
      ],
      hpScaleOverride: { easy: 0.98, medium: 1.36, hard: 1.75, nightmare: 1.83 },
    },

    // e12 — The Rooftop Line (escape). THE FINALE, and not a boss: alarm up,
    // the whole palace behind you, exit at the gondola mooring. Everyone gets
    // out or nobody does.
    e12: {
      level: 10,
      terrain: {
        theme: 'town',
        blocked: [
          { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 6 }, { x: 2, y: 7 },
          { x: 4, y: 2 }, { x: 4, y: 5 }, { x: 6, y: 3 },
        ],
      },
      objective: {
        text: 'Reach the gondola line — everyone gets out (8 rounds)',
        win: [{
          kind: 'units_at_tiles', scope: 'all',
          tiles: [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }],
        }],
        loss: [{ kind: 'round_reached', round: 8 }],
      },
      enemies: ['velvet_gate_guard', 'mooncap_marksman', 'mirror_footman', 'palace_crier'],
      enemyPlacement: [{ x: 5, y: 4 }, { x: 6, y: 2 }, { x: 5, y: 3 }, { x: 6, y: 5 }],
      waves: [
        {
          enemies: ['starstep_duelist', 'lantern_lifter', 'mirror_footman'],
          placement: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 4 }],
          trigger: { on: 'round', round: 2 },
        },
        // ⚠ Was hard/nightmare-only, and the finale read 100/100/96/96% — the
        // whole household was supposedly chasing the party and nothing
        // arrived. Every tier gets the pursuit now; the late pair stays scoped.
        {
          enemies: ['crescent_stalker', 'mooncap_marksman'],
          placement: [{ x: 1, y: 2 }, { x: 1, y: 5 }],
          trigger: { on: 'round', round: 4 },
        },
        {
          enemies: ['velvet_gate_guard', 'mirror_footman'],
          placement: [{ x: 0, y: 3 }, { x: 0, y: 4 }],
          trigger: { on: 'round', round: 6 },
          difficulties: ['hard', 'nightmare'],
        },
      ],
      playerPlacement: [{ x: 0, y: 2 }, { x: 1, y: 3 }, { x: 0, y: 5 }, { x: 1, y: 6 }],
      goals: [
        { slug: 'clean_getaway', name: 'Clean Getaway', description: 'Reach the line by round 6.', check: { kind: 'win_by_round', round: 6 } },
      ],
      hpScaleOverride: { easy: 0.85, medium: 1.00, hard: 1.20, nightmare: 1.40 },
    },
  },

  nodes: {
    intro: {
      kind: 'story',
      text: 'The Moonberry night-market is four hundred stalls on eleven pontoons, and it has fed this city since before the city had a name. It belongs, on paper, to the families who built it.\n\nOn different paper — one sheet, signed, witnessed, and won at cards eleven years ago in a game everybody now agrees was rigged — it belongs to the Night Cartographer.\n\nHe has never closed it. He simply takes a third of everything, and once a year, on the brightest night of the summer, he throws a masquerade aboard his floating palace to celebrate the anniversary of winning it.\n\nThe families have exhausted the courts. Tonight they hire {mainName} instead.\n\n"Get in," says the eldest of them, sliding a purse across the table. "Open his vault. Bring back the Charter."',
      next: 'dock_pre',
    },
    dock_pre: {
      kind: 'encounter', encounter: 'e1',
      preText: 'You come in low and quiet on the canal side, and the dock is not as empty as it was supposed to be — three of the Cartographer\'s lantern lifters, working the water-stairs for whatever the tide brings up.\n\nThey have not raised an alarm. {mainName} would very much like to keep it that way, which means finishing this before anyone thinks to.',
      next: 'lv2',
    },
    lv2: { kind: 'levelup', level: 2, next: 'contact_note' },
    contact_note: {
      kind: 'story',
      text: 'A heist needs three things the company does not have: a way in, a way through, and a way out.\n\nIt has, instead, a name — a market-family contact who knows all three, currently sitting in a tea-house on the far side of the night market with people watching the door.\n\n"They\'ll have somebody on me," the note says. "Somebody fast."',
      next: 'market_pre',
    },
    market_pre: {
      kind: 'encounter', encounter: 'e2',
      preText: 'The market at midnight is four hundred stalls of cover and no sightlines at all, which cuts both ways.\n\nSomething is moving parallel to you through the aisles — fast, patient, and not interested in the party at all. It wants the contact.\n\nKeep them alive, {mainName}, and keep moving.',
      next: 'lv3',
    },
    lv3: { kind: 'levelup', level: 3, next: 'arch_note' },
    arch_note: {
      kind: 'story',
      text: '"Three ways in," says the contact, drawing on the table in spilled tea. "Front gate — the Silver Arch — invitation only, and the invitations are hand-checked by a woman who has met every guest personally.\n\n"Water-door, under the west wing. Gondoliers only, and they know each other\'s faces.\n\n"Or the troupe entrance." A pause. "He hires performers. Dozens of them, every year, and they come in wearing masks."\n\n"So we get hired," says {mainName}.\n\n"So you audition," says the contact. "But first — we watch the arch, and we learn who stands where."',
      next: 'arch_pre',
    },
    arch_pre: {
      kind: 'encounter', encounter: 'e3',
      preText: 'Casing a gate means being AT the gate long enough to read it — six rounds of guard rotation, from close enough to count.\n\nThe velvet guards notice, eventually. They always do. Hold the arch, {mainName}, and let the eyes do their work.',
      next: 'lv4',
    },
    lv4: { kind: 'levelup', level: 4, next: 'audition_note' },
    audition_note: {
      kind: 'story',
      text: 'The troupe auditions on a moored ferry-stage two hours before the doors open, and the Cartographer\'s people are not gentle about it. Last year\'s juggler is this year\'s judge, and the judging involves live fire.\n\n"They throw," the contact says, apologetic. "It\'s not personal. It\'s just the standard."\n\n{mainName} looks at the stage, and at the embers already scattered across it, and at the company.\n\n"We\'ve done worse for less."',
      next: 'audition_pre',
    },
    audition_pre: {
      kind: 'encounter', encounter: 'e4',
      preText: 'The stage is small, the embers are already burning where you want to stand, and the marksmen at the back are scoring the performance.\n\nDo not stand in the fire, {mainName}. Everything else is showmanship.',
      next: 'lv5',
    },
    lv5: { kind: 'levelup', level: 5, next: 'servants_note' },
    servants_note: {
      kind: 'story',
      text: 'The company gets the colours: half-masks, silver on black, and a call time.\n\nColours get you aboard. They do not get you above the waterline — performers stay in the servants\' wing until they are wanted, and the servants\' wing is where the palace keeps everything it does not want guests to see.\n\nIncluding, it turns out, its footmen.',
      next: 'servants_pre',
    },
    servants_pre: {
      kind: 'encounter', encounter: 'e5',
      preText: 'Laundry first, then the silver hall — two rooms, one door between them, and no rest on the way through.\n\nWhatever you spend below stairs, {mainName}, you will not have upstairs.',
      next: 'courier_note',
    },
    courier_note: {
      kind: 'story',
      text: 'In the silver hall the contact stops dead, holding a schedule pinned to the wall.\n\n"They\'re running the guest list to the gate. Physical copy, checked against every mask at the door — including the performers." A beat. "Our names are not on it. When it arrives, our colours stop working."\n\n"How long?"\n\n"Two couriers, six minutes, and they left before we did."',
      next: 'courier_pre',
    },
    courier_pre: {
      kind: 'encounter', encounter: 'e6',
      preText: 'Two couriers, going in different directions, both faster than anyone in the company.\n\nBoth of them, {mainName}, and quickly. A list that reaches the gate is a list that gets read.',
      next: 'fork_specialist',
    },
    // ── FORK 1 (level 6) ────────────────────────────────────────────────────
    fork_specialist: {
      kind: 'choice',
      text: 'The contact can reach exactly one more person before the doors open, and the two of them do not work together.\n\nThe Forger can put the company on any list in the city and make the paper older than the ink. Walk in the front, greeted by name.\n\nThe Gondolier knows every water-door, service stair and rooftop crossing on the canal — not a way IN so much as a way through, and out again.',
      choices: [
        { label: 'The Forger — go in the front, invited.', setFlags: { tookForger: true }, grantAchievement: 'the_forger', grantBoon: 'forgers_papers', next: 'specialist_note' },
        { label: 'The Gondolier — come up through the water-door.', setFlags: { tookForger: false }, grantAchievement: 'the_gondolier', grantBoon: 'gondoliers_route', next: 'specialist_note' },
      ],
    },
    specialist_note: {
      kind: 'story',
      text: '{if tookForger}The Forger works for forty minutes and hands over four invitations that are, in every measurable respect, more genuine than the real ones. The woman at the arch greets the company by names they have never heard before and means it.{else}The Gondolier says almost nothing and simply walks, and the company follows her through a water-door, up a service stair, along a roof, and down into a linen store — inside the palace, forty feet from the ballroom, in under four minutes.{/if}\n\nEither way, the company is aboard. And either way, the Cartographer\'s private wing is behind one locked door on the upper landing, with the ball in full voice below.',
      next: 'door_pre',
    },
    door_pre: {
      kind: 'encounter', encounter: 'e7',
      preText: 'The lock is not a lock so much as an opinion — but opinions take time, and the landing is overlooked from three sides.\n\nYour specialist needs six rounds. {mainName} needs to make sure nobody reaches them for six rounds. That is the entire arrangement.',
      next: 'lv7',
    },
    lv7: { kind: 'levelup', level: 7, next: 'mirrors_pre' },
    mirrors_pre: {
      kind: 'encounter', encounter: 'e8',
      preText: 'Beyond the door: the Hall of Mirrors, which is not a hall with mirrors in it but a hall MADE of them — freestanding frames in ranks, angled so that every lane looks like every other lane and half of them end in glass.\n\nThe footmen know which lanes are real. {mainName} does not. Pick well.',
      next: 'lv8',
    },
    lv8: { kind: 'levelup', level: 8, next: 'unmask_note' },
    unmask_note: {
      kind: 'story',
      text: 'It goes wrong in the ballroom, and it goes wrong the way these things always do — not because of a mistake, but because somebody was simply looking at the right moment.\n\nA guest turns. Squints. Says, quite loudly and without malice, "But you\'re not with the troupe."\n\nAnd the room, four hundred masks strong, turns to look.',
      next: 'unmask_pre',
    },
    unmask_pre: {
      kind: 'encounter', encounter: 'e9',
      preText: 'The palace sweeps the floor for impostors, and the floor is crowded, and every mask looks like every other mask — which is the only thing keeping the company alive.\n\nSeven rounds until the dance changes and the room re-mixes, {mainName}. Do not get cornered. Do not get counted.',
      next: 'fork_sabotage',
    },
    // ── FORK 2 (level 9) ────────────────────────────────────────────────────
    fork_sabotage: {
      kind: 'choice',
      text: 'The vault is two floors down and the company has one thing it can break on the way.\n\nThe lantern-lines feed every light in the palace from a single winch room. Cut them and the whole wing goes dark — including the vault.\n\nThe alarm bells run off the same winch room, on a separate drum. Cut those and nothing rings tonight, no matter what anyone sees.',
      choices: [
        { label: 'Cut the lights — work in the dark.', setFlags: { cutLights: true }, grantAchievement: 'cut_the_lights', grantBoon: 'cut_the_lights', next: 'vault_pre' },
        { label: 'Cut the bells — let them shout all they like.', setFlags: { cutLights: false }, grantAchievement: 'cut_the_bells', grantBoon: 'cut_the_bells', next: 'vault_pre' },
      ],
    },
    vault_pre: {
      kind: 'encounter', encounter: 'e10',
      preText: '{if cutLights}The wing goes black between one step and the next, and the company keeps walking, because the company counted the steps on the way in.{else}The bells swing, and hammer, and produce a flat wooden knocking that carries nowhere at all. Somewhere above, a guard captain begins to shout himself hoarse.{/if}\n\nThree rooms stand between the party and the vault door, and the vault door is already open — because the Cartographer, tonight of all nights, has been showing people his collection.',
      next: 'reveal',
    },
    reveal: {
      kind: 'story',
      text: 'The vault is everything the families said it would be, and none of what they wanted.\n\nInvitations, eleven years of them, pinned in rows. Ledgers. A wall of small pretty stolen things, each labelled in a fine hand with the name of whoever used to own it. A gondola oar. Somebody\'s wedding ring.\n\nNo Charter.\n\n{mainName} stands in the middle of eleven years of other people\'s property and works it out about half a second before the contact says it out loud.\n\n"It\'s the sash," she says. "The Charter. He WEARS it. Every masquerade, eleven years running — that black sash with the silver thread. He\'s downstairs in it right now, in front of four hundred people, dancing."\n\nA pause.\n\n"Well," says {mainName}, already moving. "He did say he wanted a performance."',
      next: 'stage_pre',
    },
    stage_pre: {
      kind: 'encounter', encounter: 'e11',
      preText: 'The company comes down the grand stair in costume, in step, and four hundred masked guests assume — for about six seconds — that this is part of the entertainment.\n\nThe Night Cartographer, to his enormous credit, assumes it too. Then he sees who is under the masks, and smiles, and steps back into the ring of lanterns as though he had planned it.\n\n"Oh, WONDERFUL," he says.\n\nHe is wearing the deed to the night-market like a costume, {mainName}. Take it off him.',
      next: 'lv10',
    },
    lv10: { kind: 'levelup', level: 10, next: 'roof_pre' },
    roof_pre: {
      kind: 'encounter', encounter: 'e12',
      preText: 'The sash is in {mainName}\'s hand and the alarm is up — {if cutLights}shouted from window to window, since nothing in this wing will light{else}shouted, and only shouted, since nothing in this palace will ring{/if} — and the whole household is between the company and the water.\n\nUp, then. Across the roof line, to the gondola mooring at the east end.\n\nEight rounds, and everyone goes over the edge together, {mainName}. Nobody gets left on this roof.',
      next: 'finale',
    },
    finale: {
      kind: 'end',
      text: 'The gondola is where the contact promised, and the canal takes the company out through the lantern-lines before the palace works out which direction to look.\n\nThe Charter is read aloud at the night-market at dawn, to four hundred stalls on eleven pontoons and everyone who works them, and then it is burned in a brazier on the middle pontoon while people cheer — which is legally meaningless and, it turns out, entirely the point. The families file the original transfer the same morning. Nobody contests it. Contesting it would require explaining the card game.\n\nThe Night Cartographer does not pursue it. He sends, instead, a note: a map of the market drawn from memory, every stall in its right place, with a line beneath it in that same fine hand — *"It was the best thing I ever owned. You will take better care of it than I did. Do come next year."*\n\n{if tookForger}The Forger has, by then, produced four invitations for next summer. They are, as usual, more genuine than the real ones.{else}The Gondolier will not say how she got out. She was on the far pontoon before the party reached the water, and she was not wet.{/if}\n\nThe masquerade is held again the following summer, on the brightest night, by the families. Everyone is invited. There is no guest list.\n\nTHE MOONBERRY MASQUERADE — COMPLETE',
    },
  },
};
