/**
 * acExperiment.ts — AC-reduction rebalance sims (owner directive 2026-08-01:
 * "most attacks should be hitting"; cut every unit's AC by ~4–5 and rebalance).
 *
 * Applies AC deltas IN MEMORY to DEFAULT_UNITS/UNIT_DEFS before running the
 * class matrix + comp battery. Ships NO value changes — this is the tool for
 * the iterative rebalance passes. The AI brain needs no changes for AC shifts:
 * it imports the engine's missChanceOf and reads AC off unit instances.
 *
 * Hit math (engine): miss = (AC−6)·5% → hit = (26−AC)·5%.
 *   Current ACs 13–17 → hit 45–65%. Flat −4 → 65–85%. Flat −5 → 70–90%.
 *
 * Run: npx tsx src/ai/acExperiment.ts [--delta -4] [--games 60] [--stage a|b|all]
 *      npx tsx src/ai/acExperiment.ts --baseline          (delta 0)
 *      npx tsx src/ai/acExperiment.ts --sweep             (0, -3, -4, -5)
 */
import { writeFileSync } from 'node:fs';
import { runSim } from './simHarness.js';
import { DEFAULT_UNITS, DEFAULT_ABILITIES } from './defaultData.js';
import { OPPORTUNIST_BONUS_BY_CLASS, VENGEFUL_BONUS_BY_CLASS } from '../game/abilityExecutor.js';
import { loadoutsFor, runDuelMatrix, runReferenceMatrix } from './loadoutMatrix.js';
import { FABLE_TEAMS, fableCustomizations } from '../config/fableTeams.js';

const args = process.argv.slice(2);
const flag = (name: string): string | null => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};
const GAMES = Number(flag('games') ?? 60);
const STAGE = flag('stage') ?? 'all';
const SWEEP = args.includes('--sweep');
const DELTAS = SWEEP ? [0, -3, -4, -5] : [args.includes('--baseline') ? 0 : Number(flag('delta') ?? -4)];

const ALL_CLASSES = Object.keys(DEFAULT_UNITS);
const pct = (x: number) => (x * 100).toFixed(0).padStart(3) + '%';
const hit = (ac: number) => Math.min(1, Math.max(0, 1 - (ac - 6) * 0.05));

// Snapshot pristine stats once so sweep iterations don't compound.
const BASE_AC: Record<string, number> = Object.fromEntries(
  ALL_CLASSES.map((c) => [c, DEFAULT_UNITS[c].armorClass]),
);
const BASE_HP: Record<string, number> = Object.fromEntries(
  ALL_CLASSES.map((c) => [c, DEFAULT_UNITS[c].maxHealth]),
);

/**
 * Named proposal presets for the iterative rebalance passes (owner directive:
 * AC down ~4–5 across the board; HP buffs — "not too much, but somewhat" — are
 * the sanctioned compensation lever, weighted toward the classes whose
 * durability identity the flat AC cut compresses hardest, i.e. the tanks).
 * Run: npx tsx src/ai/acExperiment.ts --preset <name>
 * Edit freely between passes — this table IS the working document.
 */
interface Preset {
  ac: Record<string, number>;
  hp: Record<string, number>;
  /** Ability-slug → delta applied to EVERY 'damage' effect of that ability
   * (twin has two — a +1 here is +1 per dagger). */
  dmg?: Record<string, number>;
  /** Ability-slug → delta applied to the ability's range. */
  range?: Record<string, number>;
  /** Class-slug → per-class Opportunist bonus (overrides the base +4 for that
   * class only). Mirrors the per-class Undying tax; patches the engine's
   * OPPORTUNIST_BONUS_BY_CLASS map for the run. */
  oppBonus?: Record<string, number>;
  /** Class-slug → per-class Vengeful bonus (overrides the base +3). Patches the
   * engine's VENGEFUL_BONUS_BY_CLASS map for the run. */
  vengBonus?: Record<string, number>;
  /** Ability-slug → delta applied to every 'heal' effect value. */
  heal?: Record<string, number>;
  /** Ability-slug → delta applied to every apply_status durationTurns. */
  statusDur?: Record<string, number>;
  /** Ability-slug → delta applied to every push/pull effect distance. */
  pullDist?: Record<string, number>;
  /** class → passive-slug → maxHealth delta (the Undying tax: a passive can
   * carry a stat cost alongside its flag; PassiveOption already supports it,
   * so this is data-only, no engine change). */
  passiveHp?: Record<string, Record<string, number>>;
  /** Ability-slug → {dmg, heal} deltas for LIFESTEAL effects (drain), which
   * the plain dmg/heal knobs don't reach (different effect type). */
  lifesteal?: Record<string, { dmg?: number; heal?: number }>;
  /** Ability-slug → delta on an execute healthThreshold (Kill Shot). */
  threshold?: Record<string, number>;
  /** Ability-slug → delta on the ability's SELF status duration (Blizzard's
   * channel root — distinct from statusDur, which hits the target). */
  selfStatusDur?: Record<string, number>;
  /** Ability-slug → override areaShape ('chebyshev'|'orthogonal'|'ring'). */
  areaShape?: Record<string, 'chebyshev' | 'orthogonal' | 'ring'>;
  /** Ability-slug → delta on areaRadius. */
  areaRadius?: Record<string, number>;
  /** Ability-slug → override the ability's excludeAllies flag (Blizzard: an
   * ally-hitting AoE with no damage is strictly worse than cold_snap). */
  excludeAllies?: Record<string, boolean>;
  /** Ability-slug → wholesale effects replacement, for REDESIGNS the value
   * knobs can't express (e.g. Ward trading its heal for grant_max_health).
   * Values here are absolute, not deltas. */
  replaceEffects?: Record<string, unknown[]>;
}

