/**
 * sealeddeep.ts — "The Sealed Deep" (first PAID campaign).
 *
 * Under the moor town of Ashfen sits a barrow older than the town, with a door and a
 * warden. Six weeks ago the town's survey crew went down to shore up a collapsed
 * gallery and never came back. What the party finds: the dead are walking, but not
 * toward the town — they are walking INWARD, toward the door, pulled by whatever is
 * on the other side. Sister Vessa, the Warden, is still down there alone, three
 * centuries past her term, holding a seal that is failing faster than she can mend it.
 *
 * Vessa does not raise the dead and is not a summoner (owner call). She mends, seals,
 * and holds a line — the dead are drawn inward by something behind the door, which is
 * why the barrow keeps filling no matter how much of it is cleared. `waves` model that
 * pull (e9); no `summon` mechanic exists or is needed (design doc D2).
 *
 * Twist: the obvious read — "kill the grim woman among the walking dead" — is the
 * WRONG read. Acting on it is the mistake; the e6/e7 fork is where the party commits.
 * Tone: spooky-adventurous haunted-house, not horror. No child is in peril.
 *
 * Full design doc: mobile/CAMPAIGN2_DESIGN.md. First campaign to spend the `wizard`
 * chassis as an enemy and the `protect`/`survive` palette types, and the first to set
 * `artKey` at all — every one of the 11 undead artKeys ships here.
 *
 * `free: false` — this is the first paid campaign, but no purchase-gating exists yet
 * in the engine. Today `free: false` only omits a "FREE" badge in the UI; actual
 * paywall enforcement is a separate E4 task, not built here.
 */
import { CampaignDefinition } from './types.js';

