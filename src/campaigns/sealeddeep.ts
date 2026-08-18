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
 * ⚠ NIGHTMARE WALL SHARES — AN OPEN QUESTION FOR THE OWNER (2026-08-18).
 * Across e4, e5, e6, e7, e8 and e9, the hpScale that CENTRES the nightmare mean
 * in its 15-45% band also puts 28-64% of sampled builds under the wall floor,
 * breaching buildBattery's 15% MAX_WALL_SHARE. That is systematic, not six
 * separate content bugs: if a cell's mean is 30% and its build distribution is
 * bimodal (the usual shape), a large share of builds necessarily sit near 0%.
 *
 * This may mean the CAP is wrong for nightmare rather than the content. The
 * owner's stated philosophy is "I am really okay with nightmare only being
 * beatable with certain strategies", which describes a high nightmare wall share
 * as the DESIGN, and the separate NIGHTMARE_BEST_MIN solvability check already
 * guarantees some build cracks each cell. A difficulty-scaled cap (tight on
 * easy/medium where the party is locked in for the run, loose on nightmare)
 * would encode that. Not changed unilaterally — the thresholds are owner-set.
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
  // Retargeted from cleric — no goblin cleric art exists (Cleric NPCs are
  // orc-chassis; see SKINS.md's race table). Landed on the one goblin chassis
  // the other three campaigns didn't claim: '80101' = Set 1 Wizard-Goblin.
  // No thematic tie to this campaign's undead cast (it has no goblins at
  // all) — this is a pure stopgap reuse, not a story fit, per the owner.
  rewardSkin: { classSlug: 'wizard', skinId: '80101', name: 'Goblin Adept' },

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
      // acBonus, NOT warded. `warded` negates a whole hit, and e6's win requires
      // killing all THREE cultists inside a clock — so three shields was three
      // wasted player turns against a deadline, which walled 48% of builds on
      // nightmare (and 32% on e4). A flat +1 AC adds nightmare difficulty
      // without fighting the objective itself.
      nightmare: { acBonus: 1 },
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
    // ── e7's reavers get their OWN key purely for nightmare leverage ──
    // e7's escape objective is nearly hpScale-inert (1.70 -> 62%, 2.30 -> 61%),
    // and structure is shared across difficulties, so scale and the per-enemy
    // `nightmare` block are the only per-difficulty levers that exist — and
    // scale does not work here. This key exists so nightmare can be cranked
    // HARD without touching skeleton_reaver, which e12's room 1 also fields.
    stair_reaver: {
      baseClass: 'barbarian', artKey: 'skeleton_reaver', name: 'Stair Reaver',
      maxHealth: 55, armorClass: 10, specialSlug: 'whirlwind',
      nightmare: { hpBonus: 15, acBonus: 2 },
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
      // Calibration walk (25 builds x 25 games per rung, build-sampled mean):
      //   easy      1.20 -> 97 · 1.35 -> 91 · 1.50 -> 81
      //   medium    1.45 -> 86 · 1.60 -> 70 · 1.75 -> 56
      //   hard      1.15 -> 99 · 1.80 -> 54 · 2.40 -> 14 (60% walled)
      //   nightmare 1.95 -> 29 · 2.10 -> 16 · 2.25 ->  9
      // The placeholder 0.85-1.35 read 100/99/98/84 — a tutorial nobody could
      // lose, even on nightmare. Parked on band midpoints. Note the steepness
      // (~70 pts per 1.0 of scale): three IDENTICAL warriors share every hit
      // breakpoint, so the whole cell crosses a cliff at once.
      hpScaleOverride: { easy: 1.40, medium: 1.58, hard: 1.80, nightmare: 1.95 },
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
      // Calibration walk — ONE curve read across difficulties (only the scale
      // differs between them, so a medium rung and a hard rung sample the same
      // function): 1.10 -> 88 · 1.30 -> 60 · 1.35 -> 55 · 1.50 -> 38 ·
      // 1.55 -> 33 · 1.75 -> 17 · 1.95 -> 10.
      // Roughly TWICE as scale-sensitive as e1 (~28 pts per 0.2) because the
      // two zombies are 60 HP stalwart bricks and a multiplier bites hardest on
      // the biggest HP pool. Nightmare sits BELOW the naive 1.57 read for 30%,
      // because the archers' acBonus and the zombies' hpBonus already add
      // difficulty that this scale curve does not contain.
      hpScaleOverride: { easy: 1.10, medium: 1.20, hard: 1.35, nightmare: 1.42 },
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
          // 105, matching e8's crew, after the certified battery. At 60 this was
          // bimodal with 26-41% walled; 85 fixed EASY (86%, 9% walled) but left
          // medium at 59% mean with 30% walled — she was still dying in a third
          // of builds. Same lever, same second step as e8: a defenseless VIP
          // that ranged parties cannot body-block needs boss-tier HP outright.
          maxHealth: 105, abilities: [],
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
      // With the VIP at 85 HP the walls collapsed: easy 0.90 -> 89% and 0%
      // walled, where 60 HP gave 69% mean with 26% walled. Walk: hard 0.90 -> 81
      // · 1.10 -> 73 · 1.30 -> 60 (16% walled). Parked below the 1.30 rung
      // because the wall share was already at the cap there.
      // nm walk: 1.35 -> 44 (12% walled) · 1.55 -> 21 (40% walled) · 1.75 -> 9.
      // 1.38 splits them: 1.35 rides the band's top edge where noise flips the
      // verdict, and 1.55 breaches the wall cap outright.
      hpScaleOverride: { easy: 0.90, medium: 1.15, hard: 1.35, nightmare: 1.55 },
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
      // Walk: nm 0.95 -> 85 · 1.15 -> 56 · 1.35 -> 24 (32% walled). The wall
      // share was largely the cultist's `warded` nightmare block, now softened
      // to acBonus at the roster level, so this parks at 1.30 and the battery
      // certifies the walls.
      // nm walk after softening the cultist: 1.15 -> 50 (8% walled) ·
      // 1.30 -> 30 (36%) · 1.45 -> 12 (48%). 1.30 centres the mean exactly;
      // 1.15 would hold the walls under cap but leave the mean above band.
      hpScaleOverride: { easy: 0.85, medium: 1.0, hard: 1.15, nightmare: 1.30 },
    },

    // e5 — What Walks Through Walls (survive). Wraiths/specter get `phasing`
    // — carve cannot save you. The mercy rule (killing every phasing enemy
    // also wins) is accepted per the design doc; the round target is a
    // ceiling, not a guarantee.
    e5: {
      level: 4,
      // NO blocked tiles, deliberately. The original carve was meant to read as
      // "cover that cannot save you", but against PHASING enemies a wall is
      // pure player downside: the wraiths and specter walk through it while the
      // party pays full price to path around, which left squishy builds no
      // counterplay at all and is what produced the wall share. An open floor
      // gives ranged builds room to kite the thing that ignores walls.
      terrain: { theme: 'crypt' },
      objective: {
        // 8 rounds. Tried 6 to cut the wall share and it made the encounter
        // UN-TUNABLE: 96-100% across scale 2.05, 2.30, 2.55 and 100% at 2.40-3.00
        // on nightmare — six rounds is simply too short to lose, so no scale
        // matters. 8 is the shortest duration where the mean still responds to
        // scale, so it stays, and the wall share is accepted (see the
        // nightmare-wall note at the top of this file).
        text: 'Survive until the seal steadies (8 rounds)',
        win: [{ kind: 'round_reached', round: 8 }],
      },
      enemies: ['wraith', 'wraith', 'specter'],
      enemyPlacement: [{ x: 6, y: 2 }, { x: 6, y: 5 }, { x: 5, y: 4 }],
      // Waves are load-bearing, not flavour: without them the party clears
      // three phasers and wins on the MERCY rule (measured 100% at all four
      // difficulties, win reason "Every enemy has fallen"). Pending waves
      // suppress the mercy rule, so the only way out is to last the 8 rounds —
      // and that is what makes hpScale bite again (lantern e3's lesson: a
      // tankier enemy deals damage LONGER, so scale differentiates a survive
      // once clearing is off the table). Thematically it is the campaign's
      // engine: the dead keep arriving because the door keeps calling them.
      // ⚠ WAVE SIZE IS THE COARSE LEVER AND PHASERS ARE WORTH ~35 PTS EACH,
      // not the tuning table's generic 10-15. Measured, at comparable scales:
      //   +1 wave unit (4 total): 100% on easy AND 92-99% on hard — useless,
      //     scale gave only ~22 pts of range across 0.9 -> 1.6.
      //   +3 wave units (6 total): 27% on easy at the LOWEST scale probed.
      // Three is the right structure — it is the only one whose scale curve
      // spans the ~58 pts between an easy target and a nightmare target — but
      // it has to run at LOW scales. Phasers earn the premium: they ignore the
      // x=4 wall line (so the carve hinders only the party) and `drain` heals
      // them as they work.
      // Wave-size walk, all at comparable scales — this is the whole curve:
      //   +1 unit (4 total): 100% flat, scale spanned ~22 pts. No range at all.
      //   +3 units (6 total): range existed, but 36-80% of builds WALLED at
      //     every rung that hit a target mean — six phasers against four simply
      //     wipe squishy backlines.
      //   +2 units (5 total), arriving LATER (rounds 4 and 6): the middle rung,
      //     and where this parks. Later arrivals matter as much as fewer: the
      //     wipes came from being swarmed before the party had spent anything.
      waves: [
        { enemies: ['specter'], placement: [{ x: 7, y: 4 }], trigger: { on: 'round', round: 4 } },
        { enemies: ['wraith'], placement: [{ x: 0, y: 3 }], trigger: { on: 'round', round: 6 } },
      ],
      playerPlacement: [{ x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 }],
      // Walk at 8 rounds on the open floor: easy 1.30 -> 88 (8% walled) ·
      // 1.55 -> 74 · 1.80 -> 59; hard 1.80 -> 57 (28% walled) · 2.05 -> 44 ·
      // 2.30 -> 33; nm 2.10 -> 20 (64% walled).
      // ⚠ e5/hard is the campaign's one accepted marginal cell. Its mean is in
      // band at 1.70 (56%) but the wall share sits ~30% against a 25% cap, and
      // the window is closed: any scale low enough to cut the walls pushes the
      // mean above 65. That is the phaser bimodality — five wall-ignoring
      // enemies either get answered or wipe a squishy backline, so this cell
      // splits rather than spreads. Left at the in-band rung and flagged.
      hpScaleOverride: { easy: 1.30, medium: 1.45, hard: 1.70, nightmare: 2.00 },
    },

    // e6 — The Counting Song (race). Loss on round_reached — stop the chant.
    // The witch is why you cannot simply rush past the cultists.
    e6: {
      level: 5,
      objective: {
        // Clock 13, not 10. The tuning table's rule for a `race` is "make the
        // clock GENEROUS (untimed average + 2-3 rounds), then tune scale
        // normally" — a tight clock makes the cell hypersensitive and
        // non-monotonic. At clock 10 every rung walled 24-36% of builds: the
        // deadline, not the enemies, was doing the killing, and raising scale
        // only made more builds miss it. At 13 the clock catches genuinely slow
        // builds and hpScale gets to be the actual difficulty lever.
        // Win on the CHANTERS, not the room. `all_enemies_dead` meant four
        // kills inside the clock, and at hard/nightmare scales that was ~65 HP
        // x4 — so 28-40% of builds were walled by the DEADLINE even after it
        // went 10 -> 13. Naming the three cultists cuts the required damage by
        // a quarter and lets the witch live: she is the reason you cannot simply
        // rush the chant, and killing her was never the point.
        // Note all three cultists share one enemy key, so `enemyKeys: ['cultist']`
        // resolves to every cultist instance — exactly the three chanters.
        // Still a `race` for palette purposes: the deadline is what defines the
        // type, and the shape classifier keys off the round_reached LOSS.
        text: 'Silence the three chanters before the counting song ends (13 rounds)',
        win: [{ kind: 'units_dead', enemyKeys: ['cultist'] }],
        loss: [{ kind: 'round_reached', round: 13 }],
      },
      enemies: ['cultist', 'cultist', 'cultist', 'witch'],
      enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 5 }, { x: 6, y: 3 }, { x: 5, y: 4 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 4 }],
      goals: [
        { slug: 'outpaced_the_dead', name: 'Outpaced the Dead', description: 'Win the counting song by round 8.', check: { kind: 'win_by_round', round: 8 } },
      ],
      // Walk after BOTH fixes (clock 10 -> 13, win narrowed to the chanters):
      //   easy 1.20 -> 99 · 1.45 -> 88 (4% walled) · 1.70 -> 73 (20% walled)
      //   hard 1.70 -> 69 (4% walled!) · 1.95 -> 44 · 2.20 -> 26
      // The kill-count narrowing is what fixed the walls: at hard 1.70 the wall
      // share went 28% -> 4%. The clock alone (at 13) had left hard/nightmare
      // walling 28-40%, because four kills inside any deadline was the real
      // constraint, not the pace.
      // nm walk after softening the cultist: 1.85 -> 44 (28% walled) ·
      // 2.05 -> 23 (40%) · 2.25 -> 16 (40%). Softening moved the mean a long way
      // (18% -> 44% at 1.85) and the walls with it (48% -> 28%), but the wall
      // share still sits above the tool's 15% cap. Parked to CENTRE the mean —
      // see the nightmare-wall note at the top of this file.
      hpScaleOverride: { easy: 1.45, medium: 1.55, hard: 1.82, nightmare: 1.95 },
    },

    // e7 — The Flooded Stair (escape). The barrow answers the allegiance
    // choice; win by getting the whole party to the marked landing.
    e7: {
      level: 6,
      objective: {
        // The clock is the LEVER, not flavour. Measured: hpScale is nearly
        // inert on this escape — 1.30 -> 82%, 1.90 -> 73%, 2.30 -> 70%, i.e.
        // ~12 pts for nearly DOUBLE the enemy HP, because you win by arriving
        // and a tankier interceptor does not stop you, it just lives longer.
        // With a deadline, enemy HP finally matters (bodies you must fight
        // through or path around cost rounds), so difficulty becomes tunable.
        // The objective text already promised a collapsing stair; now it is real.
        text: 'Reach the flooded landing before the stair gives way (7 rounds)',
        // 4 tiles for a 4-unit party under scope:'all' — the documented trap
        // is listing FEWER tiles than living units, which is unwinnable.
        win: [{
          kind: 'units_at_tiles', scope: 'all',
          tiles: [{ x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
        }],
        // `main_dead` is doing real work here, not flavour. Two reasons:
        //  1) Nightmare was structurally UNREACHABLE without it — 54-56% flat
        //     across scale 2.00/2.40/2.80, even with a dedicated heavy nightmare
        //     block, because you win by walking PAST enemies and their HP/AC
        //     never touch that. A death condition is the one thing enemy DAMAGE
        //     feeds, and damage does scale with difficulty, so the ladder works.
        //  2) ⚠ `units_at_tiles scope:'all'` gets EASIER as your party dies —
        //     it only asks that every LIVING unit stand on a tile, so losing a
        //     straggler removes the body you were struggling to escort across.
        //     Without a death loss, sacrificing your slowest unit is a winning
        //     move. That is a perverse incentive, not a difficulty knob.
        loss: [{ kind: 'round_reached', round: 7 }, { kind: 'main_dead' }],
      },
      // A wall line at x=5 with gaps at y=0/4/7 turns a two-turn stroll into a
      // funnel. Measured before it: hard sat at 76-83% across 1.30-1.90 AND the
      // 7-round clock caught nobody, because six open tiles is two turns for
      // any build. scope:'all' means the SLOWEST unit gates the win, so a
      // chokepoint the wave can contest is the lever that actually bites here.
      terrain: {
        theme: 'crypt',
        blocked: [{ x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 5 }, { x: 5, y: 6 }],
      },
      enemies: ['stair_reaver', 'stair_reaver', 'wraith'],
      enemyPlacement: [{ x: 4, y: 2 }, { x: 4, y: 5 }, { x: 6, y: 4 }],
      // The stair answers you: a wave lands across the approach at round 2, so
      // the crossing is contested instead of a walk. Without it this measured
      // 100% at EVERY difficulty — and E0.4 predicted exactly that, since the
      // movement Deep Gift is worth ~+48 pts on an escape and every sampled
      // build that took movement simply outran the interceptors.
      waves: [
        { enemies: ['skeleton_archer', 'ghoul'], placement: [{ x: 6, y: 2 }, { x: 6, y: 5 }], trigger: { on: 'round', round: 2 } },
      ],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      // Centring walk AFTER main_dead landed (which moved everything ~30 pts
      // harder and, crucially, made the ladder respond at all):
      //   easy   0.35 -> 97 · 0.50 -> 90 (8% walled) · 0.65 -> 79
      //   medium 0.60 -> 85 · 0.75 -> 69 (16% walled) · 0.90 -> 51
      //   hard   0.90 -> 60 (8% walled) · 1.15 -> 44 · 1.40 -> 42
      //   nm     2.00 -> 21 · 2.40 -> 22 · 2.80 -> 22 (still inert up here, but
      //          in band, and the wall share is what pays for it)
      // The easy->nightmare span is wide (0.50 to 2.00) because the objective
      // only became scale-sensitive at all via the death condition.
      hpScaleOverride: { easy: 0.50, medium: 0.65, hard: 0.90, nightmare: 2.00 },
    },

    // e8 — The Long Way Up (escort). Walk the crew out. Guardrails from the
    // moonberry e4 lesson: hunter starts outside round-1 reach, boss-tier HP
    // for a defenseless VIP, hunter carries its OWN enemy key with aiHints.
    e8: {
      level: 7,
      allies: {
        crew: {
          name: 'The Survey Crew', baseClass: 'cleric',
          // 105 — genuinely boss-tier for L7, after two measured steps.
          // At 62: mean 34-35% flat across scale 1.80-2.40, 48-52% walled.
          // At 85: easy fixed (90%, 4% walled) but nightmare still inert
          //        (45-49% across 1.80-2.60) with 28-44% walled.
          // The escort objective is hpScale-inert BY NATURE (the tuning table
          // measured a balanced comp holding 100% through a 0.70->2.25 sweep),
          // so the wall share is the only thing worth chasing here, and it is
          // entirely "did the crew die". A defenseless NPC that ranged parties
          // cannot body-block needs the HP of a boss, not of a party member.
          maxHealth: 105, abilities: [],
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
      enemies: ['skeleton_berserker', 'barrow_hound', 'barrow_hound', 'skeleton_archer'],
      enemyPlacement: [{ x: 5, y: 4 }, { x: 6, y: 2 }, { x: 6, y: 6 }, { x: 6, y: 1 }],
      playerPlacement: [{ x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 1, y: 4 }],
      goals: [
        { slug: 'crew_intact', name: 'Crew Intact', description: 'Bring the whole survey crew out alive.', check: { kind: 'unit_survives', scope: 'all' } },
      ],
      // Walk with the 105 HP crew: easy 1.25 -> 90 (4% walled) ·
      // hard 1.70 -> 72 · 2.00 -> 65 · 2.30 -> 58 (24% walled) ·
      // nm 2.20 -> 58 · 2.60 -> 52 · 3.00 -> 48 (40% walled).
      // ⚠ NIGHTMARE IS STRUCTURALLY CAPPED at ~48% here. Escort is hpScale-inert
      // by nature (the tuning table measured a comp holding 100% across a
      // 0.70->2.25 sweep) and this campaign cannot add bodies on nightmare only,
      // since waves are not difficulty-conditional. 3.00 already puts a hunter at
      // 120 HP; pushing further buys nothing. Parked at the best available rung
      // and flagged rather than pretending scale can fix it.
      hpScaleOverride: { easy: 1.25, medium: 1.50, hard: 2.30, nightmare: 3.00 },
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
      // ⚠ HYPERSENSITIVE — 0.20 of scale swings 45-75 points, so this ladder is
      // deliberately narrow. Walk: easy 0.75 -> 97 · 0.95 -> 65 · 1.15 -> 20;
      // hard 0.85 -> 85 · 1.00 -> 53 (8% walled) · 1.15 -> 19 (52% walled);
      // nm 0.90 -> 57 · 1.05 -> 20 (32% walled). Seven bodies arriving in waves
      // compound fast. Nightmare sits just BELOW hard because its per-enemy
      // blocks already supply the extra difficulty.
      hpScaleOverride: { easy: 0.82, medium: 0.92, hard: 0.955, nightmare: 0.97 },
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
      // The Conductor moved from (4,4) to (7,4) — back behind her choir.
      // She never has to die, so hpScale on her 95 HP only ever makes her MORE
      // unkillable: pure pressure the party cannot answer, which is what walled
      // 30-40% of builds at hard/nightmare. Standing her off means she spends
      // the opening rounds closing, so the party gets a real window on the three
      // targets that DO matter. Distance, not HP — the tuning table's lever for
      // a boss's comp spread.
      enemyPlacement: [{ x: 4, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 5 }, { x: 7, y: 4 }],
      playerPlacement: [{ x: 0, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
      goals: [
        { slug: 'final_note', name: 'The Final Note', description: 'Let the hero personally silence the bone choir.', check: { kind: 'killing_blow_by_main' } },
      ],
      // Walk: easy 1.30 -> 85 · medium 1.60 -> 77 · 1.90 -> 51 · nm 2.10 -> 24.
      // Walls climbed with scale (36-40% at the top rungs) — addressed by
      // standing the Conductor off above rather than by softening the choir.
      // ⚠ Certified battery (100 builds) came in well below the 25-build walk:
      // medium 1.68 -> 59% (walk said 77), hard 1.85 -> 40% (walk said 51),
      // nm 2.00 -> 22%. That gap IS the walk's documented sampling noise, and
      // it is why rungs get certified rather than trusted. Pulled down to hit
      // the band midpoints against the battery's numbers, not the walk's.
      hpScaleOverride: { easy: 1.27, medium: 1.50, hard: 1.68, nightmare: 1.90 },
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
      // Walk (hold sits ON the marks, so guards die slowly and scale bites
      // cleanly): easy 1.20 -> 89 · medium 1.45 -> 68 · hard 1.70 -> 54 (12%
      // walled) · nm 1.90 -> 29 but 20% walled, so nightmare parks at 1.85 —
      // one point of mean is not worth breaching the wall cap.
      hpScaleOverride: { easy: 1.20, medium: 1.40, hard: 1.70, nightmare: 1.85 },
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
          enemies: ['skeleton_warrior', 'skeleton_archer'],
          enemyPlacement: [{ x: 5, y: 2 }, { x: 6, y: 3 }],
          exitDoors: [{ x: 7, y: 3 }, { x: 7, y: 4 }],
          doorMode: 'on_clear',
        },
        {
          // Room 2: the inner gallery.
          terrain: { theme: 'crypt', blocked: [{ x: 4, y: 2 }, { x: 4, y: 5 }] },
          enemies: ['zombie', 'ghoul'],
          enemyPlacement: [{ x: 6, y: 3 }, { x: 5, y: 4 }],
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
      // Garrison trimmed 3/3/3 -> 2/2/3 (nine bodies to seven), because the
      // alternative was worse. At nine, the walk put easy in band only at scale
      // 0.55 and hard at 0.75 — and 0.55 puts a skeleton_warrior at 26 HP,
      // under the roster's 28 HP floor and squarely "mook-weak", which the stat
      // discipline forbids. Garrison size is the coarse lever here (~45 pts per
      // unit), so dropping two units buys back roughly 0.4 of scale and lets
      // these sit in a healthy range instead. Re-walked after the trim.
      // Post-trim walk (7 bodies): easy 0.80 -> 80 (8% walled) · 0.95 -> 65 ·
      // hard 1.05 -> 47 (8% walled) · 1.20 -> 20 · 1.35 -> 7 (72% walled).
      // At 0.75 a skeleton_warrior is 39 HP — legal, where the nine-body version
      // needed 0.55 and 26 HP. Nightmare sits AT hard's rung deliberately: the
      // per-enemy nightmare blocks are worth ~28 pts on their own, so matching
      // scales still lands nightmare a full band below hard.
      hpScaleOverride: { easy: 0.75, medium: 0.88, hard: 1.00, nightmare: 1.05 },
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