const PRESETS: Record<string, Preset> = {

  // ═══ POST-SHIP PRESETS ═══════════════════════════════════════════════════
  // ⚠ gameData now HOLDS pass21, so every delta below is measured from the
  // SHIPPED values, not from the old pre-rework baseline. The pass1..pass21
  // presets above are HISTORICAL ONLY — running them double-applies.
  //
  // s1_gs10 — Ground Slam damage 15 -> 10.
  // The problem is READABILITY, not balance. On the units page Ground Slam
  // (15 unblockable + rooted 2) strictly dominates Whirlwind (20 blockable) on
  // the card: expected damage at the shipped AC band is 18/17/16/15/14 for
  // Whirlwind against AC 8/9/10/11/12, so against FOUR of the eight classes
  // Whirlwind is equal or worse AND can be dodged. The sim disagrees (pass21:
  // whirlwind best cell #2 and highest all-cell mean 44.9 vs 43.7) because 20
  // crosses kill thresholds 15 cannot — but a player cannot read that off a
  // stat card. At 10, the trade is legible: you pay real damage for a
  // guaranteed hit plus lockdown.
  // Control: the SHIPPED values, unchanged. Needed because the no-preset path
  // only runs stages A/B — stage E (the pair grid) lives in the preset branch,
  // so "no preset" cannot produce a comparable control.
  shipped: { ac: {}, hp: {} },
  // ═══ RING PROBES (owner 2026-08-22) ═════════════════════════════════════
  // Whirlwind and Ground Slam are now RINGS in gameData (shape shipped,
  // damage unchanged at 20/13). These rungs probe the damage ladder before
  // the full grid. Owner constraint: Whirlwind must READ clearly stronger
  // than Ground Slam on the card (blockable vs unblockable+root) — if WW has
  // to go below 18, GS's damage comes down with it. 'shipped' is the ring
  // baseline (20/13).
  ring_ww18_gs13: { ac: {}, hp: {}, dmg: { whirlwind: -2 } },
  ring_ww17_gs12: { ac: {}, hp: {}, dmg: { whirlwind: -3, shockwave: -1 } },
  ring_ww16_gs11: { ac: {}, hp: {}, dmg: { whirlwind: -4, shockwave: -2 } },
  // Round 2 (after the first ladder): damage is NOT Ground Slam's power source
  // as a ring — root-2 on 8 tiles is. These probe the root-duration lever with
  // WW held at the owner's preferred readable rung (18).
  ring_ww18_gs13r1: { ac: {}, hp: {}, dmg: { whirlwind: -2 }, statusDur: { shockwave: -1 } },
  ring_ww18_gs11r1: { ac: {}, hp: {}, dmg: { whirlwind: -2, shockwave: -2 }, statusDur: { shockwave: -1 } },
  // c6 — the post-Fable-grid chassis rebalance. NOT SHIPPED: gameData carries
  // the pre-C6 values and balance experiments must never edit it (see the
  // preflight chassis guard). Run the grid with `--preset c6` to reproduce.
  // Probe-measured chassis spread 13.7 -> 4.7; derivation in AC_REWORK.md.
  //   cleric AC 11->9, warlock AC 10->9, barbarian AC 9->10, rogue HP 43->45
  c6: { ac: { cleric: -2, warlock: -1, barbarian: 1 }, hp: { rogue: 2 } },
  // ship candidate: C6 with rogue at 44 (not 45). The clean-slope probe showed
  // 44 keeps the field tight while trimming rogue's ceiling; ranger deliberately
  // NOT buffed (pinning root +1t read as oppressive). This is what the next full
  // grid measures. gameData stays baseline — this is a delta.
  c6_rogue44: { ac: { cleric: -2, warlock: -1, barbarian: 1 }, hp: { rogue: 1 } },
  // NOTE: c6 / c6_rogue44 above are now SHIPPED into gameData (v1.0.80). They
  // are deltas, so re-running them stacks ON TOP of the shipped chassis — do NOT
  // use them as a baseline anymore. An empty run (no --preset) is the shipped
  // baseline. The two presets below are Wizard-loadout tests (owner 2026-08-12):
  // break Blizzard's grip on the Wizard so Freeze/Cold Snap become real choices.
  //   A: Blizzard range 4->3 (shrink the reach that makes it strictly best).
  blz_r3:        { ac: {}, hp: {}, range: { blizzard: -1 } },
  //   B: Blizzard range 4->3 AND Freeze range 3->4 (also make Freeze reach out).
  blz_r3_frz_r4: { ac: {}, hp: {}, range: { blizzard: -1, freeze: 1 } },
  // No-op preset = the shipped baseline. Needed because stage E only runs inside
  // the `--preset` branch of the dispatcher; a bare (no --preset) run falls into
  // the AC-delta sweep and produces NO pair-comp CSV. Use `--preset baseline`.
  baseline: { ac: {}, hp: {} },
  // Ranger-only Opportunist +6 (owner 2026-08-12): a synergy buff that only pays
  // off next to status-appliers (the non-Fighter partners Ranger lacks) and stays
  // near-invisible in the Fighter pair. Class-specific, like the per-class Undying.
  rgr_opp6: { ac: {}, hp: {}, oppBonus: { ranger: 6 } },
  // Full-grid ship candidate (owner 2026-08-12): all three balance changes at
  // once, on top of the shipped C6+Rogue44 chassis. Ranger Opportunist +6,
  // Blizzard range 4->3, Freeze range 3->4. Run against the NEW 12-team panel.
  rgr6_blz3_frz4: { ac: {}, hp: {}, range: { blizzard: -1, freeze: 1 }, oppBonus: { ranger: 6 } },
  // Candidate v2 (owner 2026-08-12): opp6 dialed to +5, plus a Barbarian rescue
  // package and a small Fighter trim. On top of shipped C6+Rogue44.
  //   Ranger Opportunist +5 · Blizzard range 4->3 · Freeze range 3->4
  //   Barbarian: Vengeful +3->+4, Ground Slam (shockwave) dmg 12->13, HP 54->55
  //   Fighter: Concussive Blow 7->6, Shield Bash 17->16
  cand2: {
    ac: {}, hp: { barbarian: 1 },
    range: { blizzard: -1, freeze: 1 },
    dmg: { shockwave: 1, concussive: -1, shield_bash: -1 },
    oppBonus: { ranger: 5 },
    vengBonus: { barbarian: 4 },
  },
  // Candidate v3 (owner 2026-08-12): cand2 + two changes. Cleric's Warded passive
  // now costs 2 max HP (it dominated the top table — top 14 cells all ran Warded),
  // a passive-carried tax like Undying. Warlock +2 base HP (most of its best teams
  // were Cleric/Warded, so it takes collateral from that nerf).
  cand3: {
    ac: {}, hp: { barbarian: 1, warlock: 2 },
    range: { blizzard: -1, freeze: 1 },
    dmg: { shockwave: 1, concussive: -1, shield_bash: -1 },
    oppBonus: { ranger: 5 },
    vengBonus: { barbarian: 4 },
    passiveHp: { cleric: { warded: -2 } },
  },
  // Candidate v5 (owner 2026-08-13): cand3 numerics + Rogue +1 HP (low top-build
  // representation). Runs on the new-passive gameData (merged Stalwart now +3 HP,
  // Channeler +1, Siphon Heal 1 — all baked into gameData/engine, not this preset).
  cand5: {
    ac: {}, hp: { barbarian: 1, warlock: 2, rogue: 1 },
    range: { blizzard: -1, freeze: 1 },
    dmg: { shockwave: 1, concussive: -1, shield_bash: -1 },
    oppBonus: { ranger: 5 },
    vengBonus: { barbarian: 4 },
    passiveHp: { cleric: { warded: -2 } },
  },
  // Candidate v7 (owner 2026-08-13): cand5 numerics + Warlock chassis +1 (now +3
  // total). Stalwart tiers retuned in gameData: Barbarian 0, Fighter/Warlock +1,
  // Cleric/Ranger/Sorcerer +3, Wizard +4. Channeler +2. Goal: Stalwart "okay".
  cand7: {
    ac: {}, hp: { barbarian: 1, warlock: 3, rogue: 1 },
    range: { blizzard: -1, freeze: 1 },
    dmg: { shockwave: 1, concussive: -1, shield_bash: -1 },
    oppBonus: { ranger: 5 },
    vengBonus: { barbarian: 4 },
    passiveHp: { cleric: { warded: -2 } },
  },
  s1_gs10: { ac: {}, hp: {}, dmg: { shockwave: -5 } },
  // s2_gs12 — 10 overshot: Ground Slam's all-cell mean fell in ALL THREE
  // screened pairs (40.5->38.0, 38.5->31.2, 49.9->44.6) and its best rank went
  // #2->#11 (cleric) and #5->#14 (rogue), leaving it 10-14 points behind the
  // leader — back toward the dead zone it was in at #109 before the 2-turn
  // root. 12 still reads correctly on the card (12 guaranteed vs Whirlwind's
  // 14-18 expected against every one of the eight classes) while giving back
  // half of what 10 surrendered.
  s2_gs12: { ac: {}, hp: {}, dmg: { shockwave: -3 } },

  // Pass 1 draft, informed by the flat sweep (scratchpad ac_sweep.log,
  // 2026-08-01): the sweep's dominant distortion is RANGED vs MELEE, not
  // tank vs squishy — closing distance now costs real HP (approach turns eat
  // reliable hits), while ranged classes never pay that toll (ranger 74%,
  // snipe comp 83% at flat −5; fighter 23%, warlock 25%). So HP compensation
  // skews toward the classes that must walk into the fight; the ranged
  // winners get NOTHING. Warlock's collapse is value-loss (unblockable is
  // worth little when everything hits) — HP softens it here; pass 2 likely
  // owes it a damage/effect look.
  pass1: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 13, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
  },
  // Pass 2 (owner calls, 2026-08-01): −5 locked; fighter trimmed 2 HP from
  // pass 1 (58→56); eldritch +1 (9→10 — boosted but still bottom-tier, only
  // bolt below it; unblockable + guaranteed-finisher value priced in); twin
  // +1 per dagger (9+8→10+9); arrow −1 (11→10). Freeze untouched (2-turn
  // duration stays; 1-turn would gut it per owner).
  pass2: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 1, twin: 1, arrow: -1 },
  },
  // Comparison variant: eldritch +2 (9→11, ties sword/mace) — for the owner to
  // see whether +1 is enough for warlock or +2 overshoots "low end".
  pass2b: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, twin: 1, arrow: -1 },
  },
  // Pass 3 (owner calls, 2026-08-01): pass2b base (eldritch 11) + freeze range
  // 4→3 (wizard steps into danger to deny a turn; duration sacredly 2) + ignite
  // upfront 6→4 (tick untouched — it's the GLOBAL burning constant and Firestorm
  // (26%▼) would eat the splash) + grasp root 1→2 turns (the big knob: 30%▼
  // needed real help; pull-3-into-my-team-and-hold-2 is an identity Fear lacks)
  // + First Aid 14→16.
  pass3: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, twin: 1, arrow: -1, ignite: -2 },
    range: { freeze: -1 },
    heal: { second_wind: 2 },
    statusDur: { grasp: 1 },
  },
  // Pass 4 (owner-approved bundle, 2026-08-01): grasp back to root 1 but
  // damage 4→9 (root-2 + pull feeding Whirlwind made grasp-spin 77% — the
  // smaller knob it is); cold_snap 10→7 (was a free basic attack with a
  // 1-turn freeze stapled on — the wizard outlier's real carry). Everything
  // else held from pass 3.
  pass4: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, twin: 1, arrow: -1, ignite: -2, grasp: 5, cold_snap: -3 },
    range: { freeze: -1 },
    heal: { second_wind: 2 },
    statusDur: {},
  },
  // Pass 5 (owner calls, 2026-08-01): grasp PULL 3→2 (interpreting "grasp
  // range to 2" as the pull-distance knob proposed — synergy stays playable,
  // the one-cast delivery into double-Whirlwind shortens); fighter & barbarian
  // −2 HP each (54/52 — "high but not too high"); Firestorm 14→15 (small
  // knob first). Owner accepts strong-but-not-98% grasp/whirlwind as a skill
  // comp.
  pass5: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 9, barbarian: 7, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, twin: 1, arrow: -1, ignite: -2, grasp: 5, cold_snap: -3, ffh: 1 },
    range: { freeze: -1 },
    heal: { second_wind: 2 },
    statusDur: {},
    pullDist: { grasp: -1 },
  },
  // Pass 6 (owner-confirmed, 2026-08-01): revert the pass-5 fighter/barb HP
  // trim (back to 56/54 — pass-4's band was the healthiest state and the trim
  // sank the whole front line while inflating casters via weakened Stage-A
  // fills). Everything else held from pass 5 (grasp pull 2, ffh 15).
  pass6: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, twin: 1, arrow: -1, ignite: -2, grasp: 5, cold_snap: -3, ffh: 1 },
    range: { freeze: -1 },
    heal: { second_wind: 2 },
    statusDur: {},
    pullDist: { grasp: -1 },
  },

  // Pass 7 (owner-approved batch, 2026-08-02): floors — heal range 2 & 28HP,
  // ward rider 12, ffh range 5, shockwave 11, longshot 13, first aid 18;
  // ceilings — roar weaken 2→1 turns, ignite upfront 3, missile 10.
  pass7: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, twin: 1, arrow: -1, ignite: -3, grasp: 5, cold_snap: -3, ffh: 1, shockwave: 3, longshot: 1, missile: -1 },
    range: { freeze: -1, heal: 1, ffh: 1 },
    heal: { second_wind: 4, heal: 4, ward: 4 },
    statusDur: { roar: -1 },
    pullDist: { grasp: -1 },
  },
  // Pass 8 (owner-approved, 2026-08-02): arrow back to 11 (field now prices
  // the 2-ranger fear); grasp CAST range 5→4 (last knob on the 79% comp);
  // concussive 8→6 (hottest special context+breadth); ward rider 12→14;
  // ffh damage reverted to 14 (range 5 was the real fix — keep it).
  // If green, THESE ARE THE CANDIDATE SHIP VALUES.
  pass8: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, twin: 1, ignite: -3, grasp: 5, cold_snap: -3, shockwave: 3, longshot: 1, missile: -1, concussive: -2 },
    range: { freeze: -1, heal: 1, ffh: 1, grasp: -1 },
    heal: { second_wind: 4, heal: 4, ward: 6 },
    statusDur: { roar: -1 },
    pullDist: { grasp: -1 },
  },
  // Pass 9 (owner-approved, 2026-08-02). THE UNDYING PASS.
  //  - Undying now carries a per-class maxHealth tax (owner: -5 not -10;
  //    "-10 obviously makes it unplayable"). Sized per class by how much the
  //    passive is actually worth there (grid gap vs that class's next-best
  //    passive): sorcerer +15.9 > fighter +11.4 > cleric +8.7 — but sorcerer
  //    has the least HP to give, so proportionally: fighter -5 (-8.9% HP),
  //    sorcerer -4 (-11.8%), cleric -3 (-6%).
  //  - NO Fighter chassis nerf yet (owner: don't over-react; undying first).
  //  - NO ranger nerf — the grid puts ranger 3rd by chassis; the arrow-range
  //    idea is dead (owner: range is core class identity).
  //  - Small buffs to the two weakest picks in the owner's filtered view:
  //    ward range 2->3 (delivery, the lever that fixed Firestorm and Heal),
  //    drain heal 6->9 (its sustain identity; damage untouched).
  pass9: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, twin: 1, ignite: -3, grasp: 5, cold_snap: -3, shockwave: 3, longshot: 1, missile: -1, concussive: -2 },
    range: { freeze: -1, heal: 1, ffh: 1, grasp: -1, ward: 1 },
    heal: { second_wind: 4, heal: 4, ward: 6 },
    statusDur: { roar: -1 },
    pullDist: { grasp: -1 },
    passiveHp: {
      fighter:  { undying: -5 },
      sorcerer: { undying: -4 },
      cleric:   { undying: -3 },
    },
    lifesteal: { drain: { heal: 3 } },
  },
  // Pass 10 (owner's per-class high-end analysis, 2026-08-02). Owner reads the
  // TOP of each class's 7 pair-comps, not aggregates — verified against the
  // grid, and nearly every call confirmed by first-appearance rank.
  //  BARBARIAN: owner overruled my roar buff (roar is already its #1 special;
  //    buffing it would worsen intra-class spread). Shockwave +5 (8->13)
  //    instead. No chassis change — barbarian's ceiling is fine (global #13).
  //  CLERIC: purify heal -2 (22->20); undying tax -3 -> -4; WARD REDESIGNED
  //    (see replaceEffects) from reactive heal to proactive +6 max health,
  //    keeping the shield — owner's design read: ward's heal was always
  //    mistimed (waste it pre-combat, or lose tempo mid-combat).
  //  RANGER: pinning 11->7 (substantial, per owner; keeps the 2-turn root,
  //    which is the identity). Longshot 13->14.
  //  ROGUE: assassinate threshold 18->21 (small; owner wary of overshoot).
  //  SORCERER: bolt 9->11. Chose DAMAGE over HP deliberately: an HP buff
  //    would amplify undying (the thing we are taxing), damage dilutes its
  //    relative value. Holding the tax at -4 (see notes).
  //  WARLOCK: drain heal +3 -> +1 (6->7; my +3 overshot, drain went last to
  //    first). Grasp cast range REVERTED to 5 — the 5 grasp nerfs chased a
  //    comp whose strength turned out to be the passive-blindness artifact.
  //  WIZARD: cold_snap 7->8; blizzard self-root 2->1 AND range 2->3 (owner:
  //    "drastic buff" — it is the last special with no viable home).
  pass10: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: {
      eldritch: 2, twin: 1, ignite: -3, grasp: 5, cold_snap: -2, shockwave: 5,
      longshot: 2, missile: -1, concussive: -2, pinning: -4, bolt: 2,
    },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 1 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { roar: -1 },
    pullDist: { grasp: -1 },
    passiveHp: { fighter: { undying: -5 }, sorcerer: { undying: -4 }, cleric: { undying: -4 } },
    lifesteal: { drain: { heal: 1 } },
    threshold: { assassinate: 3 },
    selfStatusDur: { blizzard: -1 },
    replaceEffects: {
      ward: [
        { type: 'grant_max_health', value: 6 },
        { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 },
      ],
    },
  },
  // Pass 11 (owner calls + data-derived Fear fix, 2026-08-03).
  //  WARD 6 -> 10 max health. Owner's pricing: ward ~= grant + ~10 shield
  //  absorption, and must stay NOTICEABLY under Heal (28) or its proactive
  //  reliability obliterates Heal. 10 + ~10 = ~20 guaranteed — equal to
  //  Purify's heal, clearly under Heal's 28 nominal, and +67% on the grant
  //  that failed at rank 111. (14 would land ~24, which the owner correctly
  //  judged too close to Heal.)
  //  BOLT +2 -> +1 (sorcerer overshot to 67%).
  //  BARBARIAN +2 HP (owner: not overwhelmingly weak, so +2 not +3).
  //  LONGSHOT +2 -> +3 (12 -> 15).
  //  ASSASSINATE held at +3 threshold per owner.
  //  FEAR root 1 -> 2 turns. Data-driven: Fear is NOT being punished by its
  //  counters (vs anchor-bearing refs it scores 37.6% vs 34.0% without —
  //  no penalty; and NO reference carries stalwart, so its root is never
  //  countered in current data). Its real problem is that it is nearly
  //  DOMINATED BY GRASP: grasp = 9 dmg + pull 2 + root 1, fear = push 3 +
  //  root 1 and no damage. Doubling the root gives fear a distinct control
  //  identity instead of being a worse grasp.
  pass11: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 11, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: {
      eldritch: 2, twin: 1, ignite: -3, grasp: 5, cold_snap: -2, shockwave: 5,
      longshot: 3, missile: -1, concussive: -2, pinning: -4, bolt: 1,
    },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 1 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { roar: -1, fear: 1 },
    pullDist: { grasp: -1 },
    passiveHp: { fighter: { undying: -5 }, sorcerer: { undying: -4 }, cleric: { undying: -4 } },
    lifesteal: { drain: { heal: 1 } },
    threshold: { assassinate: 3 },
    selfStatusDur: { blizzard: -1 },
    replaceEffects: {
      ward: [
        { type: 'grant_max_health', value: 10 },
        { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 },
      ],
    },
  },
  // Pass 12 (owner calls, 2026-08-03) — FIRST RUN ON THE 7-REFERENCE PANEL.
  //  SORCERER (62% -> target top-half): owner's read is that all three
  //   specials are well represented, so it is a chassis/passive problem, not
  //   an ffh problem — my proposed ffh trim was DROPPED. Class -2 HP (34->32)
  //   plus undying tax -4 -> -5 (undying sorcerer 27 HP). Two modest cuts
  //   rather than one large one, because they hit different builds: the -2
  //   touches every sorcerer, the extra -1 only the dominant undying build.
  //  CLERIC undying tax -4 -> -6 (owner: still an overwhelming favorite).
  //  WARD grant 10 -> 13 (owner-approved; near-parity with Heal accepted
  //   because Heal is capped by missing HP and Ward never is).
  //  WHIRLWIND 18 -> 20 damage. Owner floated making it unblockable with a
  //   damage cut; I kept it BLOCKABLE deliberately — removing the variance
  //   would disproportionately buff the grasp+whirlwind comp we spent five
  //   passes taming, and the risk/reward is the point of the ability.
  //  SHOCKWAVE knockback 2 -> 3 (damage did not help its rank twice; its real
  //   problem is identity — it pushes enemies away from a melee class. Lean
  //   into peel: make it the barbarian's "get off me" button).
  //  WARLOCK/FEAR HELD per owner — 2 of fear's 3 top-10 cells ride the
  //   overtuned sorcerer, so the sorcerer nerf may resolve it indirectly.
  pass12: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 11, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: -2 },
    dmg: {
      eldritch: 2, twin: 1, ignite: -3, grasp: 5, cold_snap: -2, shockwave: 5,
      longshot: 3, missile: -1, concussive: -2, pinning: -4, bolt: 1, whirlwind: 2,
    },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 1 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { roar: -1, fear: 1 },
    pullDist: { grasp: -1, shockwave: 1 },
    passiveHp: { fighter: { undying: -5 }, sorcerer: { undying: -5 }, cleric: { undying: -6 } },
    lifesteal: { drain: { heal: 1 } },
    threshold: { assassinate: 3 },
    selfStatusDur: { blizzard: -1 },
    replaceEffects: {
      ward: [
        { type: 'grant_max_health', value: 13 },
        { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 },
      ],
    },
  },
  // Pass 13 (owner's reads, all confirmed against the MEAN-sorted grid).
  //  ROGUE twin 10+9 -> 9+8 (back to base). 10 of the top 11 cells contain
  //   rogue. NOTE its chassis mean is only 3rd (41.2 vs fighter 45.7 /
  //   barbarian 45.3) — the problem is its CEILING, which is what the damage
  //   cut targets.
  //  CLERIC +2 HP (chassis mean 34.6 = LAST, confirms undertuned).
  //  FIGHTER shield_bash 14 -> 17 damage (#65 excluding rogue combos; the
  //   weakest of fighter's three by a wide margin). Fighter's chassis is #1
  //   at 45.7 — HELD per owner, but flagged.
  //  SORCERER ignite upfront 3 -> 4 (#55). Chassis held per owner; note that
  //   excluding rogue combos, sorcerer/ffh is the #1 build in the game, so
  //   the class's ceiling is fine — only ignite is weak.
  //  WARLOCK drain heal 7 -> 8 (#49). Deliberately +1 not more: at heal 9 it
  //   was warlock's #1 special, at 7 it is #49 — this knob is very sensitive.
  //  FIGHTER HP 56 -> 52 (EHP 80 -> 74; was the highest in the game by 10).
  //   Its ceiling is INTRINSIC — only 8 of its top-20 cells involve rogue and
  //   its top-20 partners span 6 classes, so the rogue nerf would not have
  //   touched it. The cut also has to absorb the shield_bash buff above.
  //  BARBARIAN strike 14 -> 13 (highest basic in the game). Light on purpose:
  //   15 of its top-20 cells are rogue-partnered (ceiling 70.3 with rogue,
  //   64.7 without), so the rogue nerf does much of the work indirectly. Roar
  //   deliberately untouched — nerfing its best special would wreck the
  //   intra-class spread the owner wants preserved.
  //  WIZARD blizzard self-root 1 -> 0 (#114, the worst special in the game).
  //   Chose removing the channel cost over more range: the root is what makes
  //   a squishy wizard commit next to the group it just froze. Freeze
  //   duration untouchable (cold_snap is also 1 turn).
  pass13: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 11, rogue: 8, warlock: 8, cleric: 6, ranger: 0, wizard: 0, sorcerer: -2 },
    dmg: {
      eldritch: 2, twin: 0, ignite: -2, grasp: 5, cold_snap: -2, shockwave: 5,
      longshot: 3, missile: -1, concussive: -2, pinning: -4, bolt: 1, whirlwind: 2,
      shield_bash: 3, strike: -1,
    },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 1 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { roar: -1, fear: 1 },
    pullDist: { grasp: -1, shockwave: 1 },
    passiveHp: { fighter: { undying: -5 }, sorcerer: { undying: -5 }, cleric: { undying: -6 } },
    lifesteal: { drain: { heal: 2 } },
    threshold: { assassinate: 3 },
    selfStatusDur: { blizzard: -2 },
    replaceEffects: {
      ward: [
        { type: 'grant_max_health', value: 13 },
        { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 },
      ],
    },
  },
  // Pass 14 (owner calls + two data-driven answers, 2026-08-03).
  //  ROGUE twin 9+8 -> 8+8 (owner's suggestion). Kept conservative: one damage
  //   point on arrow once swung ranger 20 points via kill-breakpoints, so a
  //   bigger cut risks overshoot. Rogue held 6 of the top 6 cells.
  //  BARBARIAN AC 10 -> 9 (hit 80% -> 85%, EHP 70 -> 66) rather than HP. AC is
  //   MULTIPLICATIVE — it scales every incoming attack — and it also strips the
  //   lucky-miss high-rolls that inflate a ceiling, which HP does not. It also
  //   separates the two bruisers thematically: Fighter = armour (AC 12/70%),
  //   Barbarian = toughness (high HP, easy to hit). If 26-of-top-50
  //   concentration persists, AC 8 is the follow-up.
  //  CLERIC ward 13 -> 15 (still last at #88); undying tax -6 -> -7.
  //  FIGHTER undying tax -5 -> -7 (its best passive by far).
  //  SORCERER equal nudges to all three specials (owner: they are well
  //   balanced, it needs breadth — only 3 cells in the global top 50).
  //  BLIZZARD excludeAllies. THE SELF-ROOT WAS NEVER THE PROBLEM: pass 13
  //   confirms the channel cost is gone (durationTurns 0 => not applied) and
  //   blizzard STILL sits at #342 vs cold_snap #12 / freeze #41. Stripped of
  //   its self-cost it is simply "cold_snap with no damage, shorter range, and
  //   it freezes your own team". Enemies-only is the fix — the same flag roar
  //   already carries.
  pass14: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 11, rogue: 8, warlock: 8, cleric: 6, ranger: 0, wizard: 0, sorcerer: -2 },
    dmg: {
      eldritch: 2, ignite: -1, grasp: 5, cold_snap: -2, shockwave: 5,
      longshot: 3, missile: -1, concussive: -2, pinning: -4, bolt: 1, whirlwind: 2,
      shield_bash: 3, strike: -1, ffh: 1, flame_jet: 1,
    },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 1 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { roar: -1, fear: 1 },
    pullDist: { grasp: -1, shockwave: 1 },
    passiveHp: { fighter: { undying: -7 }, sorcerer: { undying: -5 }, cleric: { undying: -7 } },
    lifesteal: { drain: { heal: 2 } },
    threshold: { assassinate: 3 },
    selfStatusDur: { blizzard: -2 },
    // Firestorm enemies-only. Sorcerer's problem is not partner COUNT (it is a
    // consistent class, sd 3.6) — it is that its BEST pair, 62.3, is the worst
    // "best pair" in the game: no strong synergy anywhere. The blocker is
    // friendly fire: two of its three specials hit allies, and the brain
    // correctly refuses to fire them into its own frontline (see smokeTest
    // "Sorcerer avoids ally-killing Firestorm"), so its signature spell is
    // unusable at exactly the moment enemies cluster. Flame Jet KEEPS friendly
    // fire — it is a line, positional discipline is its identity, and one
    // risky tool preserves the class flavour.
    excludeAllies: { blizzard: true, ffh: true },
    replaceEffects: {
      // Owner: "drop 1 point on the first attack so it does the same on both."
      // The dmg knob is per-ABILITY, so -1 would give 8+7; set them exactly.
      twin: [
        { type: 'damage', formula: 'flat', value: 8 },
        { type: 'damage', formula: 'flat', value: 8 },
      ],
      ward: [
        { type: 'grant_max_health', value: 15 },
        { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 },
      ],
    },
  },

  // Pass 15 (owner-approved, 2026-08-03). Rebalancing after the friendly-fire
  // fix, which was the largest single change of the rework.
  //  SORCERER (69 ceiling, 25 top-50 — the new concentration leader; ALL 25 of
  //   its top cells run undying): nerf via SPECIALS, not chassis. ffh 15 -> 12
  //   (it lost its only drawback last pass and must pay for it) and flame_jet
  //   17 -> 16 (in 14 of the 25 top cells). HP 32 -> 34 deliberately goes the
  //   other way: sorcerer's EHP 38 is the lowest in the game by 7, which is
  //   WHY undying is mandatory — raising base HP makes stalwart/opportunist
  //   survivable enough to compete, buying build diversity while total power
  //   falls. A deeper undying tax would have done the opposite.
  //  FIGHTER (63 ceiling and 6 top-50, both LAST, despite the highest EHP —
  //   it survives but cannot close): sword 11 -> 12 lifts every build every
  //   turn; concussive 6 -> 8 reverts the pass-10 cut made when concussive was
  //   the hottest special in the game (91|87). It is #30 now and can afford it.
  //  SHOCKWAVE excludeAllies — the THIRD instance of the friendly-fire
  //   disease. Worst special at #78 and immune to two separate damage buffs,
  //   exactly like blizzard. Whirlwind deliberately KEEPS friendly fire (owner:
  //   its risk is the point), so the two barbarian AoEs separate cleanly:
  //   whirlwind = high damage, risky; shockwave = safe displacement.
  //  BLIZZARD range 3 -> 2: it currently has no downside whatsoever
  //   (enemies-only, no self-cost, unblockable, 3x3 freeze) and sits at #1.
  //   Range makes the wizard commit position for it.
  pass15: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 11, rogue: 8, warlock: 8, cleric: 6, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: {
      eldritch: 2, ignite: -1, grasp: 5, cold_snap: -2, shockwave: 5,
      longshot: 3, missile: -1, concussive: 0, pinning: -4, bolt: 1, whirlwind: 2,
      shield_bash: 3, strike: -1, ffh: -2, flame_jet: 0, sword: 1,
    },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { roar: -1, fear: 1 },
    pullDist: { grasp: -1, shockwave: 1 },
    passiveHp: { fighter: { undying: -7 }, sorcerer: { undying: -5 }, cleric: { undying: -7 } },
    lifesteal: { drain: { heal: 2 } },
    threshold: { assassinate: 3 },
    selfStatusDur: { blizzard: -2 },
    excludeAllies: { blizzard: true, ffh: true, shockwave: true },
    replaceEffects: {
      twin: [
        { type: 'damage', formula: 'flat', value: 8 },
        { type: 'damage', formula: 'flat', value: 8 },
      ],
      ward: [
        { type: 'grant_max_health', value: 15 },
        { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 },
      ],
    },
  },

  // Pass 16 — NEW BASELINE. THE UNIVERSAL FRIENDLY-FIRE RULE (owner, 2026-08-03).
  //
  // Design decision: EVERY AoE hits allies. No exceptions, no per-ability flags,
  // nothing for a player to memorise. The mixed rule we tested in passes 14-15
  // worked mechanically but was judged an intuitiveness trap ("we are playing
  // with fire here"), and zero friendly fire was judged tactically empty.
  //
  // What makes the big placed blasts usable again is a SHAPE, not an exception:
  // firestorm and blizzard become RING (3x3 minus the centre) — the eye of the
  // hurricane. You aim the calm centre at your OWN frontliner and everything
  // around them takes the hit. Friendly fire still bites (two adjacent allies
  // means you can only protect one), the preview shows the hole so it explains
  // itself, and the rule stays one sentence.
  //
  // Number estimates for the re-priced downside:
  //  ffh      12 -> 14  (regains friendly fire; the eye is worth less than
  //                      blanket immunity, so it gets damage back but not all
  //                      the way to the 15 it had while enemies-only)
  //  blizzard range 2 -> 3 (friendly fire IS its cost now, so give the reach
  //                      back that was taken when it had no downside at all)
  //  roar     radius 2 -> 1. Owner accepts roar may be "destroyed" and wants to
  //                      pick up the pieces after. Best estimate: weakening
  //                      your own team across a radius-2 (12-tile) area is
  //                      unplayable; radius 1 matches whirlwind's footprint,
  //                      which demonstrably survives friendly fire.
  //  shockwave           keeps 13 damage, friendly fire restored (4-tile
  //                      self-centred, same footprint as whirlwind).
  // Everything else carries over from pass 15 unchanged.
  pass16: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 11, rogue: 8, warlock: 8, cleric: 6, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: {
      eldritch: 2, ignite: -1, grasp: 5, cold_snap: -2, shockwave: 5,
      longshot: 3, missile: -1, concussive: 0, pinning: -4, bolt: 1, whirlwind: 2,
      shield_bash: 3, strike: -1, ffh: 0, flame_jet: 0, sword: 1,
    },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 1 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { roar: -1, fear: 1 },
    pullDist: { grasp: -1, shockwave: 1 },
    passiveHp: { fighter: { undying: -7 }, sorcerer: { undying: -5 }, cleric: { undying: -7 } },
    lifesteal: { drain: { heal: 2 } },
    threshold: { assassinate: 3 },
    selfStatusDur: { blizzard: -2 },
    // THE RULE: nothing is enemies-only any more.
    excludeAllies: { blizzard: false, ffh: false, shockwave: false, roar: false },
    areaShape: { ffh: 'ring', blizzard: 'ring' },
    areaRadius: { roar: -1 },
    replaceEffects: {
      twin: [
        { type: 'damage', formula: 'flat', value: 8 },
        { type: 'damage', formula: 'flat', value: 8 },
      ],
      ward: [
        { type: 'grant_max_health', value: 15 },
        { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 },
      ],
    },
  },

  // --- PASS 17: the two Barbarian redesigns + blizzard range 4. -------------
  // Settled going in: fighter buff reverted, shockwave push dropped.
  //
  // Roar is GONE, replaced by LEAPING SLAM. Roar died (#457/2268) because every
  // one of the Barbarian's three specials was range 0 — under universal
  // friendly fire a 24-tile blanket centred on a melee body cannot be aimed at
  // all, and a weaken that lands on your own team is pure loss with no damage
  // to weigh against it. The leap buys placement freedom the way firestorm's
  // range does, but through the Barbarian's OWN body, which is on-theme and
  // keeps the class melee. Landing in the ring's calm eye is what makes it
  // survivable.
  //
  // Shockwave becomes GROUND SLAM: same 4-tile orthogonal footprint, push
  // swapped for a 1-turn root. Rooting an ally you are already stood next to
  // costs almost nothing, so friendly fire is naturally cheap here — the same
  // "payload that doesn't punish a clip" property, arrived at from the other
  // direction. It also sets up whirlwind.
  //
  // Blizzard goes to range 4. Range 5 (p17_range) took it from #44/#21 to #1 in
  // BOTH screened pairs — decisive, but overshooting into best-in-class. 4 is
  // the test of whether the fix survives at a smaller dose.
  pass17: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 11, rogue: 8, warlock: 8, cleric: 6, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: {
      eldritch: 2, ignite: -1, grasp: 5, cold_snap: -2,
      longshot: 3, missile: -1, concussive: -2, pinning: -4, bolt: 1, whirlwind: 2,
      shield_bash: 3, strike: -1, ffh: 0, flame_jet: 0, sword: 0,
      // shockwave/roar omitted on purpose — replaceEffects sets them outright.
    },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 2, roar: 3 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { fear: 1 },
    pullDist: { grasp: -1 },
    passiveHp: { fighter: { undying: -7 }, sorcerer: { undying: -5 }, cleric: { undying: -7 } },
    lifesteal: { drain: { heal: 2 } },
    threshold: { assassinate: 3 },
    selfStatusDur: { blizzard: -2 },
    excludeAllies: { blizzard: false, ffh: false, shockwave: false, roar: false },
    areaShape: { ffh: 'ring', blizzard: 'ring', roar: 'ring' },
    areaRadius: { roar: -1 },
    replaceEffects: {
      twin: [{ type: 'damage', formula: 'flat', value: 8 }, { type: 'damage', formula: 'flat', value: 8 }],
      ward: [{ type: 'grant_max_health', value: 15 }, { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 }],
      // Leaping Slam: leap up to 3, then ring the landing tile.
      roar: [
        { type: 'move_self' },
        // 10 made it rank #1 in both screened pairs by ~20pts over the rest of
        // the kit (66.7/72.2 vs whirlwind 45.8/58.9) — the leap, the damage and
        // the weaken were three payments for one action. Damage is the cheapest
        // of the three to give back; the reach is the point of the design.
        { type: 'damage', formula: 'flat', value: 6 },
        { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 2 },
      ],
      // Ground Slam: shockwave's damage, root instead of push.
      shockwave: [
        { type: 'damage', formula: 'flat', value: 13 },
        { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 1 },
      ],
    },
  },

  // --- PASS 18 SCREENING: rein in Leaping Slam, revive Ground Slam. --------
  // pass17 result: Leaping Slam is rank #1 of all 2268 cells, top10 74.6 vs
  // whirlwind 65.6 and Ground Slam 57.0, holding 48 of the top 100. That is the
  // clear-best outcome the owner ruled out — it collapses the hidden-special
  // read, because opponents stop guessing and just assume every Barbarian has
  // it, pricing the whole class as root-resistant. Barbarian ceiling hit 75 vs
  // 70 for second place.
  //
  // The 10 -> 6 damage trim barely moved it, so DAMAGE IS NOT WHERE THE POWER
  // LIVES — the leap itself is the payload. Owner keeps the weaken (thematic),
  // so the lever is reach: leap 3 -> 2. Two damage levels are screened together
  // to bracket the answer in one round rather than iterating.
  //   p18_a: leap range 2, damage 6   p18_b: leap range 2, damage 4
  // Both also carry GROUND SLAM ROOT 1 -> 2 (owner): at #109 with zero top-100
  // cells it was the worst of the three, and two dead picks leak the read just
  // as badly as one dominant pick. Blizzard range 4 is SETTLED (#133 -> #25,
  // level with cold_snap and freeze) and unchanged here.
  p18_a: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 11, rogue: 8, warlock: 8, cleric: 6, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, ignite: -1, grasp: 5, cold_snap: -2, longshot: 3, missile: -1,
           concussive: -2, pinning: -4, bolt: 1, whirlwind: 2, shield_bash: 3, strike: -1, ffh: 0, flame_jet: 0, sword: 0 },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 2, roar: 2 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { fear: 1 },
    pullDist: { grasp: -1 },
    passiveHp: { fighter: { undying: -7 }, sorcerer: { undying: -5 }, cleric: { undying: -7 } },
    lifesteal: { drain: { heal: 2 } },
    threshold: { assassinate: 3 },
    selfStatusDur: { blizzard: -2 },
    excludeAllies: { blizzard: false, ffh: false, shockwave: false, roar: false },
    areaShape: { ffh: 'ring', blizzard: 'ring', roar: 'ring' },
    areaRadius: { roar: -1 },
    replaceEffects: {
      twin: [{ type: 'damage', formula: 'flat', value: 8 }, { type: 'damage', formula: 'flat', value: 8 }],
      ward: [{ type: 'grant_max_health', value: 15 }, { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 }],
      roar: [
        { type: 'move_self' },
        { type: 'damage', formula: 'flat', value: 6 },
        { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 2 },
      ],
      shockwave: [
        { type: 'damage', formula: 'flat', value: 13 },
        { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 2 },
      ],
    },
  },
  p18_b: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 11, rogue: 8, warlock: 8, cleric: 6, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, ignite: -1, grasp: 5, cold_snap: -2, longshot: 3, missile: -1,
           concussive: -2, pinning: -4, bolt: 1, whirlwind: 2, shield_bash: 3, strike: -1, ffh: 0, flame_jet: 0, sword: 0 },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 2, roar: 2 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { fear: 1 },
    pullDist: { grasp: -1 },
    passiveHp: { fighter: { undying: -7 }, sorcerer: { undying: -5 }, cleric: { undying: -7 } },
    lifesteal: { drain: { heal: 2 } },
    threshold: { assassinate: 3 },
    selfStatusDur: { blizzard: -2 },
    excludeAllies: { blizzard: false, ffh: false, shockwave: false, roar: false },
    areaShape: { ffh: 'ring', blizzard: 'ring', roar: 'ring' },
    areaRadius: { roar: -1 },
    replaceEffects: {
      twin: [{ type: 'damage', formula: 'flat', value: 8 }, { type: 'damage', formula: 'flat', value: 8 }],
      ward: [{ type: 'grant_max_health', value: 15 }, { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 }],
      roar: [
        { type: 'move_self' },
        { type: 'damage', formula: 'flat', value: 4 },
        { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 2 },
      ],
      shockwave: [
        { type: 'damage', formula: 'flat', value: 13 },
        { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 2 },
      ],
    },
  },

  // --- PASS 18 (full grid candidate) --------------------------------------
  // = p18_a plus the two owner calls made while reading the pass17 workbook:
  //
  // ANCHOR +2 max HP on all five classes that can take it (fighter, barbarian,
  //   cleric, wizard, warlock). "The opposite of undying" — undying is being
  //   taxed DOWN, anchor gets a small lift so it is not dead weight outside its
  //   anti-push niche. Deliberately tiny. ⚠ SEE THE HISTORY NOTE IN
  //   AC_REWORK.md: anchor previously carried a +6 maxHealth rider that made it
  //   STRICTLY DOMINANT and was removed for exactly that reason; rulebookSpec
  //   still asserts anchor must not change max health. +2 is a third of the old
  //   rider, but this is a knowingly-reopened door — watch anchor's share.
  // ASSASSINATE threshold +1 (delta 3 -> 4). Rogue read weak in pass17; owner
  //   is starting with the special rather than the chassis and will re-look
  //   after the Barbarian nerf lands (Leaping Slam held 48 of the top 100, so
  //   every other class's pass17 ranking is depressed and not yet trustworthy).
  //
  // CLERIC: looks strong, deliberately NOT touched yet — owner does not want to
  //   nerf the chassis before the Barbarian distortion is out of the data.
  //
  // ROAR DAMAGE = 4, SETTLED by the p18_a/p18_b screen. Within-pair top-5:
  //   leap 2 dmg 6 -> Slam #1 in BOTH pairs (60.6 vs 50.0 / 63.7 vs 59.7) —
  //     still the clear best, 10.6 clear in the fighter pair. Fails the bar.
  //   leap 2 dmg 4 -> Slam #1 by 3.6 in one pair and THIRD in the other (56.4
  //     behind whirlwind 59.7 and Ground Slam 55.0). Three live picks. Passes.
  // The leap RANGE did most of the work (3->2); damage 6->4 was worth a further
  // ~6pts. Erring to the weaker number on purpose: the sim plays with perfect
  // information, so it cannot price the bluff value of a hidden special and
  // systematically UNDERSTATES the leap. Ground Slam root 1->2 revived it from
  // #109/zero top-100 cells to #8 and #2 within its pairs.
  pass18: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 11, rogue: 8, warlock: 8, cleric: 6, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, ignite: -1, grasp: 5, cold_snap: -2, longshot: 3, missile: -1,
           concussive: -2, pinning: -4, bolt: 1, whirlwind: 2, shield_bash: 3, strike: -1, ffh: 0, flame_jet: 0, sword: 0 },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 2, roar: 2 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { fear: 1 },
    pullDist: { grasp: -1 },
    passiveHp: {
      fighter: { undying: -7, anchor: 2 },
      sorcerer: { undying: -5 },
      cleric: { undying: -7, anchor: 2 },
      barbarian: { anchor: 2 },
      wizard: { anchor: 2 },
      warlock: { anchor: 2 },
    },
    lifesteal: { drain: { heal: 2 } },
    threshold: { assassinate: 4 },
    selfStatusDur: { blizzard: -2 },
    excludeAllies: { blizzard: false, ffh: false, shockwave: false, roar: false },
    areaShape: { ffh: 'ring', blizzard: 'ring', roar: 'ring' },
    areaRadius: { roar: -1 },
    replaceEffects: {
      twin: [{ type: 'damage', formula: 'flat', value: 8 }, { type: 'damage', formula: 'flat', value: 8 }],
      ward: [{ type: 'grant_max_health', value: 15 }, { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 }],
      roar: [
        { type: 'move_self' },
        { type: 'damage', formula: 'flat', value: 4 },
        { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 2 },
      ],
      shockwave: [
        { type: 'damage', formula: 'flat', value: 13 },
        { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 2 },
      ],
    },
  },


  pass19: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 9, barbarian: 9, rogue: 8, warlock: 8, cleric: 6, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, ignite: -1, grasp: 5, cold_snap: -2, longshot: 3, missile: -1,
           concussive: -1, pinning: -4, bolt: 1, whirlwind: 2, shield_bash: 3, strike: -1, ffh: 0, flame_jet: 0, sword: 0 },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 2, roar: 2 },
    heal: { second_wind: 4, heal: 3, purify: -3 },
    statusDur: { fear: 1 },
    pullDist: { grasp: -1 },
    passiveHp: {
      fighter: { undying: -7, anchor: 2 },
      sorcerer: { undying: -5 },
      cleric: { undying: -7, anchor: 2 },
      barbarian: { anchor: 2 },
      wizard: { anchor: 3 },
      warlock: { anchor: 2 },
    },
    lifesteal: { drain: { heal: 2 } },
    threshold: { assassinate: 4 },
    selfStatusDur: { blizzard: -2 },
    excludeAllies: { blizzard: false, ffh: false, shockwave: false, roar: false },
    areaShape: { ffh: 'ring', blizzard: 'ring', roar: 'ring' },
    areaRadius: { roar: -1 },
    replaceEffects: {
      twin: [{ type: 'damage', formula: 'flat', value: 8 }, { type: 'damage', formula: 'flat', value: 8 }],
      ward: [{ type: 'grant_max_health', value: 16 }, { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 }],
      roar: [
        { type: 'move_self' },
        { type: 'damage', formula: 'flat', value: 3 },
        { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 2 },
      ],
      shockwave: [
        { type: 'damage', formula: 'flat', value: 15 },
        { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 2 },
      ],
    },
  },


  pass20: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, ignite: -1, grasp: 5, cold_snap: -2, longshot: 3, missile: -1,
           concussive: -1, pinning: -4, bolt: 1, whirlwind: 2, shield_bash: 3, strike: -1, ffh: 0, flame_jet: 0, sword: 0 },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 2, roar: 2 },
    heal: { second_wind: 4, heal: 3, purify: -3 },
    statusDur: { fear: 1 },
    pullDist: { grasp: -1 },
    passiveHp: {
      fighter: { undying: -7, anchor: 2 },
      sorcerer: { undying: -5 },
      cleric: { undying: -7, anchor: 2 },
      barbarian: { anchor: 2 },
      wizard: { anchor: 3 },
      warlock: { anchor: 2 },
    },
    lifesteal: { drain: { heal: 2 } },
    threshold: { assassinate: 4 },
    selfStatusDur: { blizzard: -2 },
    excludeAllies: { blizzard: false, ffh: false, shockwave: false, roar: false },
    areaShape: { ffh: 'ring', blizzard: 'ring', roar: 'ring' },
    areaRadius: { roar: -1 },
    replaceEffects: {
      twin: [{ type: 'damage', formula: 'flat', value: 8 }, { type: 'damage', formula: 'flat', value: 8 }],
      ward: [{ type: 'grant_max_health', value: 16 }, { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 }],
      roar: [
        { type: 'move_self' },
        { type: 'damage', formula: 'flat', value: 3 },
        { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 2 },
      ],
      shockwave: [
        { type: 'damage', formula: 'flat', value: 15 },
        { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 2 },
      ],
    },
  },


  pass21: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, ignite: -1, grasp: 5, cold_snap: -1, longshot: 3, missile: -1,
           concussive: -1, pinning: -4, bolt: 1, whirlwind: 2, shield_bash: 3, strike: -1, ffh: 0, flame_jet: 0, sword: 0 },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 2, roar: 2 },
    heal: { second_wind: 4, heal: 3, purify: -3 },
    statusDur: { fear: 1 },
    pullDist: { grasp: -1 },
    passiveHp: {
      fighter: { undying: -7, anchor: 1 },
      sorcerer: { undying: -5 },
      cleric: { undying: -7, anchor: 1 },
      barbarian: { anchor: 1 },
      wizard: { anchor: 2 },
      warlock: { anchor: 1 },
    },
    lifesteal: { drain: { heal: 2 } },
    threshold: { assassinate: 4 },
    selfStatusDur: { blizzard: -2 },
    excludeAllies: { blizzard: false, ffh: false, shockwave: false, roar: false },
    areaShape: { ffh: 'ring', blizzard: 'ring', roar: 'ring' },
    areaRadius: { roar: -1 },
    replaceEffects: {
      twin: [{ type: 'damage', formula: 'flat', value: 8 }, { type: 'damage', formula: 'flat', value: 8 }],
      ward: [{ type: 'grant_max_health', value: 16 }, { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 }],
      roar: [
        { type: 'move_self' },
        { type: 'damage', formula: 'flat', value: 3 },
        { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 2 },
      ],
      shockwave: [
        { type: 'damage', formula: 'flat', value: 15 },
        { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 2 },
      ],
    },
  },

  // --- Pass 17 SCREENING VARIANTS (blizzard only; everything else = pass16
  // plus the two settled changes: fighter buff reverted, shockwave push 2). ---
  // Question: blizzard ring @ range 3 sits at #133 while the STRUCTURALLY
  // IDENTICAL firestorm ring @ range 5 sits at #20. Is that range, or is it
  // that a freeze which can freeze your own team is self-cancelling?
  // p17_base : blizzard unchanged (range 3, 8-tile ring)   [control]
  // p17_range: blizzard range 5   (reach parity with firestorm/cold_snap)
  // p17_small: blizzard 4-tile orthogonal @ range 3        (my speculation)
  p17_base: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 11, rogue: 8, warlock: 8, cleric: 6, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, ignite: -1, grasp: 5, cold_snap: -2, shockwave: 5, longshot: 3, missile: -1,
           concussive: -2, pinning: -4, bolt: 1, whirlwind: 2, shield_bash: 3, strike: -1, ffh: 0, flame_jet: 0, sword: 0 },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 1 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { roar: -1, fear: 1 }, pullDist: { grasp: -1, shockwave: 0 },
    passiveHp: { fighter: { undying: -7 }, sorcerer: { undying: -5 }, cleric: { undying: -7 } },
    lifesteal: { drain: { heal: 2 } }, threshold: { assassinate: 3 }, selfStatusDur: { blizzard: -2 },
    excludeAllies: { blizzard: false, ffh: false, shockwave: false, roar: false },
    areaShape: { ffh: 'ring', blizzard: 'ring' }, areaRadius: { roar: -1 },
    replaceEffects: {
      twin: [{ type: 'damage', formula: 'flat', value: 8 }, { type: 'damage', formula: 'flat', value: 8 }],
      ward: [{ type: 'grant_max_health', value: 15 }, { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 }],
    },
  },
  p17_range: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 11, rogue: 8, warlock: 8, cleric: 6, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, ignite: -1, grasp: 5, cold_snap: -2, shockwave: 5, longshot: 3, missile: -1,
           concussive: -2, pinning: -4, bolt: 1, whirlwind: 2, shield_bash: 3, strike: -1, ffh: 0, flame_jet: 0, sword: 0 },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 3 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { roar: -1, fear: 1 }, pullDist: { grasp: -1, shockwave: 0 },
    passiveHp: { fighter: { undying: -7 }, sorcerer: { undying: -5 }, cleric: { undying: -7 } },
    lifesteal: { drain: { heal: 2 } }, threshold: { assassinate: 3 }, selfStatusDur: { blizzard: -2 },
    excludeAllies: { blizzard: false, ffh: false, shockwave: false, roar: false },
    areaShape: { ffh: 'ring', blizzard: 'ring' }, areaRadius: { roar: -1 },
    replaceEffects: {
      twin: [{ type: 'damage', formula: 'flat', value: 8 }, { type: 'damage', formula: 'flat', value: 8 }],
      ward: [{ type: 'grant_max_health', value: 15 }, { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 }],
    },
  },
  p17_small: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -6, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 7, barbarian: 11, rogue: 8, warlock: 8, cleric: 6, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, ignite: -1, grasp: 5, cold_snap: -2, shockwave: 5, longshot: 3, missile: -1,
           concussive: -2, pinning: -4, bolt: 1, whirlwind: 2, shield_bash: 3, strike: -1, ffh: 0, flame_jet: 0, sword: 0 },
    range: { freeze: -1, heal: 1, ffh: 1, ward: 1, blizzard: 1 },
    heal: { second_wind: 4, heal: 4, purify: -2 },
    statusDur: { roar: -1, fear: 1 }, pullDist: { grasp: -1, shockwave: 0 },
    passiveHp: { fighter: { undying: -7 }, sorcerer: { undying: -5 }, cleric: { undying: -7 } },
    lifesteal: { drain: { heal: 2 } }, threshold: { assassinate: 3 }, selfStatusDur: { blizzard: -2 },
    excludeAllies: { blizzard: false, ffh: false, shockwave: false, roar: false },
    areaShape: { ffh: 'ring', blizzard: 'orthogonal' }, areaRadius: { roar: -1 },
    replaceEffects: {
      twin: [{ type: 'damage', formula: 'flat', value: 8 }, { type: 'damage', formula: 'flat', value: 8 }],
      ward: [{ type: 'grant_max_health', value: 15 }, { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 }],
    },
  },
};