export const sealedDeepCampaign: CampaignDefinition = {
  slug: 'sealeddeep',
  title: 'The Sealed Deep',
  blurb: 'Under the moor town of Ashfen, a warden three centuries past her term is losing her grip on a door the dead keep walking toward.',
  enemyFactionName: 'The Barrow Dead',
  free: false,
  startNode: 'intro',
  // TODO(skins): no skin system yet — unlock recorded in campaign meta locally.
  rewardSkin: { classSlug: 'cleric', skinId: 'sealed_deep_warden', name: 'Warden of the Deep' },

  achievements: [
    { slug: 'complete_easy',      name: 'Barrow Steps',        description: 'Complete The Sealed Deep on Easy.' },
    { slug: 'complete_medium',    name: 'Keeper of the Line',  description: 'Complete The Sealed Deep on Medium.' },
    { slug: 'complete_hard',      name: 'Warden\'s Equal',     description: 'Complete The Sealed Deep on Hard.' },
    { slug: 'complete_nightmare', name: 'Sealed the Deep',     description: 'Complete The Sealed Deep on Nightmare — unlocks the Warden of the Deep skin.' },
    { slug: 'stood_with_vessa',   name: 'Stand With Vessa',    description: 'Choose to stand with the Warden at the allegiance fork.' },
    { slug: 'sealed_her_out',     name: 'Seal Her Out',        description: 'Choose to shut the Warden out at the allegiance fork.' },
    { slug: 'swift_footing',      name: 'Light on Bone',       description: 'Choose swift footing at the second fork.' },
    { slug: 'iron_resolve',       name: 'Iron Resolve',        description: 'Choose iron resolve at the second fork.' },
    // Battle goals (A7) — slug must match the encounter goal's slug.
    { slug: 'clean_descent',      name: 'Clean Descent',       description: 'Clear the barrow steps without losing anyone.' },
    { slug: 'quiet_gallery',      name: 'Quiet Gallery',       description: 'Carve through the collapsed gallery without the hero taking a scratch.' },
    { slug: 'kept_the_watch',     name: 'Kept the Watch',      description: 'Keep the whistling survivor alive to the very end.' },
    { slug: 'outpaced_the_dead',  name: 'Outpaced the Dead',   description: 'Win the counting song by round 8.' },
    { slug: 'crew_intact',        name: 'Crew Intact',         description: 'Bring the whole survey crew out alive.' },
    { slug: 'final_note',         name: 'The Final Note',      description: 'Let the hero personally silence the bone choir.' },
  ],

  // ── Cast (design doc §3) ────────────────────────────────────────────────
  // Every one of the 11 B1 undead artKeys ships here. baseClass drives engine
  // mechanics (stats/AI/specials); artKey is a separate art-routing field that
  // points at the undead sprite instead of the chassis's goblin/orc default —
  // both are set on every enemy below. Stat discipline: HP floor 28, AC floor
  // 8, near-base-or-up, fewer-but-stronger.
  enemies: {
    // ── Skeletons (fighter/ranger/barbarian chassis) ──
    skeleton_warrior: {
      baseClass: 'fighter', artKey: 'skeleton_warrior', name: 'Skeleton Warrior',
      maxHealth: 52, armorClass: 12, specialSlug: 'concussive',
      nightmare: { hpBonus: 6 },
    },
    skeleton_archer: {
      baseClass: 'ranger', artKey: 'skeleton_archer', name: 'Skeleton Archer',
      maxHealth: 38, armorClass: 11, specialSlug: 'piercing',
      nightmare: { acBonus: 1 },
    },
    skeleton_reaver: {
      baseClass: 'barbarian', artKey: 'skeleton_reaver', name: 'Skeleton Reaver',
      maxHealth: 55, armorClass: 10, specialSlug: 'whirlwind',
      nightmare: { hpBonus: 5 },
    },
    skeleton_berserker: {
      // Gets worse as it dies — vengeful ✦ pairs with roar's melee ring.
      baseClass: 'barbarian', artKey: 'skeleton_berserker', name: 'Skeleton Berserker',
      maxHealth: 55, armorClass: 9, specialSlug: 'roar',
      passiveFlags: ['vengeful'],
      nightmare: { hpBonus: 5 },
    },
    // ── The wall you walk around ──
    zombie: {
      // Basic-only (abilities override, no special) + stalwart/thorns: slow,
      // high HP, punishes melee swarming. movementRange 2 sells "shambling".
      baseClass: 'fighter', artKey: 'zombie', name: 'Zombie',
      maxHealth: 60, armorClass: 9, movementRange: 2,
      abilities: ['sword'],
      passiveFlags: ['stalwart', 'thorns'],
      nightmare: { hpBonus: 6 },
    },
    // ── Ghoul: freeze-then-feast with the witch ──
    ghoul: {
      baseClass: 'rogue', artKey: 'ghoul', name: 'Ghoul',
      maxHealth: 45, armorClass: 8, specialSlug: 'dagger_toss',
      passiveFlags: ['opportunist'],
      nightmare: { acBonus: 1 },
    },
    // ── Phasing warlocks (walk through walls) ──
    wraith: {
      baseClass: 'warlock', artKey: 'wraith', name: 'Wraith',
      maxHealth: 43, armorClass: 9, specialSlug: 'drain',
      moveFlags: ['phasing'],
      nightmare: { acBonus: 1 },
    },
    specter: {
      baseClass: 'warlock', artKey: 'specter', name: 'Specter',
      maxHealth: 43, armorClass: 9, specialSlug: 'fear',
      moveFlags: ['phasing'],
      nightmare: { acBonus: 1 },
    },
    // ── The living: cultist, the clock in e6 ──
    cultist: {
      baseClass: 'sorcerer', artKey: 'cultist', name: 'Cultist',
      maxHealth: 34, armorClass: 9, specialSlug: 'ffh',
      nightmare: { passiveFlags: ['warded'] },
    },
    // ── The wizard-chassis debut: control, not damage ──
    witch: {
      baseClass: 'wizard', artKey: 'witch', name: 'Witch',
      maxHealth: 34, armorClass: 11, specialSlug: 'cold_snap',
      passiveFlags: ['channeler'],
      nightmare: { acBonus: 1 },
    },
    // ── The conductor. Not a sponge — see e10; never a required kill (e10). ──
    necromancer: {
      baseClass: 'warlock', artKey: 'necromancer', name: 'Necromancer',
      maxHealth: 95, armorClass: 10, specialSlug: 'grasp',
      passiveFlags: ['warded'],
      nightmare: { hpBonus: 8 },
    },
    // ── e8's dedicated escort hunter (own aiHints key, per the escort rule) ──
    barrow_hound: {
      baseClass: 'rogue', artKey: 'ghoul', name: 'Barrow Hound',
      maxHealth: 40, armorClass: 8, movementRange: 5,
      aiHints: { priorityTarget: 'ally' },
      nightmare: { acBonus: 1 },
    },
    // ── e10's three named choristers (per-instance HP variance allowed later) ──
    chorister_witch: {
      baseClass: 'wizard', artKey: 'witch', name: 'Chorister', specialSlug: 'cold_snap',
      maxHealth: 40, armorClass: 10,
      passiveFlags: ['channeler'],
      nightmare: { acBonus: 1 },
    },
    chorister_cultist_1: {
      baseClass: 'sorcerer', artKey: 'cultist', name: 'Chorister', specialSlug: 'ffh',
      maxHealth: 38, armorClass: 9,
      nightmare: { acBonus: 1 },
    },
    chorister_cultist_2: {
      baseClass: 'sorcerer', artKey: 'cultist', name: 'Chorister', specialSlug: 'ignite',
      maxHealth: 38, armorClass: 9,
      nightmare: { acBonus: 1 },
    },
    // e12's finale boss, distinct key from e10's necromancer for name/story clarity.
    the_conductor: {
      baseClass: 'warlock', artKey: 'necromancer', name: 'The Conductor',
      maxHealth: 100, armorClass: 10, specialSlug: 'grasp',
      passiveFlags: ['warded'],
      nightmare: { hpBonus: 8 },
    },
  },

  encounters: {
    // ═══ Palette (design doc §2): e1 kill-all · e2 carve · e3 protect ·
    // e4 hazard · e5 survive · e6 race · e7 escape · e8 escort · e9 siege ·
    // e10 boss · e11 hold · e12 rooms. 12 distinct types, none repeated,
    // none consecutive. hpScaleOverride values below are PLACEHOLDERS — a
    // later balance battery tunes them; here they only need to be plausible.
    // ════════════════════════════════════════════════════════════════════

    // e1 — The Barrow Steps (kill-all). Tutorial: enemies ahead and below, the
    // party entering from one edge (a descent, not a front-and-rear pincer).
    e1: {
      level: 1,
      enemies: ['skeleton_warrior', 'skeleton_warrior', 'skeleton_warrior'],
      enemyPlacement: [{ x: 4, y: 1 }, { x: 3, y: 2 }, { x: 5, y: 2 }],
      playerPlacement: [{ x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }],
      noSpecials: true,
      goals: [
        { slug: 'clean_descent', name: 'Clean Descent', description: 'Clear the barrow steps without losing anyone.', check: { kind: 'no_party_deaths' } },
      ],
      hpScaleOverride: { easy: 0.85, medium: 1.0, hard: 1.15, nightmare: 1.35 },
    },

    // e2 — The Collapsed Gallery (carve). No objective — the terrain IS the
    // problem: a corridor of rubble with skeletons at range and zombies as
    // the chokepoint brutes at the front.
    e2: {
      level: 2,
      terrain: {
        theme: 'crypt',
        blocked: [{ x: 3, y: 1 }, { x: 3, y: 2 }, { x: 4, y: 5 }, { x: 4, y: 6 }],
      },
      enemies: ['skeleton_archer', 'skeleton_archer', 'zombie', 'zombie'],
      enemyPlacement: [{ x: 6, y: 1 }, { x: 6, y: 6 }, { x: 5, y: 3 }, { x: 5, y: 4 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      goals: [
        { slug: 'quiet_gallery', name: 'Quiet Gallery', description: 'Carve through the collapsed gallery without the hero taking a scratch.', check: { kind: 'no_damage_to_main' } },
      ],
      hpScaleOverride: { easy: 0.85, medium: 1.0, hard: 1.15, nightmare: 1.3 },
    },

    // e3 — Whistle in the Dark (protect). The first survivor found, huddled
    // and defenseless. `ally_dead` is REQUIRED on the objective (not implied)
    // for the party AI's +40% protect instinct to switch on. Boss-tier HP
    // (~60) and placed outside round-1 enemy reach.
    e3: {
      level: 2,
      allies: {
        survivor: {
          name: 'The Whistling Survivor', baseClass: 'cleric',
          maxHealth: 60, abilities: [],
          behavior: { mode: 'hold' },
          placement: { x: 6, y: 6 },
        },
      },
      objective: {
        text: 'Keep the survivor alive',
        win: [{ kind: 'all_enemies_dead' }],
        loss: [{ kind: 'ally_dead', allyKey: 'survivor' }],
      },
      // Enemies start at x<=4; survivor at (6,6) is well outside round-1 reach
      // (barbarian move 3 + melee 1 = 4 tiles from the nearest spawn).
      enemies: ['ghoul', 'ghoul', 'skeleton_reaver'],
      enemyPlacement: [{ x: 2, y: 2 }, { x: 1, y: 4 }, { x: 3, y: 5 }],
      playerPlacement: [{ x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 5 }],
      goals: [
        { slug: 'kept_the_watch', name: 'Kept the Watch', description: 'Keep the whistling survivor alive to the very end.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      hpScaleOverride: { easy: 0.9, medium: 1.05, hard: 1.2, nightmare: 1.4 },
    },

    // e4 — The Censer Hall (hazard). Fire-tile grid from tipped censers.
    e4: {
      level: 3,
      terrain: {
        theme: 'crypt',
        hazards: [
          { pos: { x: 3, y: 2 }, type: 'fire' }, { pos: { x: 4, y: 2 }, type: 'fire' },
          { pos: { x: 3, y: 5 }, type: 'fire' }, { pos: { x: 4, y: 5 }, type: 'fire' },
        ],
      },
      enemies: ['ghoul', 'ghoul', 'ghoul', 'cultist'],
      enemyPlacement: [{ x: 6, y: 1 }, { x: 6, y: 3 }, { x: 6, y: 6 }, { x: 5, y: 4 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      hpScaleOverride: { easy: 0.85, medium: 1.0, hard: 1.15, nightmare: 1.35 },
    },

    // e5 — What Walks Through Walls (survive). Wraiths/specter get `phasing`
    // — carve cannot save you. The mercy rule (killing every phasing enemy
    // also wins) is accepted per the design doc; the round target is a
    // ceiling, not a guarantee.
    e5: {
      level: 4,
      terrain: {
        theme: 'crypt',
        blocked: [{ x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }],
      },
      objective: {
        text: 'Survive until the seal steadies (8 rounds)',
        win: [{ kind: 'round_reached', round: 8 }],
      },
      enemies: ['wraith', 'wraith', 'specter'],
      enemyPlacement: [{ x: 6, y: 2 }, { x: 6, y: 5 }, { x: 5, y: 4 }],
      playerPlacement: [{ x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 }],
      hpScaleOverride: { easy: 0.9, medium: 1.05, hard: 1.25, nightmare: 1.5 },
    },

    // e6 — The Counting Song (race). Loss on round_reached — stop the chant.
    // The witch is why you cannot simply rush past the cultists.
    e6: {
      level: 5,
      objective: {
        text: 'Silence the counting song before it finishes (10 rounds)',
        win: [{ kind: 'all_enemies_dead' }],
        loss: [{ kind: 'round_reached', round: 10 }],
      },
      enemies: ['cultist', 'cultist', 'cultist', 'witch'],
      enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 5 }, { x: 6, y: 3 }, { x: 5, y: 4 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 4 }],
      goals: [
        { slug: 'outpaced_the_dead', name: 'Outpaced the Dead', description: 'Win the counting song by round 8.', check: { kind: 'win_by_round', round: 8 } },
      ],
      hpScaleOverride: { easy: 0.9, medium: 1.05, hard: 1.2, nightmare: 1.4 },
    },

    // e7 — The Flooded Stair (escape). The barrow answers the allegiance
    // choice; win by getting the whole party to the marked landing.
    e7: {
      level: 6,
      objective: {
        text: 'Reach the flooded landing before the stair gives way',
        win: [{
          kind: 'units_at_tiles', scope: 'all',
          tiles: [{ x: 6, y: 2 }, { x: 6, y: 3 }, { x: 7, y: 3 }, { x: 7, y: 4 }],
        }],
      },
      enemies: ['skeleton_reaver', 'skeleton_reaver', 'wraith'],
      enemyPlacement: [{ x: 4, y: 2 }, { x: 4, y: 5 }, { x: 5, y: 4 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      hpScaleOverride: { easy: 0.85, medium: 1.0, hard: 1.15, nightmare: 1.35 },
    },

    // e8 — The Long Way Up (escort). Walk the crew out. Guardrails from the
    // moonberry e4 lesson: hunter starts outside round-1 reach, boss-tier HP
    // for a defenseless VIP, hunter carries its OWN enemy key with aiHints.
    e8: {
      level: 7,
      allies: {
        crew: {
          name: 'The Survey Crew', baseClass: 'cleric',
          maxHealth: 62, abilities: [],
          behavior: { mode: 'route', waypoints: [{ x: 3, y: 4 }, { x: 5, y: 4 }, { x: 7, y: 4 }] },
          placement: { x: 0, y: 4 },
        },
      },
      objective: {
        text: 'Get the survey crew safely up the passage',
        win: [{ kind: 'ally_at_tiles', allyKey: 'crew', tiles: [{ x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }] }],
        loss: [{ kind: 'ally_dead', allyKey: 'crew' }],
      },
      // barrow_hound is the dedicated hunter key (own aiHints, not shared with
      // the ghoul chaff key); starts at (6,2), well outside round-1 reach of
      // the crew's (0,4) start.
      enemies: ['skeleton_berserker', 'barrow_hound', 'skeleton_archer'],
      enemyPlacement: [{ x: 5, y: 4 }, { x: 6, y: 2 }, { x: 6, y: 1 }],
      playerPlacement: [{ x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 1, y: 4 }],
      goals: [
        { slug: 'crew_intact', name: 'Crew Intact', description: 'Bring the whole survey crew out alive.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      hpScaleOverride: { easy: 0.8, medium: 1.0, hard: 1.2, nightmare: 1.4 },
    },

    // e9 — The Tide Inward (siege). Waves are the pull of the door — more of
    // the dead arriving from deeper in, not anyone's summons. Triggered on
    // round, not room-clear (no rooms here).
    e9: {
      level: 8,
      enemies: ['zombie', 'zombie', 'zombie'],
      enemyPlacement: [{ x: 5, y: 2 }, { x: 6, y: 4 }, { x: 5, y: 6 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 4 }],
      waves: [
        { enemies: ['skeleton_archer', 'skeleton_archer'], placement: [{ x: 7, y: 2 }, { x: 7, y: 5 }], trigger: { on: 'round', round: 3 } },
        { enemies: ['ghoul', 'ghoul'], placement: [{ x: 0, y: 2 }, { x: 0, y: 5 }], trigger: { on: 'round', round: 6 } },
      ],
      hpScaleOverride: { easy: 0.75, medium: 0.9, hard: 1.05, nightmare: 1.25 },
    },

    // e10 — The Bone Choir (boss). units_dead names the three choristers —
    // the necromancer/conductor is present but never has to die. Choristers
    // are three distinct enemy keys so per-instance HP can vary later.
    e10: {
      level: 9,
      objective: {
        text: 'Silence the three choristers',
        win: [{ kind: 'units_dead', enemyKeys: ['chorister_witch', 'chorister_cultist_1', 'chorister_cultist_2'] }],
      },
      enemies: ['chorister_witch', 'chorister_cultist_1', 'chorister_cultist_2', 'necromancer'],
      enemyPlacement: [{ x: 4, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 5 }, { x: 4, y: 4 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      goals: [
        { slug: 'final_note', name: 'The Final Note', description: 'Let the hero personally silence the bone choir.', check: { kind: 'killing_blow_by_main' } },
      ],
      hpScaleOverride: { easy: 0.85, medium: 1.0, hard: 1.2, nightmare: 1.45 },
    },

    // e11 — Three Wards, One Breath (hold). simultaneous:true means scope is
    // dead in that branch — exactly 3 ward tiles for 3 wards. Enemies
    // standing on a ward block it; that pressure is intended.
    e11: {
      level: 10,
      objective: {
        text: 'Hold all three wards at once',
        win: [{
          kind: 'units_at_tiles', scope: 'any', simultaneous: true,
          tiles: [{ x: 2, y: 1 }, { x: 5, y: 4 }, { x: 2, y: 6 }],
        }],
      },
      enemies: ['witch', 'witch', 'skeleton_archer', 'skeleton_archer'],
      enemyPlacement: [{ x: 2, y: 1 }, { x: 2, y: 6 }, { x: 5, y: 4 }, { x: 6, y: 3 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      hpScaleOverride: { easy: 0.9, medium: 1.1, hard: 1.3, nightmare: 1.55 },
    },

    // e12 — The Sealed Deep (rooms). 3 rooms, finale. Room 0 needs exitDoors;
    // room units are prebuilt at encounter build, so units_dead can legally
    // name the room-3 boss from turn 1. NO tile objective per the doc's
    // explicit warning — units_dead only.
    e12: {
      level: 10,
      objective: {
        text: 'Reach and defeat what waits behind the door',
        win: [{ kind: 'units_dead', enemyKeys: ['the_conductor'] }],
      },
      rooms: [
        {
          // Room 1: the outer vault.
          terrain: { theme: 'crypt', blocked: [{ x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 5 }, { x: 3, y: 6 }] },
          enemies: ['skeleton_warrior', 'skeleton_warrior', 'skeleton_archer'],
          enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 5 }, { x: 6, y: 3 }],
          exitDoors: [{ x: 7, y: 3 }, { x: 7, y: 4 }],
          doorMode: 'on_clear',
        },
        {
          // Room 2: the inner gallery.
          terrain: { theme: 'crypt', blocked: [{ x: 4, y: 2 }, { x: 4, y: 5 }] },
          enemies: ['zombie', 'ghoul', 'ghoul'],
          enemyPlacement: [{ x: 6, y: 3 }, { x: 5, y: 2 }, { x: 5, y: 5 }],
          entryTiles: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
          exitDoors: [{ x: 7, y: 3 }, { x: 7, y: 4 }],
          doorMode: 'on_clear',
        },
        {
          // Room 3: the sealed door itself. The Conductor waits, prebuilt.
          terrain: { theme: 'crypt' },
          enemies: ['the_conductor', 'wraith', 'specter'],
          enemyPlacement: [{ x: 5, y: 4 }, { x: 6, y: 2 }, { x: 6, y: 6 }],
          entryTiles: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
        },
      ],
      playerPlacement: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
      hpScaleOverride: { easy: 0.9, medium: 1.1, hard: 1.35, nightmare: 1.6 },
    },
  },

  nodes: {
    intro: {
      kind: 'story',
      text: 'Under the moor town of Ashfen sits a barrow older than the town — a door, and a warden who has kept it three hundred years. Six weeks ago the survey crew went down to shore up a collapsed gallery. They did not come back.\n\n{mainName} is hired to bring them out. The barrow entrance yawns at the edge of town, cold air breathing up from the dark.',
      next: 'descent',
    },
    descent: {
      kind: 'story',
      text: 'The steps down are worn smooth by centuries of feet that were never meant to climb back up. Halfway down, something moves — bones knitted into the shape of a soldier, still standing an old post.\n\nIt does not seem to notice {mainName}. It is walking the wrong way: not up, toward the town, but down, toward the door.',
      next: 'barrow_steps_node',
    },
    barrow_steps_node: {
      kind: 'encounter', encounter: 'e1',
      preText: 'The skeleton sentries turn only when {mainName} gets close — not hostile at first, more startled, like something that forgot it could be interrupted. Then old training takes over, and bone hands find old swords.',
      next: 'lv2',
    },
    lv2: { kind: 'levelup', level: 2, next: 'gallery_note' },
    gallery_note: {
      kind: 'story',
      text: 'Past the steps, the passage narrows into a gallery half-choked with fallen stone — the collapse the survey crew came to shore up. Chalk marks on the wall, still legible, read SAFE ROUTE THIS WAY in a hand that was clearly in a hurry.\n\nThe survey crew\'s own signs. They made it at least this far.',
      next: 'gallery_node',
    },
    gallery_node: {
      kind: 'encounter', encounter: 'e2',
      preText: 'Rubble chokes the gallery into a single crooked lane. Skeleton archers hold the high rubble on either side, and two shambling shapes plant themselves in the gap — slow, but built like the collapse itself.',
      next: 'lv3',
    },
    lv3: { kind: 'levelup', level: 3, next: 'whistle' },
    whistle: {
      kind: 'story',
      text: 'Beyond the gallery, a thin, tuneless whistling drifts from a side chamber — someone keeping their own spirits up in the dark. A survey lantern, badly rationed, still burns.\n\n{mainName} finds one of the crew alive, wedged behind a fallen support beam, too injured to move — and three shapes already closing in on the light.',
      next: 'whistle_node',
    },
    whistle_node: {
      kind: 'encounter', encounter: 'e3',
      preText: 'The survivor presses back against the stone, whistling through chattering teeth, too hurt to run. Feral shapes circle the lantern light. {mainName} plants between them and the beam.',
      next: 'lv2b_skip',
    },
    // e3 is the one early fight with no level-up (design doc §4) — story beat only.
    lv2b_skip: {
      kind: 'story',
      text: 'The survivor grips {mainName}\'s arm once the last shape falls still. "Ashfen sent someone," they say, disbelieving. "Vessa said no one comes down here anymore." They point deeper into the dark. "The others went on. Toward her. Toward the door — I don\'t know why. None of us could explain it, even to ourselves."',
      next: 'censer_note',
    },
    censer_note: {
      kind: 'story',
      text: 'Deeper in, the air turns thick with old incense. A long hall of iron censers lines the walls, most cold for centuries — but a few have been recently tipped, spilling embers across the stone floor in slow-crawling lines of fire.\n\nGhoulish shapes pick their way between the burning lanes like they know the pattern by heart.',
      next: 'censer_node',
    },
    censer_node: {
      kind: 'encounter', encounter: 'e4',
      preText: 'The ghouls scatter toward the fire lanes, using the flame to herd {mainName} instead of fearing it themselves. A hooded cultist stands at the hall\'s center, watching with open curiosity rather than alarm.',
      next: 'lv4',
    },
    lv4: { kind: 'levelup', level: 4, next: 'walls_note' },
    walls_note: {
      kind: 'story',
      text: 'The cultist did not run when the fight turned. "You\'ll want to be careful past here," they said, almost kindly, before {mainName} could ask anything else. "Some of them don\'t need doors anymore."\n\nA moment later, {mainName} understands: a pale shape drifts straight through solid stone ahead, unbothered, patient, and utterly wrong to look at.',
      next: 'walls_node',
    },
    walls_node: {
      kind: 'encounter', encounter: 'e5',
      preText: 'The wraiths do not walk around the crypt walls — they walk through them, appearing on whichever side is least defended. {mainName} plants the party where they can watch every angle and simply endures.',
      next: 'lv5',
    },
    lv5: { kind: 'levelup', level: 5, next: 'counting_note' },
    counting_note: {
      kind: 'story',
      text: 'A chant echoes up from a lower chamber, counted out in a slow, steady rhythm — cultists keeping time with something {mainName} can\'t see yet. A witch stands apart from the circle, unbothered by the growing frost creeping across the stone.\n\nThe counting is getting faster. Whatever it is building toward, it will finish with or without permission.',
      next: 'counting_node',
    },
    counting_node: {
      kind: 'encounter', encounter: 'e6',
      preText: 'The cultists break the chant only to defend it, falling back into rhythm the instant they can. The witch weaves frost between {mainName}\'s party and the circle, buying every second she can.',
      next: 'fork_allegiance',
    },
    fork_allegiance: {
      kind: 'choice',
      text: 'Past the counting chamber, a warded door bears fresh scratch marks — and a voice on the other side, tired and unapologetic: "Whoever you are, turn back. I don\'t have the strength to explain myself, and you won\'t like the truth anyway." Sister Vessa, the Warden, still alive after three centuries at her post. How does {mainName} answer her?',
      choices: [
        { label: 'Stand with Vessa — trust the warden holding the line.', setFlags: { stoodWithVessa: true }, grantAchievement: 'stood_with_vessa', grantBoon: 'stand_with_vessa', next: 'fork_allegiance_after' },
        { label: 'Seal her out — she is grim, alone, and surrounded by the dead. That is reason enough.', setFlags: { stoodWithVessa: false }, grantAchievement: 'sealed_her_out', grantBoon: 'seal_her_out', next: 'fork_allegiance_after' },
      ],
    },
    fork_allegiance_after: {
      kind: 'story',
      text: '{if stoodWithVessa}Vessa says nothing for a long moment, then presses a hand against the door. A faint ward settles over {mainName}\'s party like a held breath. "Don\'t make me regret this," she says, which is as close to thanks as she seems to get.{else}{mainName} turns away from the door without answering. Vessa doesn\'t call out again — but somewhere below, the party sleeps a little easier that night, whatever that\'s worth.{/if}\n\nAhead, the passage drops sharply toward a flooded stair, water rising fast from somewhere below.',
      next: 'stair_node',
    },
    stair_node: {
      kind: 'encounter', encounter: 'e7',
      preText: 'The stair floods a step at a time, and the barrow itself seems to be answering the choice at the door — water rising faster than it should, dead things surging up through it. {mainName} races for the landing above the flood line.',
      next: 'lv7',
    },
    lv7: { kind: 'levelup', level: 7, next: 'long_way_note' },
    long_way_note: {
      kind: 'story',
      text: 'Beyond the flooded stair, {mainName} finds the rest of the survey crew huddled in a dry alcove — exhausted, but alive, and desperate to see daylight again. The way back up is long, and something down here does not want them to leave.',
      next: 'long_way_node',
    },
    long_way_node: {
      kind: 'encounter', encounter: 'e8',
      preText: 'A lean, hungry shape breaks from the dark the moment the crew starts moving, beelining past every easier target straight for them. {mainName} moves to screen the crew\'s path up the passage.',
      next: 'lv8',
    },
    lv8: { kind: 'levelup', level: 8, next: 'tide_note' },
    tide_note: {
      kind: 'story',
      text: 'With the crew safely away, {mainName} turns back toward the door alone with the party. The deeper the barrow goes, the more the dead simply arrive — not summoned, not raised, just called, the way a tide comes in whether anyone wants it to or not.',
      next: 'tide_node',
    },
    tide_node: {
      kind: 'encounter', encounter: 'e9',
      preText: 'Zombies plant themselves at the chamber\'s heart, patient as stone, while more of the dead keep filing in from deeper passages as the fight wears on. Clearing the room does not stop the tide — only outlasting it does.',
      next: 'choir_note',
    },
    choir_note: {
      kind: 'story',
      text: 'Past the tide, a ring of robed figures stands in perfect unmoving silence around a raised dais — a bone choir, still and waiting. At its center stands a hooded shape neither speaking nor singing, simply conducting a song no one else can hear yet.\n\n"You don\'t have to kill the conductor," comes Vessa\'s voice from somewhere behind, quieter than before. "You have to make the choir stop singing."',
      next: 'fork_facing',
    },
    fork_facing: {
      kind: 'choice',
      text: 'The choir chamber opens ahead, and {mainName} has one more choice before stepping through: how to face whatever comes after.',
      choices: [
        { label: 'Move light and fast — better footing than armor down here.', setFlags: { choseSwiftFooting: true }, grantAchievement: 'swift_footing', grantBoon: 'swift_footing', next: 'fork_facing_after' },
        { label: 'Brace and hold — better to be hard to knock down.', setFlags: { choseSwiftFooting: false }, grantAchievement: 'iron_resolve', grantBoon: 'iron_resolve', next: 'fork_facing_after' },
      ],
    },
    fork_facing_after: {
      kind: 'story',
      text: '{if choseSwiftFooting}{mainName} leads the party in light and quick, trusting speed over sturdiness for whatever the choir chamber holds.{else}{mainName} leads the party in braced and steady, trusting that nothing down here will knock them off their feet.{/if}\n\nThe choir chamber waits, silent and patient, just ahead.',
      next: 'choir_node',
    },
    choir_node: {
      kind: 'encounter', encounter: 'e10',
      preText: 'The three choristers begin to hum the instant {mainName} enters — a low, rising note that seems to pull at the walls themselves. The conductor never moves from the dais, never has to. Silence the choir.',
      next: 'lv10',
    },
    lv10: { kind: 'levelup', level: 10, next: 'wards_note' },
    wards_note: {
      kind: 'story',
      text: 'With the choir silenced, the door\'s failing seal is laid bare — three warding stones, each guttering like a candle in wind. "Hold all three at once," Vessa says, appearing at last at the edge of the light, hollow-eyed and steady. "That\'s the only mending left in me. The rest is yours to hold."',
      next: 'wards_node',
    },
    wards_node: {
      kind: 'encounter', encounter: 'e11',
      preText: 'Witches and archers converge the instant a party member sets foot on a warding stone, determined to keep at least one uncovered. {mainName} splits the party to hold all three at once.',
      next: 'door_note',
    },
    door_note: {
      kind: 'story',
      text: 'The seal steadies. For the first time in six weeks — maybe the first time in three hundred years — the door itself falls quiet. But quiet is not the same as sealed, and Vessa is already moving toward it, one hand pressed flat against the stone.\n\n"Whatever\'s inside doesn\'t get out today," she says. "But it doesn\'t stop calling on its own. We finish this properly, or we do it again next season."',
      next: 'final_rooms_node',
    },
    final_rooms_node: {
      kind: 'encounter', encounter: 'e12',
      preText: 'Beyond the vault, the barrow opens into its oldest chambers — room after room the survey crew never reached, each one closer to the door than the last. At the very end waits the Conductor, patient as the barrow itself. {mainName} presses on to finish what the choir started.',
      next: 'finale',
    },
    finale: {
      kind: 'end',
      text: 'The Conductor falls still at last, and the pull toward the door goes quiet with it — not gone, Vessa warns, but quiet, the way a held breath is not the same as calm.\n\n{if stoodWithVessa}She leans against the sealed door, more tired than triumphant. "Couldn\'t have held it without you," she admits, like the words cost her something. "Come back and check on me sometime. I won\'t promise to be pleasant about it."{else}She nods once at {mainName}, unsurprised and unbothered. "You did the job. That\'s enough between us." She turns back to the door before the party has even left the chamber.{/if}\n\nThe survey crew is waiting topside when {mainName} climbs back into daylight, and Ashfen rings its bell for the first time in six weeks — not in alarm, but because someone finally came home.\n\nTHE SEALED DEEP — COMPLETE',
    },
  },

  boons: {
    stand_with_vessa: {
      slug: 'stand_with_vessa', name: 'The Warden\'s Ward',
      description: 'Vessa\'s wards cover the party for the rest of the descent — every unit starts each remaining encounter shielded.',
      effects: { startShielded: 'all' },
    },
    seal_her_out: {
      slug: 'seal_her_out', name: 'A Proper Rest',
      description: 'Without the warden\'s ward to lean on, the party rests properly instead — +6 max HP for the rest of the run.',
      effects: { partyMaxHp: 6 },
    },
    swift_footing: {
      slug: 'swift_footing', name: 'Light on Bone',
      description: '+1 movement range for the rest of the run.',
      effects: { partyMovement: 1 },
    },
    iron_resolve: {
      slug: 'iron_resolve', name: 'Iron Resolve',
      description: '+3 armor class for the rest of the run.',
      effects: { partyArmorClass: 3 },
    },
  },
};
