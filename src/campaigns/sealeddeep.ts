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

  // ⚠ MEASUREMENT ARTIFACT — THE EASY CEILING IS EFFECTIVELY 92, NOT 95.
  // The certification battery runs 25 games per build, so a build's win rate
  // can only land on multiples of 4% and the MEDIAN of those rates inherits the
  // same grid: 96, 92, 88 ... There is no 95. Any cell whose natural median
  // sits at the top therefore reads "TOO EASY" against a <=95 ceiling for a
  // reason that is arithmetic, not content — the next value down is 92, three
  // points inside the bound. Several cells here (e4/easy, e6/easy, e7/easy)
  // miss by exactly that one point and are parked deliberately rather than
  // pushed to a rung that breaks their wall caps.
  // Do not "fix" these by walking scale; either raise --games (100 games gives
  // 1% resolution) or read the miss as noise. Flagged for the owner 2026-08-23;
  // DIFFICULTY_TARGETS.md is frozen during tuning so the threshold itself is
  // untouched.

  // ── Cast (design doc §3) ────────────────────────────────────────────────
  // Every one of the 11 B1 undead artKeys ships here. baseClass drives engine
  // mechanics (stats/AI/specials); artKey is a separate art-routing field that
  // points at the undead sprite instead of the chassis's goblin/orc default —
  // both are set on every enemy below. Stat discipline: HP floor 28, AC floor
  // 8, near-base-or-up, fewer-but-stronger.
  // A6 — the Sealed Deep's own verb (2026-09-01, CAMPAIGN_DESIGN_SPECS §5):
  // THE SONG. The choir does not hurt you much; it takes your specials away
  // (ABL-16). Nobody else in the game touches your cooldowns. Counter: silence
  // the singer (they are the kill-target), and spend before you step into reach.
  abilities: {
    counting_song: {
      id: 'counting_song', slug: 'counting_song', name: 'Counting Song',
      description: 'The chant dulls your edge: 2 unblockable damage to every enemy around a tile within 4 steps, and their special abilities are set back 1 turn.',
      targetingType: 'aoe', range: 4, areaRadius: 1, cooldownTurns: 99,
      canTargetAlly: false, isSpecial: true, isUnblockable: true,
      excludeAllies: true, areaShape: 'chebyshev', isMultiHit: false,
      effects: [
        { type: 'damage', formula: 'flat', value: 2 },
        { type: 'modify_cooldown', abilitySlug: '*', delta: 1 },
      ],
    },
    crescendo: {
      id: 'crescendo', slug: 'crescendo', name: 'Crescendo',
      description: 'The Conductor raises a hand: 8 unblockable damage to an enemy within 4 steps, and their special abilities are set back 2 turns.',
      targetingType: 'single', range: 4, areaRadius: 0, cooldownTurns: 99,
      canTargetAlly: false, isSpecial: true, isUnblockable: true,
      excludeAllies: false, areaShape: 'chebyshev', isMultiHit: false,
      effects: [
        { type: 'damage', formula: 'flat', value: 8 },
        { type: 'modify_cooldown', abilitySlug: '*', delta: 2 },
      ],
    },
  },

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
      // 3, stated explicitly. The zombie runs the FIGHTER chassis, so before
      // this field existed it inherited THORNS_DAMAGE_BY_CLASS and jumped 3 -> 5
      // the moment the player's Fighter was buffed on 2026-08-23 — three zombies
      // in e9 turned every melee swing into a 5 HP tax and the sweep showed
      // melee parties at 0-17% at EVERY start distance. Enemy retaliation is
      // authored here now, not inherited from arena balance.
      thornsDamage: 3,
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
      maxHealth: 34, armorClass: 9, abilities: ['bolt', 'ffh', 'counting_song'],
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
      maxHealth: 95, armorClass: 10, abilities: ['eldritch', 'grasp', 'counting_song'],
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
      maxHealth: 100, armorClass: 10, abilities: ['eldritch', 'grasp', 'crescendo'],
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
      terrain: { theme: 'crypt' },
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
      // ⚠ TUTORIAL EXEMPTION at medium (owner standard, 2026-08-24). A
      // campaign's FIRST fight — level 1, no specials, party at -8 max HP —
      // is calibrated to ~85% mean / ~90% median with no walled archetype,
      // which reads TOO EASY against the general medium band on purpose. The
      // owner played unlitbeacon e1 at a measured-PASS 78% mean and called it
      // "about the level I would expect of HARD for a first encounter": win
      // rate does not measure GRIND, and every e1 in the catalog sat in that
      // same 71-78% zone. Survey (80 builds x 25 games/rung) and the rung
      // chosen here:
      //   1.18 -> 73% mean/76% median · 1.06 -> 83%/88%, 0% walls · 0.98 -> 93% (too far)
      hpScaleOverride: { easy: 1.05, medium: 1.06, hard: 1.32, nightmare: 1.36 },
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
      // Two Thorns/Stalwart zombies in the gap is a wall melee cannot answer
      // (sweep: melee 17-48 at every offset). Easy and medium meet one.
      enemiesByDifficulty: {
        easy: ['skeleton_archer', 'skeleton_warrior', 'zombie', 'skeleton_warrior'],
        medium: ['skeleton_archer', 'skeleton_archer', 'zombie', 'skeleton_warrior'],
      },
      // spreadSweep -1 (2026-09-01): archers a step higher on the rubble —
      // ranged 43 -> 87; every floor held.
      enemyPlacement: [{ x: 7, y: 1 }, { x: 7, y: 6 }, { x: 6, y: 3 }, { x: 6, y: 4 }],
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
      hpScaleOverride: { easy: 0.70, medium: 0.80, hard: 0.95, nightmare: 1.05 },
    },

    // e3 — Whistle in the Dark (protect). The first survivor found, huddled
    // and defenseless. `ally_dead` is REQUIRED on the objective (not implied)
    // for the party AI's +40% protect instinct to switch on. Boss-tier HP
    // (~60) and placed outside round-1 enemy reach.
    e3: {
      level: 2,
      terrain: { theme: 'crypt' },
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
      // spreadSweep +1 (2026-09-01): ranged 35 -> 100, spread 57 -> 2; scale up to pay.
      enemyPlacement: [{ x: 3, y: 3 }, { x: 2, y: 4 }, { x: 3, y: 5 }],
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
      hpScaleOverride: { easy: 1.00, medium: 1.20, hard: 1.40, nightmare: 1.50 },
    },

    // e4 — The Censer Hall (hazard). Fire-tile grid from tipped censers.
    e4: {
      level: 3,
      terrain: {
        theme: 'crypt',
        // Two fire tiles, not four (2026-08-23, same pass as the ghoul->zombie
        // mix below). The hazards were the second half of this cell's wall
        // problem: they are unavoidable chip on the APPROACH, which costs a
        // strong comp a few HP and costs a weak comp the fight, so they pushed
        // the bottom of the build distribution under the floor without moving
        // the median at all. That is wall-share damage with no difficulty
        // payoff. One tile per lane keeps the fire lanes readable — the fiction
        // and the herding behaviour are unchanged — at half the tax.
        hazards: [
          { pos: { x: 3, y: 2 }, type: 'fire' },
          { pos: { x: 3, y: 5 }, type: 'fire' },
        ],
      },
      // ⚠ COMPOSITION MIX, 2026-08-23 (owner-authorized). This was three
      // IDENTICAL ghouls + the cultist, and identical bodies share every
      // kill-breakpoint, so the whole cell crossed at once: measured at 40
      // builds, easy went 90% solving at scale 0.55 to 33% at 0.70 to 0% at
      // 1.00. That is not a difficulty slope, it is a coin flip on comp, and
      // scale cannot fix a bimodal cell (the audit's own rule — the same
      // reasoning that authorized the structural fix on unlitbeacon e11).
      // Neither easy nor medium had ANY passing rung: at the scale where the
      // median team still won 96% of its games, a tenth of teams were already
      // under the wall floor.
      // The third ghoul becomes a zombie: it keeps the body count and the HP
      // budget but strips a third of the incoming BURST (ghouls carry
      // opportunist + a ranged dagger_toss; the zombie is basic-only at
      // movement 2), and its 60 HP sits nowhere near the ghouls' 45, which is
      // what gives the cell a second breakpoint to slide between.
      // Compare e2 in this same campaign: mixed 2+2 composition, tunes
      // smoothly at every tier. That is the existence proof this is the cause.
      enemies: ['ghoul', 'ghoul', 'zombie', 'cultist'],
      // Easy: no song yet — the choir is introduced at e6.
      enemiesByDifficulty: { easy: ['ghoul', 'ghoul', 'zombie', 'skeleton_warrior'] },
      // ⚠ ENEMIES PULLED IN ONE TILE, 2026-08-23. THIS is the cell's real
      // problem, and it took a spreadSweep to see it. At the old distance
      // (mean Manhattan gap 5.3) the archetype spread was 53-57 points:
      //   easy   melee 42% · ranged 95% · balanced 78%
      //   medium melee 50% · ranged 85% · balanced 28%
      // The MELEE party was bricked by the crossing, not by the enemies — it
      // spent the fight walking into dagger_toss while the ranged party never
      // had to move. Every scale rung inherited that split, which is what made
      // the cell read bimodal and left easy/medium with no passing value: any
      // scale low enough to un-brick melee let the median walk it.
      // At gap 3.5 the spread collapses to 7 pts on easy and 25 on medium, and
      // melee goes 42% -> 93%. hpScale can finally do its job.
      // ⚠ This supersedes my own first diagnosis. The ghoul->zombie mix and the
      // hazard trim below were aimed at the identical-body breakpoint, which is
      // real but was the SMALLER effect; both are kept (they measured well and
      // the sweep numbers above include them), but start distance was the
      // dominant term. Re-sweep before trusting either in isolation.
      // Changing placement invalidates the scale row — re-walked below.
      enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 4, y: 4 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      // Walk: nm 0.95 -> 85 · 1.15 -> 56 · 1.35 -> 24 (32% walled). The wall
      // share was largely the cultist's `warded` nightmare block, now softened
      // to acBonus at the roster level, so this parks at 1.30 and the battery
      // certifies the walls.
      // nm walk after softening the cultist: 1.15 -> 50 (8% walled) ·
      // 1.30 -> 30 (36%) · 1.45 -> 12 (48%). 1.30 centres the mean exactly;
      // 1.15 would hold the walls under cap but leave the mean above band.
      // Row after the placement fix (150-build certification pending):
      //   easy 0.75 · medium 0.92 · hard 1.10 ✓ · nightmare 1.05 ✓
      //
      // ⚠ easy and medium MISS THE CEILING ON PURPOSE — there is no rung that
      // satisfies both bounds, and this is the documented "know when to stop"
      // case. Measured at medium (80-100 builds/rung):
      //     0.92 -> median 92 (ceiling 80) · walls 14% (cap 15) ✓
      //     0.96 -> median 84 · walls 21%
      //     1.00 -> median 72 ✓ · walls 24%
      // The typical team never stops walking it before a fifth of teams get
      // bricked. So the choice is WHICH bound to miss, and the philosophy names
      // the answer: when centring and the floors disagree, the floor wins. A
      // soft medium costs a good team some tension; a 24% wall share costs a
      // fifth of parties their RUN, in a campaign where the comp is locked.
      // easy is the same trade: 0.75 walls 6% and misses the ceiling, 0.77
      // passes the ceiling and walls 12%.
      // medium is CLOSED, measured three times at two build counts:
      //     0.92 -> median 92 · walls 12% (cap 15)
      //     0.98 -> median 80 (exactly the ceiling) · walls 18%
      //     1.04 -> median 60 · walls 28%
      // The median never clears the ceiling before the cap breaks. Parked at
      // 0.92 (walls safe, ceiling missed). nightmare 1.05 -> 1.15 after the
      // certification run read it TOO EASY at 1.05 (median 58 vs 45); 1.15
      // certifies at solve 43% / median 28 / walls 35% (cap 50).
      // Revisit only with a STRUCTURAL change (the spread work above already
      // took this cell from 53-pt archetype spread to 7); another scale walk
      // will just rediscover this table.
      hpScaleOverride: { easy: 0.75, medium: 0.92, hard: 1.10, nightmare: 1.15 },
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
        text: 'Survive until the seal steadies',
        win: [{ kind: 'round_reached', round: 8, roundByDifficulty: { easy: 7, nightmare: 9 } }],
      },
      enemies: ['wraith', 'wraith', 'specter'],
      // ⚠ PHASERS PUSHED BACK TWO TILES, 2026-08-23 (spreadSweep). At the old
      // distance this cell was not "hard", it was a party-archetype filter:
      //   medium  melee 95% · ranged  5% · balanced 15%   (90-pt spread)
      //   hard    melee 87% · ranged  0% · balanced  0%   (87-pt spread)
      // A RANGED party simply loses. Phasers ignore the carve and walk the
      // straight line to the squishiest thing on the board, so a backline that
      // cannot body-block dies in the first two rounds — and because they
      // ignore terrain, no wall layout fixes it. The sweep is unambiguous that
      // distance is the only dial that moves it: at gap 7.0 ranged goes 0% ->
      // 32% on hard and 5% -> 88% on medium, and the spread halves to 45/30.
      // Do NOT read the remaining hard-difficulty ranged weakness as balanced;
      // it is the least bad rung measured, and phaser COUNT is the next lever
      // if it needs more (the wave units at rounds 4 and 6 are the cheap ones
      // to trim). Changing placement invalidates the scale row — re-walked.
      enemyPlacement: [{ x: 7, y: 2 }, { x: 7, y: 5 }, { x: 7, y: 4 }],
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
      // ⚠ WHOLE ROW REBUILT 2026-08-23 (second pass). The first pass tuned this
      // cell against a SIM BUG: the harness's round-1 pre-flight committed a
      // frozen unit without ticking its duration, so a 2-turn freeze on a
      // fully-frozen team lasted an effective 3 turns in simulation and nowhere
      // else. Freezing the phasers — the obvious answer to this encounter — was
      // therefore overvalued by every measurement, and the row that resulted
      // (1.05/1.15/1.25/1.35) shipped HARDER than the sim believed. With the
      // engine's round-1 auto-skip closing that path, this cell re-measured all
      // four tiers failing on walls (nightmare 65% walled, median 0%).
      // Rebuilt: easy 1.00 ✓ · medium 1.05 ✓ · nightmare 1.22 ✓.
      // hard parks at 1.12: it clears the ceiling (median 60 vs 65) and misses
      // the wall cap by ONE point (26% vs 25%) — one build in a hundred, inside
      // the ±5 run-to-run noise. The alternative, 1.10, measured median 72 at
      // 130 builds: a 7-point ceiling miss to buy back a 1-point wall margin.
      hpScaleOverride: { easy: 1.00, medium: 1.05, hard: 1.12, nightmare: 1.22 },
    },

    // e6 — The Counting Song (race). Loss on round_reached — stop the chant.
    // The witch is why you cannot simply rush past the cultists.
    e6: {
      level: 5,
      terrain: { theme: 'crypt' },
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
        loss: [{ kind: 'round_reached', round: 13, roundByDifficulty: { easy: 14, hard: 12, nightmare: 11 } }],
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
      // e6 row 2026-08-23: hard 1.20 and nightmare 1.32 both certify. easy and
      // medium park one rung BELOW their ceilings on purpose — 1.02 pulls easy's
      // median to 88 but walls 17% (cap 10), and 1.06 pulls medium's to 76 but
      // walls 19% (cap 15). Same trade as e4: walls win. The three identical
      // cultists are the underlying cause (shared kill-breakpoint), but the
      // objective NAMES them — `units_dead: ['cultist']`, "silence the three
      // chanters" — so mixing the composition would rewrite the fight's premise
      // and its goal, which is why this one takes the documented miss instead.
      hpScaleOverride: { easy: 0.93, medium: 1.00, hard: 1.20, nightmare: 1.32 },
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
        loss: [{ kind: 'round_reached', round: 7, roundByDifficulty: { easy: 8, nightmare: 6 } }, { kind: 'main_dead' }],
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
      // D2: melee/balanced 30% — "your hero has fallen" to two Whirlwinds on
      // the stair. Easy and medium meet one reaver; the second is the top tiers'.
      enemiesByDifficulty: {
        easy: ['stair_reaver', 'skeleton_warrior', 'wraith'],
        medium: ['stair_reaver', 'skeleton_warrior', 'wraith'],
      },
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
      // e7 row 2026-08-23. medium 0.65 -> 0.75 (measured PASS: solve 60%,
      // median 76, walls 12%). easy STAYS at 0.50 and misses its ceiling by a
      // single point — see the quantization note in the campaign header; every
      // rung that pulls the median below 96 walls 12-32% of teams, because
      // `units_at_tiles scope:'all'` means a party that cannot get EVERY unit
      // to the landing scores a flat 0, so weak comps fall off a cliff rather
      // than degrading. Walls win over ceilings (the floor rule).
      hpScaleOverride: { easy: 0.50, medium: 0.68, hard: 0.90, nightmare: 2.00 },
    },

    // e8 — The Long Way Up (escort). Walk the crew out. Guardrails from the
    // moonberry e4 lesson: hunter starts outside round-1 reach, boss-tier HP
    // for a defenseless VIP, hunter carries its OWN enemy key with aiHints.
    e8: {
      level: 7,
      terrain: { theme: 'crypt' },
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
          // ⚠ ROUTE LENGTHENED 2026-08-23. It was a straight line down row 4:
          // seven tiles at movement 3, so the crew reached the exit on about
          // ROUND 3 and the encounter was decided before the hunters could
          // close. That is the real reason this cell resisted everything —
          // scale saturated (2.60 and 3.00 measured identically), and clocks of
          // 12, 9 and even 7 all left hard sitting at median 100, because none
          // of them can bind on a three-round fight.
          // The crew now switches back across the chamber, roughly tripling its
          // exposure, so the hunters get the rounds they need to be a threat
          // and the deadline becomes a real constraint instead of decoration.
          behavior: { mode: 'route', waypoints: [{ x: 3, y: 1 }, { x: 5, y: 6 }, { x: 7, y: 4 }] },
          placement: { x: 0, y: 4 },
        },
      },
      objective: {
        text: 'Get the survey crew safely up the passage before the barrow wakes (10 rounds)',
        win: [{ kind: 'ally_at_tiles', allyKey: 'crew', tiles: [{ x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }] }],
        // ⚠ DEADLINE ADDED 2026-08-23. Escort is hpScale-inert by nature and
        // this cell proved it exactly: 2.60 and 3.00 measured IDENTICALLY
        // (55% solving, 32-33% walled) and the median even drifted UP. You win
        // by ARRIVING, so a tankier hunter simply lives longer while the crew
        // walks past it — enemy HP buys nothing, which is why hard and
        // nightmare sat TOO EASY at every rung up to 3.00 while the wall share
        // climbed past its cap.
        // A clock is the lever the win condition respects (the manual's rule:
        // "if the win condition does not require killing, scale is weak; find
        // the lever the win condition actually respects"). It also pushes the
        // right end of the distribution: a strong party's answer here is slow,
        // careful shepherding, which the deadline taxes, while a party that
        // loses the crew outright is unaffected — it already lost. That is
        // precisely the TOO EASY + WALLS shape this cell had.
        // Clock walk (scale 1.90, hard): 12 -> median 96 · 9 -> median 96 · so
        // the crew was arriving around round 6 and neither clock touched it.
        // 7 is the first value that can bind. Note the VIP's own HP is NOT
        // available as a difficulty lever here — it was already walked UP
        // 62 -> 85 -> 105 to stop the crew dying in a third of builds, and
        // pulling it back down would simply re-break the wall share. Watch the
        // WALL share when
        // tightening further: a clock that is too tight stops ranking builds
        // and starts excluding them, which is the failure mode e6 already hit
        // at clock 10 before it went to 13.
        loss: [{ kind: 'ally_dead', allyKey: 'crew' }, { kind: 'round_reached', round: 10 }],
      },
      // barrow_hound is the dedicated hunter key (own aiHints, not shared with
      // the ghoul chaff key); starts at (6,2), well outside round-1 reach of
      // the crew's (0,4) start.
      enemies: ['skeleton_berserker', 'barrow_hound', 'barrow_hound', 'skeleton_archer'],
      // ⚠ PACK PUSHED BACK ONE TILE, 2026-08-23 (spreadSweep). At the old
      // distance the cell split the field rather than ranking it:
      //   easy   melee 48% · ranged 90% · balanced 97%   (48-pt spread)
      //   medium melee 73% · ranged 48% · balanced 95%   (47-pt spread)
      // — and note the two rows disagree about WHICH archetype suffers, which
      // is the signature of a fight decided by who reaches whom first rather
      // than by the matchup. At gap 6.5 it reads melee 82 / ranged 100 /
      // balanced 97 on easy (18-pt spread) and 75/100/88 on medium (25).
      // Changing placement invalidates the scale row — re-walked below.
      // spreadSweep +2 (2026-09-01): hounds closer so melee can intercept —
      // melee 32 -> 77, spread 62 -> 22.
      enemyPlacement: [{ x: 4, y: 4 }, { x: 5, y: 3 }, { x: 5, y: 5 }, { x: 5, y: 2 }],
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
      // e8 row 2026-08-23, after the route fix made this cell tunable at all:
      //   easy 1.30 solve 74% walls 10% (median 96 — the +1 quantization miss)
      //   medium 1.38 — CLOSED after four rungs. walls 6% / median 88 here;
      //     1.41 puts the median exactly ON the ceiling but walls 17%, 1.44
      //     walls 21%, 1.50 walls 28%. The wall share triples between 1.38 and
      //     1.44, so there is no value that clears the ceiling with the cap
      //     intact. Parked on the safe side: 6% walled is the best in the
      //     campaign, and the ceiling miss costs a good team some tension.
      //   hard 1.60 solve 66% median 60 walls 10% ✓
      //   nightmare 1.60 solve 48% median 36 walls 10% ✓
      // Note how far the top of the row FELL: hard was 2.30 and nightmare 3.00,
      // values that existed only because scale was being pushed against a cell
      // that could not respond to it. Once the crew stopped outrunning its own
      // encounter, 1.60 does what 3.00 could not.
      hpScaleOverride: { easy: 1.22, medium: 1.38, hard: 1.60, nightmare: 1.60 },
    },

    // e9 — The Tide Inward (siege). Waves are the pull of the door — more of
    // the dead arriving from deeper in, not anyone's summons. Triggered on
    // round, not room-clear (no rooms here).
    e9: {
      level: 8,
      terrain: { theme: 'crypt' },
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
      // e9 row 2026-08-23, ALL FOUR TIERS CERTIFY (100 builds/rung):
      //   easy 0.78 solve 79% walls 0% · medium 0.85 solve 58% walls 0%
      //   hard 0.92 solve 50% walls 2% · nightmare 0.90 solve 25% walls 10%
      //
      // ⚠ Every earlier walk of this cell is void. The three zombies run the
      // FIGHTER chassis and were silently inheriting the player Fighter's
      // thorns (3 -> 5 on 2026-08-23), so a melee swing cost 5 HP three times
      // over: spreadSweep read melee at 0-17% at EVERY start distance, and the
      // cell looked like an unfixable archetype filter. With `thornsDamage: 3`
      // authored on the zombie it is an ordinary, well-behaved fight.
      //
      // Cliffy above 0.95 — identical bodies, shared breakpoint: hard goes 82%
      // solving at 0.85 to 12% at 1.00. Stay inside 0.78-0.92 and re-walk in
      // small steps if anything moves.
      hpScaleOverride: { easy: 0.78, medium: 0.85, hard: 0.91, nightmare: 0.91 },
    },

    // e10 — The Bone Choir (boss). units_dead names the three choristers —
    // the necromancer/conductor is present but never has to die. Choristers
    // are three distinct enemy keys so per-instance HP can vary later.
    e10: {
      level: 9,
      terrain: { theme: 'crypt' },
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
      // D2: melee 3% at 1.50 — two firestorms, a freeze and the song on a
      // party that must walk in. The song is the tier now; the scale comes down.
      hpScaleOverride: { easy: 1.05, medium: 1.15, hard: 1.35, nightmare: 1.50 },
    },

    // e11 — Three Wards, One Breath (hold). simultaneous:true means scope is
    // dead in that branch — exactly 3 ward tiles for 3 wards. Enemies
    // standing on a ward block it; that pressure is intended.
    e11: {
      level: 10,
      terrain: { theme: 'crypt' },
      objective: {
        text: 'Hold all three wards at once',
        win: [{
          kind: 'units_at_tiles', scope: 'any', simultaneous: true,
          tiles: [{ x: 2, y: 1 }, { x: 5, y: 4 }, { x: 2, y: 6 }],
        }],
      },
      enemies: ['witch', 'witch', 'skeleton_archer', 'skeleton_archer'],
      // spreadSweep +1 (2026-09-01): ranged 33 -> 73, spread 62 -> 23.
      enemyPlacement: [{ x: 2, y: 2 }, { x: 2, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 4 }],
      playerPlacement: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      // Walk (hold sits ON the marks, so guards die slowly and scale bites
      // cleanly): easy 1.20 -> 89 · medium 1.45 -> 68 · hard 1.70 -> 54 (12%
      // walled) · nm 1.90 -> 29 but 20% walled, so nightmare parks at 1.85 —
      // one point of mean is not worth breaching the wall cap.
      hpScaleOverride: { easy: 1.30, medium: 1.40, hard: 1.70, nightmare: 1.85 },
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
          exitDoors: [{ x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
          doorMode: 'on_clear',
        },
        {
          // Room 2: the inner gallery.
          terrain: { theme: 'crypt', blocked: [{ x: 4, y: 2 }, { x: 4, y: 5 }] },
          enemies: ['zombie', 'ghoul'],
          enemyPlacement: [{ x: 6, y: 3 }, { x: 5, y: 4 }],
          entryTiles: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 4 }],
          exitDoors: [{ x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
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
      hpScaleOverride: { easy: 0.78, medium: 0.88, hard: 1.00, nightmare: 1.05 },
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
      preText: 'The ghouls scatter toward the fire lanes, using the flame to herd {mainName} instead of fearing it themselves. Something heavier comes on behind them, too slow to care about the fire at all. A hooded cultist stands at the hall\'s center, watching with open curiosity rather than alarm.',
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