/**
 * Best-known loadout per class, derived from the pass-8 grid (highest mean
 * over that class's 189 cells). Stage A/B previously ran with NO passives at
 * all (simHarness only applies one when a customization supplies it), so the
 * class ladder measured a passive-less game for 8 passes — which is why it
 * ranked Fighter 7th while the grid ranked his chassis 1st. Ladder stages now
 * play each class at its best, which is the right competitive-balance frame.
 * REDERIVE after any pass that meaningfully moves loadout rankings.
 */
const BEST_LOADOUT: Record<string, { specialSlug: string; passiveSlug: string | null }> = {
  fighter:   { specialSlug: 'concussive',  passiveSlug: 'undying' },
  barbarian: { specialSlug: 'roar',        passiveSlug: 'vengeful' },
  ranger:    { specialSlug: 'pinning',     passiveSlug: 'thorns' },
  rogue:     { specialSlug: 'dagger_toss', passiveSlug: 'vengeful' },
  cleric:    { specialSlug: 'purify',      passiveSlug: 'undying' },
  wizard:    { specialSlug: 'freeze',      passiveSlug: 'opportunist' },
  sorcerer:  { specialSlug: 'ffh',         passiveSlug: 'undying' },
  warlock:   { specialSlug: 'grasp',       passiveSlug: 'opportunist' },
};
const bestCusts = (slugs: string[]) => slugs.map((s2) => BEST_LOADOUT[s2]);

function applyDelta(delta: number): void {
  for (const c of ALL_CLASSES) {
    // Floor at 7: below 6 the formula is a guaranteed hit and negative-miss
    // territory; 7 keeps at least a 5% whiff so "attack roll" stays meaningful.
    DEFAULT_UNITS[c].armorClass = Math.max(7, BASE_AC[c] + delta);
    DEFAULT_UNITS[c].maxHealth = BASE_HP[c];
  }
}

// Snapshot pristine values per ability so presets can be applied repeatedly
// without compounding.
type Eff = { type: string; value?: number; durationTurns?: number };
const BASE_DMG: Record<string, number[]> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [
    a.slug,
    (a.effects as Eff[]).filter((e) => e.type === 'damage').map((e) => e.value ?? 0),
  ]),
);
const BASE_RANGE: Record<string, number> = Object.fromEntries(DEFAULT_ABILITIES.map((a) => [a.slug, a.range]));
const BASE_SHAPE: Record<string, string | undefined> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [a.slug, (a as { areaShape?: string }).areaShape]),
);
const BASE_RADIUS: Record<string, number> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [a.slug, a.areaRadius]),
);
const BASE_XA: Record<string, boolean> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [a.slug, (a as { excludeAllies?: boolean }).excludeAllies ?? false]),
);
const BASE_HEAL: Record<string, number[]> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [
    a.slug,
    (a.effects as Eff[]).filter((e) => e.type === 'heal').map((e) => e.value ?? 0),
  ]),
);
const BASE_SDUR: Record<string, number[]> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [
    a.slug,
    (a.effects as Eff[]).filter((e) => e.type === 'apply_status').map((e) => e.durationTurns ?? 0),
  ]),
);
type LSEff = { type: string; value?: number; healValue?: number };
const BASE_LS: Record<string, { v: number; h: number }[]> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [
    a.slug,
    (a.effects as LSEff[]).filter((e) => e.type === 'lifesteal').map((e) => ({ v: e.value ?? 0, h: e.healValue ?? 0 })),
  ]),
);
// Deep copy: the UNDYING PassiveOption object is SHARED by reference across
// fighter/cleric/sorcerer, so a per-class tax must replace the entry, not
// mutate the shared const.
type PassiveOpt = (typeof DEFAULT_UNITS)[string]['passiveOptions'][number];
const BASE_PASSIVES: Record<string, PassiveOpt[]> = Object.fromEntries(
  ALL_CLASSES.map((c) => [c, DEFAULT_UNITS[c].passiveOptions.map((po) => ({ ...po }))]),
);
type ThEff = { type: string; healthThreshold?: number };
const BASE_TH: Record<string, number[]> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [
    a.slug,
    (a.effects as ThEff[]).filter((e) => e.healthThreshold != null).map((e) => e.healthThreshold ?? 0),
  ]),
);
const BASE_SELFSTATUS: Record<string, number | null> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [a.slug, (a as { selfStatus?: { durationTurns: number } }).selfStatus?.durationTurns ?? null]),
);
// Deep clone of every ability's original effects, so replaceEffects can be
// reverted between presets in one process.
const BASE_EFFECTS: Record<string, unknown[]> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [a.slug, JSON.parse(JSON.stringify(a.effects))]),
);
type PPEff = { type: string; distance?: number };
const BASE_PP: Record<string, number[]> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [
    a.slug,
    (a.effects as PPEff[]).filter((e) => e.type === 'push' || e.type === 'pull').map((e) => e.distance ?? 0),
  ]),
);

function applyPreset(p: Preset): void {
  // Per-class Opportunist override: rebuilt from scratch each run so a preset
  // without `oppBonus` restores the shipped base +4 for every class.
  for (const k of Object.keys(OPPORTUNIST_BONUS_BY_CLASS)) delete OPPORTUNIST_BONUS_BY_CLASS[k];
  for (const [c, v] of Object.entries(p.oppBonus ?? {})) OPPORTUNIST_BONUS_BY_CLASS[c] = v;
  for (const k of Object.keys(VENGEFUL_BONUS_BY_CLASS)) delete VENGEFUL_BONUS_BY_CLASS[k];
  for (const [c, v] of Object.entries(p.vengBonus ?? {})) VENGEFUL_BONUS_BY_CLASS[c] = v;
  for (const c of ALL_CLASSES) {
    DEFAULT_UNITS[c].armorClass = Math.max(7, BASE_AC[c] + (p.ac[c] ?? 0));
    DEFAULT_UNITS[c].maxHealth = BASE_HP[c] + (p.hp[c] ?? 0);
  }
  for (const c of ALL_CLASSES) {
    const taxes = p.passiveHp?.[c];
    DEFAULT_UNITS[c].passiveOptions = BASE_PASSIVES[c].map((po) => {
      const d = taxes?.[po.slug] ?? 0;
      if (!d) return { ...po };
      // Only safe for flag-passives / maxHealth passives (never clobber
      // movementRange or armorClass stat passives like Swift).
      const cur = po.stat === 'maxHealth' ? (po.value ?? 0) : 0;
      return { ...po, stat: 'maxHealth' as const, value: cur + d };
    });
  }
  for (const a of DEFAULT_ABILITIES) {
    // Restore pristine effects (undoes a previous preset's replaceEffects),
    // then apply this preset's replacement if any, then the value deltas.
    // The deltas must be applied to whichever set we just installed — reading
    // them from BASE_* would silently overwrite a replacement's own numbers
    // (this clobbered a replaceEffects twin back to its original damage).
    const srcEffects = (p.replaceEffects?.[a.slug] ?? BASE_EFFECTS[a.slug]) as Array<Record<string, unknown>>;
    (a as { effects: unknown[] }).effects = JSON.parse(JSON.stringify(srcEffects));
    const localDmg = srcEffects.filter((e) => e.type === 'damage').map((e) => (e.value as number) ?? 0);
    const localHeal = srcEffects.filter((e) => e.type === 'heal').map((e) => (e.value as number) ?? 0);
    const localDur = srcEffects.filter((e) => e.type === 'apply_status').map((e) => (e.durationTurns as number) ?? 0);
    const localPP = srcEffects.filter((e) => e.type === 'push' || e.type === 'pull').map((e) => (e.distance as number) ?? 0);
    const selfBase = BASE_SELFSTATUS[a.slug];
    const dSelf = p.selfStatusDur?.[a.slug] ?? 0;
    if (selfBase != null) {
      (a as { selfStatus?: { durationTurns: number } }).selfStatus!.durationTurns = selfBase + dSelf;
    }
    (a as { excludeAllies?: boolean }).excludeAllies = p.excludeAllies?.[a.slug] ?? BASE_XA[a.slug];
    (a as { areaShape?: string }).areaShape = p.areaShape?.[a.slug] ?? BASE_SHAPE[a.slug];
    (a as { areaRadius: number }).areaRadius = BASE_RADIUS[a.slug] + (p.areaRadius?.[a.slug] ?? 0);
    const dTh = p.threshold?.[a.slug] ?? 0;
    let ti = 0;
    for (const e of a.effects as ThEff[]) {
      if (e.healthThreshold != null) { e.healthThreshold = BASE_TH[a.slug][ti] + dTh; ti++; }
    }
    const dDmg = p.dmg?.[a.slug] ?? 0;
    const dHeal = p.heal?.[a.slug] ?? 0;
    const dDur = p.statusDur?.[a.slug] ?? 0;
    (a as { range: number }).range = BASE_RANGE[a.slug] + (p.range?.[a.slug] ?? 0);
    const dPP = p.pullDist?.[a.slug] ?? 0;
    let i = 0, h = 0, d = 0, pp = 0;
    for (const e of a.effects as (Eff & PPEff)[]) {
      if (e.type === 'damage') { e.value = localDmg[i] + dDmg; i++; }
      if (e.type === 'heal') { e.value = localHeal[h] + dHeal; h++; }
      if (e.type === 'apply_status') { e.durationTurns = localDur[d] + dDur; d++; }
      if (e.type === 'push' || e.type === 'pull') { e.distance = localPP[pp] + dPP; pp++; }
    }
    const ls = p.lifesteal?.[a.slug];
    let li = 0;
    for (const e of a.effects as LSEff[]) {
      if (e.type === 'lifesteal') {
        e.value = BASE_LS[a.slug][li].v + (ls?.dmg ?? 0);
        e.healValue = BASE_LS[a.slug][li].h + (ls?.heal ?? 0);
        li++;
      }
    }
  }
}

function header(label: string): void {
  console.log(`\n████████ ${label} ████████`);
  console.log('  class      AC  hit%   HP   ~EHP');
  for (const c of ALL_CLASSES) {
    const ac = DEFAULT_UNITS[c].armorClass;
    const hp = DEFAULT_UNITS[c].maxHealth;
    const ehp = hp / hit(ac);
    // Show any passive stat tax actually in force (Undying's HP cost).
    const taxed = DEFAULT_UNITS[c].passiveOptions
      .filter((po) => po.stat === 'maxHealth' && (po.value ?? 0) !== 0)
      .map((po) => `${po.slug}${po.value! > 0 ? '+' : ''}${po.value} → ${hp + po.value!}hp`)
      .join(' ');
    console.log(`  ${c.padEnd(10)} ${String(ac).padStart(2)}  ${pct(hit(ac))}  ${String(hp).padStart(3)}  ${ehp.toFixed(0).padStart(4)}  ${taxed}`);
  }
}

function stageA(delta: number, games: number): void {
  console.log(`\n──── Stage A: class matrix (${games} games/pair) ────`);
  const wins: Record<string, { w: number; g: number }> = {};
  for (const c of ALL_CLASSES) wins[c] = { w: 0, g: 0 };
  let errors = 0, turnsSum = 0, cells = 0;
  for (let i = 0; i < ALL_CLASSES.length; i++) {
    for (let j = i + 1; j < ALL_CLASSES.length; j++) {
      const a = ALL_CLASSES[i], b = ALL_CLASSES[j];
      const fill = ['fighter', 'cleric', 'barbarian', 'ranger']
        .filter((c) => c !== a && c !== b).slice(0, 2);
      // Seed offset by delta so variants don't share RNG streams.
      const t1 = [a, a, ...fill], t2 = [b, b, ...fill];
      const r = runSim(t1, t2, {
        games, seed: 9000 + (delta + 10) * 971 + i * 31 + j,
        p1Customizations: bestCusts(t1), p2Customizations: bestCusts(t2),
      });
      errors += r.totalValidationErrors;
      turnsSum += r.avgTurns; cells++;
      wins[a].w += r.p1Wins; wins[a].g += r.games;
      wins[b].w += r.p2Wins; wins[b].g += r.games;
    }
  }
  const rank = ALL_CLASSES.map((c) => ({ c, wr: wins[c].w / wins[c].g })).sort((x, y) => y.wr - x.wr);
  console.log(`  avg turns/game: ${(turnsSum / cells).toFixed(1)}   validation errors: ${errors}`);
  for (const { c, wr } of rank) {
    const mark = wr >= 0.62 ? '  ▲ STRONG' : wr <= 0.38 ? '  ▼ WEAK' : '';
    console.log(`    ${c.padEnd(10)} ${pct(wr)}${mark}`);
  }
}

function stageB(delta: number, games: number): void {
  console.log(`\n──── Stage B: comp battery (${games} games/pair) ────`);
  const COMPS: [string, string[]][] = [
    ['classic',      ['barbarian', 'fighter', 'ranger', 'cleric']],
    ['double-rogue', ['rogue', 'rogue', 'sorcerer', 'sorcerer']],
    ['bruiser-wall', ['fighter', 'fighter', 'barbarian', 'barbarian']],
    ['full-caster',  ['wizard', 'sorcerer', 'warlock', 'cleric']],
    ['skirmish',     ['rogue', 'rogue', 'ranger', 'ranger']],
    ['heal-tank',    ['fighter', 'fighter', 'cleric', 'cleric']],
    ['control',      ['wizard', 'wizard', 'warlock', 'warlock']],
    ['snipe',        ['ranger', 'ranger', 'wizard', 'wizard']],
    ['rogue-heal',   ['rogue', 'rogue', 'cleric', 'cleric']],
    // Owner-requested (2026-08-01): grasp-synergy comps — warlocks drag
    // targets into bruiser range (and, with placement, into Whirlwinds).
    // Slug syntax "class:special" forces that special (default loadouts would
    // give these warlocks FEAR, which defeats the test).
    ['grasp-spin',   ['warlock:grasp', 'warlock:grasp', 'barbarian', 'barbarian']],
    ['grasp-wall',   ['warlock:grasp', 'warlock:grasp', 'fighter', 'fighter']],
  ];
  // Parse "class:special" into slugs + customizations for runSim.
  const parseComp = (team: string[]) => {
    const slugs = team.map((t) => t.split(':')[0]);
    const custs = team.map((t) => {
      const special = t.split(':')[1];
      return special ? { specialSlug: special, passiveSlug: null } : undefined;
    });
    return { slugs, custs: custs.some(Boolean) ? custs : undefined };
  };
  const wins: Record<string, { w: number; g: number }> = {};
  for (const [n] of COMPS) wins[n] = { w: 0, g: 0 };
  let errors = 0;
  for (let i = 0; i < COMPS.length; i++) {
    for (let j = i + 1; j < COMPS.length; j++) {
      const [an, a] = COMPS[i], [bn, b] = COMPS[j];
      const pa = parseComp(a), pb = parseComp(b);
      // Forced-special comps keep their override; everything else plays its
      // best-known loadout (Stage B was passive-blind too).
      const r = runSim(pa.slugs, pb.slugs, {
        games, seed: 40000 + (delta + 10) * 977 + i * 31 + j,
        p1Customizations: pa.custs ?? bestCusts(pa.slugs),
        p2Customizations: pb.custs ?? bestCusts(pb.slugs),
      });
      errors += r.totalValidationErrors;
      wins[an].w += r.p1Wins; wins[an].g += r.games;
      wins[bn].w += r.p2Wins; wins[bn].g += r.games;
    }
  }
  const rank = COMPS.map(([n]) => ({ n, wr: wins[n].w / wins[n].g })).sort((x, y) => y.wr - x.wr);
  console.log(`  validation errors: ${errors}`);
  for (const { n, wr } of rank) {
    const mark = wr >= 0.68 ? '  ▲ STRONG' : wr <= 0.32 ? '  ▼ WEAK' : '';
    console.log(`    ${n.padEnd(13)} ${pct(wr)}${mark}`);
  }
}

/** Stage C+D: specials/passives marginals under the active preset (duel =
 * intra-class loadout round-robin; ref = each loadout's 4-stack vs the classic
 * party). This is the within-class balance view the owner asked for in pass 2. */
function stageMarginals(duelGames: number, refGames: number): void {
  console.log(`\n──── Stage C+D: loadout marginals (duel ${duelGames}, ref ${refGames} games) ────`);
  interface M { w: number; g: number }
  const sd: Record<string, M> = {}, pd: Record<string, M> = {};
  const sr: Record<string, M> = {}, pr: Record<string, M> = {};
  const add = (m: Record<string, M>, k: string, w: number, g: number) => {
    m[k] = m[k] ?? { w: 0, g: 0 }; m[k].w += w; m[k].g += g;
  };
  for (const c of ALL_CLASSES) {
    const d = runDuelMatrix(c, duelGames, () => {});
    for (const s of d.scores) {
      add(sd, `${c}/${s.loadout.specialSlug}`, s.wins, s.games);
      add(pd, `${c}/${s.loadout.passiveSlug ?? 'none'}`, s.wins, s.games);
    }
    const r = runReferenceMatrix(c, refGames, () => {});
    for (const s of r.scores) {
      add(sr, `${c}/${s.loadout.specialSlug}`, s.wins, s.games);
      add(pr, `${c}/${s.loadout.passiveSlug ?? 'none'}`, s.wins, s.games);
    }
    console.log(`  ${c}: done`);
  }
  const wr = (m: M | undefined) => (m && m.g > 0 ? m.w / m.g : NaN);
  console.log('\n  SPECIALS (intra-class duel% | vs-classic%)  ▲≥62 ▼≤38 on duel:');
  for (const c of ALL_CLASSES) {
    const specials = loadoutsFor(c).map((l) => l.specialSlug).filter((v, i, a) => a.indexOf(v) === i);
    for (const s of specials) {
      const d = wr(sd[`${c}/${s}`]), r = wr(sr[`${c}/${s}`]);
      const mark = d >= 0.62 ? ' ▲' : d <= 0.38 ? ' ▼' : '';
      console.log(`    ${c.padEnd(10)} ${s.padEnd(14)} ${pct(d)} | ${pct(r)}${mark}`);
    }
  }
  console.log('\n  PASSIVES (intra-class duel% | vs-classic%):');
  for (const c of ALL_CLASSES) {
    const passives = loadoutsFor(c).map((l) => l.passiveSlug ?? 'none').filter((v, i, a) => a.indexOf(v) === i);
    for (const p of passives) {
      const d = wr(pd[`${c}/${p}`]), r = wr(pr[`${c}/${p}`]);
      const mark = d >= 0.62 ? ' ▲' : d <= 0.38 ? ' ▼' : '';
      console.log(`    ${c.padEnd(10)} ${p.padEnd(14)} ${pct(d)} | ${pct(r)}${mark}`);
    }
  }
}

/**
 * Stage E — systematic pair-comp scan (owner directive after grasp-spin was
 * caught only by a hand-added comp): EVERY class pair X²Y² (28), EVERY
 * specials×passives loadout combination for both classes (9×9 = 81 per pair),
 * measured vs the classic reference party. ~91k games at 40/cell — run in
 * background. Prints per-pair aggregates and flags cells ≥65% / ≤35%.
 */
function stagePairComps(games: number): void {
  console.log(`\n──── Stage E: all pair-comps × full loadout grid (${games} games/cell) ────`);
  // Three maximally-distinct reference parties from the 45–55% band of the
  // pass-4 Stage B battery (owner call): melee HP (bruiser-wall 50%), ranged
  // dps (snipe 54%), caster turn-denial (control 47%). Each cell's score is
  // the MEDIAN of its win rates vs the three — a comp must beat unlike
  // opposition styles to flag, and no single yardstick's weakness inflates
  // the grid (the old classic-only yardstick sat ~13 points below average).
  // Six owner-approved references (2026-08-01), each with its best-known
  // loadout from the marginals (default-loadout refs were the source of the
  // grid-wide inflation). All 8 classes appear at least once. Cell score =
  // MEDIAN of the six — a comp must handle at least three distinct styles.
  type Ref = [string, string[], { specialSlug: string; passiveSlug: string | null }[]];
  const L = (specialSlug: string, passiveSlug: string | null) => ({ specialSlug, passiveSlug });
  // --refs fable: score every cell against Fable's 12 shipped rosters instead
  // of the hand-built panel below. That makes the yardstick the opposition
  // players actually face, at the cost of circularity (several rosters are
  // themselves pair-comps that appear as grid rows) and of comparability with
  // every pre-2026-08-10 grid — both accepted by the owner. Panel size changes
  // 9 -> 12, so cells cost 33% more and the CSV gains three columns.
  const USE_FABLE_REFS = flag('refs') === 'fable';
  const FTR = L('concussive', 'undying'), BRB = L('whirlwind', 'thorns');
  const RGR = L('pinning', 'opportunist'), WIZ = L('cold_snap', 'opportunist');
  const SRC = L('ignite', 'undying'), WLK_D = L('drain', 'anchor'), WLK_G = L('grasp', 'anchor');
  const RGE = L('expose', 'opportunist'), CLR = L('heal', 'undying');
  // 7th reference (owner-approved 2026-08-03): the panel had NO stalwart at
  // all and anchor on only 2 of 6, so counter-play was invisible — Fear's root
  // was never countered anywhere in the data. "wardens" carries BOTH counters
  // (2x anchor, 2x stalwart) and is strong on its own merits (61.3 median in
  // the pass-10 grid), adding a defensive-control style the panel lacked.
  const CLR_A = L('purify', 'anchor'), WIZ_S = L('freeze', 'stalwart');
  // 8th/9th references (owner-approved 2026-08-03) after a calibration +
  // redundancy audit of the 6-panel: correlations were all <=0.46 (diverse,
  // good) but difficulty was badly skewed — bruisers sat at a 22.8% mean with
  // the LOWEST spread, i.e. near-unbeatable and the least discriminating, and
  // it was the main source of the compressed medians. These two add the three
  // passives the panel had never contained (swift, vengeful; warded rejected
  // — its best comp measured 13.8, and a weak reference teaches nothing) and
  // pull the panel mean up toward ~45%.
  const RGE_S = L('dagger_toss', 'swift');
  const BRB_V = L('roar', 'vengeful'), RGE_V = L('dagger_toss', 'vengeful');
  const CLASSIC_REFS: Ref[] = [
    ['bruisers',   ['fighter', 'fighter', 'barbarian', 'barbarian'], [FTR, FTR, BRB, BRB]],
    ['snipers',    ['ranger', 'ranger', 'wizard', 'wizard'],         [RGR, RGR, WIZ, WIZ]],
    ['classic+',   ['fighter', 'barbarian', 'ranger', 'cleric'],     [FTR, BRB, RGR, CLR]],
    ['spellstorm', ['sorcerer', 'sorcerer', 'warlock', 'warlock'],   [SRC, SRC, WLK_D, WLK_D]],
    ['grasp-spin', ['warlock', 'warlock', 'barbarian', 'barbarian'], [WLK_G, WLK_G, BRB, BRB]],
    ['blade-rush', ['rogue', 'rogue', 'sorcerer', 'sorcerer'],       [RGE, RGE, SRC, SRC]],
    ['wardens',    ['cleric', 'cleric', 'wizard', 'wizard'],          [CLR_A, CLR_A, WIZ_S, WIZ_S]],
    // measured 51.2 as a cell vs the 6-panel — well calibrated, adds SWIFT
    ['skirmishers',['ranger', 'ranger', 'rogue', 'rogue'],             [RGR, RGR, RGE_S, RGE_S]],
    // measured 75.0 — a genuine top-tier comp, adds VENGEFUL
    ['vanguard',   ['barbarian', 'barbarian', 'rogue', 'rogue'],       [BRB_V, BRB_V, RGE_V, RGE_V]],
  ];
  const FABLE_REFS: Ref[] = FABLE_TEAMS.map(
    (t) => [t.name, [...t.slugs], fableCustomizations(t)] as Ref,
  );
  const REFS: Ref[] = USE_FABLE_REFS ? FABLE_REFS : CLASSIC_REFS;
  console.log(`  reference panel: ${USE_FABLE_REFS ? 'FABLE (12 shipped rosters)' : 'classic (9 hand-built)'}`);
  interface Cell {
    pair: string; lx: string; ly: string;
    /** SCORE = mean win% across the panel (see note at the push site). */
    wr: number; median: number;
    turns: number; spread: number; worst: number; best: number; beaten: number;
  }
  const cells: Cell[] = [];
  // --csv <path>: dump EVERY cell (owner's analysis format — see AC_REWORK.md
  // "Grid CSV format"): alphabetical pair, first class special/passive, second
  // class special/passive, median + mean vs the 6 refs, then per-ref win%.
  const csvPath = flag('csv');
  const csvRows: string[] = [];
  const pairAgg: Record<string, { w: number; g: number }> = {};
  let errors = 0;
  const distinctErrors = new Set<string>();
  // --pair fighter,warlock limits the scan to one class pair (debug/deep-dive).
  const onlyPair = flag('pair')?.split(',');
  const focusClass = flag('focus');
  // --part N (1-7) runs one disjoint slice so a long grid can be checkpointed
  // and resumed. A pair belongs to the part of whichever of its two classes
  // comes first alphabetically, which partitions the 28 pairs as
  // 7+6+5+4+3+2+1 with no overlap and nothing missed:
  //   1 barbarian  2 cleric  3 fighter  4 ranger  5 rogue  6 sorcerer  7 warlock
  // Every part writes the same CSV header, so parts concatenate directly.
  const PART_CLASSES = [...ALL_CLASSES].sort();
  const partArg = flag('part');
  const part = partArg ? Number(partArg) : null;
  if (part !== null && (!Number.isInteger(part) || part < 1 || part >= PART_CLASSES.length)) {
    console.error(`--part must be 1..${PART_CLASSES.length - 1}`);
    process.exit(1);
  }
  const partOwner = part !== null ? PART_CLASSES[part - 1] : null;
  if (partOwner) console.log(`  PART ${part}/${PART_CLASSES.length - 1}: pairs owned by "${partOwner}"`);
  for (let i = 0; i < ALL_CLASSES.length; i++) {
    for (let j = i + 1; j < ALL_CLASSES.length; j++) {
      const X = ALL_CLASSES[i], Y = ALL_CLASSES[j];
      if (onlyPair && !(onlyPair.includes(X) && onlyPair.includes(Y))) continue;
      // --focus wizard: keep EVERY pair containing that class (8 pairs), a fast
      // slice for judging one class's internal loadout balance without the full grid.
      if (focusClass && X !== focusClass && Y !== focusClass) continue;
      if (partOwner && (X < Y ? X : Y) !== partOwner) continue;
      const pair = `${X}²/${Y}²`;
      pairAgg[pair] = { w: 0, g: 0 };
      const lxs = loadoutsFor(X), lys = loadoutsFor(Y);
      for (const lx of lxs) {
        for (const ly of lys) {
          const custs = [
            { specialSlug: lx.specialSlug, passiveSlug: lx.passiveSlug },
            { specialSlug: lx.specialSlug, passiveSlug: lx.passiveSlug },
            { specialSlug: ly.specialSlug, passiveSlug: ly.passiveSlug },
            { specialSlug: ly.specialSlug, passiveSlug: ly.passiveSlug },
          ];
          const wrs: number[] = [];
          let wSum = 0, gSum = 0, turnSum = 0;
          for (let k = 0; k < REFS.length; k++) {
            const r = runSim([X, X, Y, Y], REFS[k][1], {
              games,
              seed: 70000 + i * 3131 + j * 97 + lxs.indexOf(lx) * 13 + lys.indexOf(ly) + k * 51341,
              p1Customizations: custs,
              p2Customizations: REFS[k][2],
            });
            errors += r.totalValidationErrors;
            for (const e of r.sampleErrors) distinctErrors.add(`[vs ${REFS[k][0]}] ${e}`);
            wrs.push(r.p1WinRate);
            wSum += r.p1Wins; gSum += r.games; turnSum += r.avgTurns;
          }
          // Per-ref results in REFS order, THEN sort a copy for the median.
          const perRef = [...wrs];
          wrs.sort((a, b) => a - b);
          // General median (even count -> mean of the middle two). Reported,
          // but NOT the score: with 9 references the median is a single
          // order statistic, so a BIMODAL cell (crushes 5 refs, gets crushed
          // by 4) reads as its dominant side — the pass-12 top cell scored
          // median 95 on values [0, 7.5, 22.5, 40, 95, 95, 95, 100, 100].
          // The MEAN reflects power across the whole field; sanity-checked by
          // "refs actually beaten": top-20 by mean beat 6.8/9, by median 6.0/9.
          const mid = wrs.length >> 1;
          const median = wrs.length % 2 ? wrs[mid] : (wrs[mid - 1] + wrs[mid]) / 2;
          const meanWr = wSum / gSum;
          cells.push({
            pair, lx: lx.label, ly: ly.label, wr: meanWr, median,
            turns: turnSum / REFS.length, spread: wrs[wrs.length - 1] - wrs[0],
            worst: wrs[0], best: wrs[wrs.length - 1], beaten: wrs.filter((w) => w > 0.5).length,
          });
          pairAgg[pair].w += wSum; pairAgg[pair].g += gSum;
          if (csvPath) {
            const cap = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);
            // Alphabetical pair order; swap loadout columns to match.
            const [c1, l1, c2, l2] = X.localeCompare(Y) <= 0 ? [X, lx, Y, ly] : [Y, ly, X, lx];
            csvRows.push([
              `${cap(c1)}/${cap(c2)}`,
              l1.specialSlug, l1.passiveSlug ?? 'none',
              l2.specialSlug, l2.passiveSlug ?? 'none',
              (median * 100).toFixed(1), ((wSum / gSum) * 100).toFixed(1),
              ...perRef.map((w) => (w * 100).toFixed(1)),
              (turnSum / REFS.length).toFixed(1),
              (wrs[0] * 100).toFixed(1), (wrs[wrs.length - 1] * 100).toFixed(1),
              ((wrs[wrs.length - 1] - wrs[0]) * 100).toFixed(1),
              String(wrs.filter((w) => w > 0.5).length),
            ].join(','));
          }
        }
      }
      const agg = pairAgg[pair];
      console.log(`  ${pair.padEnd(22)} mean ${pct(agg.w / agg.g)}  (81 cells x ${REFS.length} refs done)`);
    }
  }
  console.log(`\n  validation errors: ${errors}`);
  if (distinctErrors.size > 0) {
    console.log('  DISTINCT ERROR SAMPLES:');
    for (const e of [...distinctErrors].slice(0, 20)) console.log(`    ${e}`);
  }
  console.log('\n  PAIR-COMP RANKING (mean over all 81 loadout cells, vs classic):');
  const rank = Object.entries(pairAgg).map(([p2, m]) => ({ p2, wr: m.w / m.g })).sort((a, b) => b.wr - a.wr);
  for (const { p2, wr } of rank) {
    const mark = wr >= 0.62 ? '  ▲ STRONG' : wr <= 0.38 ? '  ▼ WEAK' : '';
    console.log(`    ${p2.padEnd(22)} ${pct(wr)}${mark}`);
  }
  console.log('\n  OUTLIER CELLS (specific loadout combos ≥65% or ≤35%):');
  const outliers = cells.filter((c) => c.wr >= 0.65 || c.wr <= 0.35).sort((a, b) => b.wr - a.wr);
  for (const c of outliers) {
    console.log(`    ${pct(c.wr)}  ${c.pair.padEnd(22)} ${c.lx.padEnd(24)} + ${c.ly}`);
  }
  console.log(`  (${outliers.length} outlier cells of ${cells.length})`);
  if (csvPath) {
    const header = [
      'Team Combination', 'Class 1 Special', 'Class 1 Passive', 'Class 2 Special', 'Class 2 Passive',
      `Median Win % (vs ${REFS.length} refs)`, `Mean Win % (vs ${REFS.length} refs)`,
      ...REFS.map(([n]) => `Win % vs ${n}`),
      'Avg Turns', 'Worst Ref %', 'Best Ref %', 'Spread', `Refs Beaten (of ${REFS.length})`,
    ].join(',');
    writeFileSync(csvPath, header + '\n' + csvRows.join('\n') + '\n');
    console.log(`  CSV written: ${csvPath} (${csvRows.length} rows)`);
  }

  // Per-special best-context report (owner's contextual-balance frame):
  // for each class/special, its best cell, top-5 mean, and cell count.
  // Swinginess diagnostic (owner: wants ~70-80% on a good matchup, not 100%).
  // Tests the alpha-strike hypothesis: if blowout cells finish FASTER than
  // balanced cells, the game is being decided by the opening sequence.
  {
    const hi = cells.filter((c) => c.spread > 0.7);
    const lo = cells.filter((c) => c.spread <= 0.4);
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
    console.log('\n  SWINGINESS DIAGNOSTIC:');
    console.log(`    cells spread>70pts: ${hi.length}  avg turns ${avg(hi.map((c) => c.turns)).toFixed(1)}`);
    console.log(`    cells spread<=40pts: ${lo.length}  avg turns ${avg(lo.map((c) => c.turns)).toFixed(1)}`);
    console.log('    (blowouts finishing FASTER supports alpha-strike snowball)');
  }

  // CLASS CEILING report (owner's lens, 2026-08-03): the grid runs EVERY
  // loadout pair, so most cells are builds nobody would field. Averaging over
  // all 567 cells of a class therefore measures "how good is this class when
  // built badly", which systematically flatters generically-strong classes
  // (Fighter) and punishes synergy-dependent ones (Barbarian, Warlock). Judge
  // classes by their CEILING — the top cells — and by how often they appear in
  // the global top ranks. Do NOT use all-cell means for class balance.
  {
    const sorted = [...cells].sort((a, b) => b.wr - a.wr);
    const rankOf = new Map(sorted.map((c, i) => [c, i + 1]));
    const classes = [...new Set(ALL_CLASSES)];
    console.log('\n  CLASS CEILING (top-10 mean | best cell | cells in global top-50 / top-100):');
    const rows2 = classes.map((cls) => {
      const cap = cls.charAt(0).toUpperCase() + cls.slice(1);
      // cell.pair is built from the LOWERCASE class slugs ("fighter²/rogue²"),
      // so compare lowercase — comparing against the capitalised display name
      // matched nothing and produced NaN.
      const mine = sorted.filter((c) => c.pair.replace(/²/g, '').split('/').includes(cls));
      const top10 = mine.slice(0, 10);
      const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
      return {
        cls: cap,
        top10: avg(top10.map((c) => c.wr)),
        best: mine.length ? mine[0].wr : NaN,
        t50: mine.filter((c) => (rankOf.get(c) ?? 1e9) <= 50).length,
        t100: mine.filter((c) => (rankOf.get(c) ?? 1e9) <= 100).length,
      };
    }).sort((a, b) => b.top10 - a.top10);
    for (const r of rows2) {
      console.log(`    ${r.cls.padEnd(10)} ${pct(r.top10)} | ${pct(r.best)} | ${String(r.t50).padStart(3)} / ${String(r.t100).padStart(3)}`);
    }
  }

  console.log('\n  BEST-CONTEXT BY SPECIAL (max | top-5 mean | cells):');
  const bySpecial: Record<string, number[]> = {};
  for (const c of cells) {
    const [pairX, pairY] = c.pair.replace(/²/g, '').split('/');
    bySpecial[`${pairX}/${c.lx.split('+')[0]}`] ??= [];
    bySpecial[`${pairX}/${c.lx.split('+')[0]}`].push(c.wr);
    bySpecial[`${pairY}/${c.ly.split('+')[0]}`] ??= [];
    bySpecial[`${pairY}/${c.ly.split('+')[0]}`].push(c.wr);
  }
  const rows = Object.entries(bySpecial).map(([k, wrs]) => {
    wrs.sort((a, b) => b - a);
    const top5 = wrs.slice(0, 5);
    return { k, max: wrs[0], top5: top5.reduce((x, y) => x + y, 0) / top5.length, n: wrs.length };
  }).sort((a, b) => b.top5 - a.top5);
  for (const r of rows) {
    console.log(`    ${r.k.padEnd(24)} ${pct(r.max)} | ${pct(r.top5)} | ${r.n}`);
  }
}

/** --dump: print the post-preset shape of named abilities (preset verification). */
function dumpAbilities(slugs: string[]): void {
  console.log('\n  ABILITY DUMP (post-preset):');
  for (const slug of slugs) {
    const a = DEFAULT_ABILITIES.find((x) => x.slug === slug) as unknown as Record<string, unknown>;
    if (!a) { console.log(`    ${slug}: NOT FOUND`); continue; }
    const self = a.selfStatus ? ` self=${JSON.stringify(a.selfStatus)}` : '';
    const xa = (a as { excludeAllies?: boolean }).excludeAllies ? ' EXCLUDE_ALLIES' : ' hits-allies';
    const shp = a.areaRadius ? ` shape=${(a as { areaShape?: string }).areaShape ?? 'chebyshev'} r=${a.areaRadius}` : '';
    console.log(`    ${slug.padEnd(13)} range ${String(a.range).padStart(2)}  ${JSON.stringify(a.effects)}${shp}${self}${xa}`);
  }
}

const presetName = flag('preset');
if (presetName) {
  const preset = PRESETS[presetName];
  if (!preset) {
    console.error(`Unknown preset "${presetName}". Available: ${Object.keys(PRESETS).join(', ')}`);
    process.exit(1);
  }
  applyPreset(preset);
  header(`PRESET ${presetName}`);
  const dump = flag('dump');
  if (dump) dumpAbilities(dump.split(','));
  if (STAGE === 'a' || STAGE === 'all') stageA(1, GAMES);
  if (STAGE === 'b' || STAGE === 'all') stageB(1, GAMES);
  if (STAGE === 'c' || args.includes('--marginals')) stageMarginals(16, 40);
  if (STAGE === 'e' || args.includes('--paircomps')) stagePairComps(Number(flag('cellgames') ?? 40));
} else {
  for (const delta of DELTAS) {
    applyDelta(delta);
    header(`AC DELTA ${delta >= 0 ? '+' : ''}${delta}`);
    if (STAGE === 'a' || STAGE === 'all') stageA(delta, GAMES);
    if (STAGE === 'b' || STAGE === 'all') stageB(delta, GAMES);
  }
}
// Restore pristine values (matters only if this module is ever imported).
applyPreset({ ac: {}, hp: {} }); // dmg/range/heal/statusDur omitted → restored to BASE_* inside
