/**
 * puzzles/index.ts — Registry of shipped puzzles + daily rotation.
 *
 * Every puzzle here MUST pass the solver's acceptance bar before shipping:
 *   cd backend && npx tsx src/ai/puzzleSolver.ts <id>
 *
 * The 12 daily puzzles (003–014) span THREE distinct tactical lessons so the
 * rotation doesn't feel samey (owner ruling, 2026-07-27):
 *   - FOCUS-FIRE   — kill the right enemy, ignore the bait the AI grabs.
 *   - REACH        — step into range first, then fire.
 *   - PULL COMBO   — Shadow Grasp yanks a far target into your melee's reach.
 * The rotation interleaves them so consecutive days alternate archetype.
 * puzzle-001 (camouflage special-picker) is also in rotation; puzzle-002 is an
 * expert puzzle — registered/shareable but excluded from the daily rotation.
 */
import type { PuzzleDefinition } from './types.js';
import { PUZZLE_001 } from './puzzles/puzzle-001.js';
import { PUZZLE_002 } from './puzzles/puzzle-002.js';
import { PUZZLE_003 } from './puzzles/puzzle-003.js';
import { PUZZLE_004 } from './puzzles/puzzle-004.js';
import { PUZZLE_005 } from './puzzles/puzzle-005.js';
import { PUZZLE_006 } from './puzzles/puzzle-006.js';
import { PUZZLE_007 } from './puzzles/puzzle-007.js';
import { PUZZLE_008 } from './puzzles/puzzle-008.js';
import { PUZZLE_009 } from './puzzles/puzzle-009.js';
import { PUZZLE_010 } from './puzzles/puzzle-010.js';
import { PUZZLE_011 } from './puzzles/puzzle-011.js';
import { PUZZLE_012 } from './puzzles/puzzle-012.js';
import { PUZZLE_013 } from './puzzles/puzzle-013.js';
import { PUZZLE_014 } from './puzzles/puzzle-014.js';
import { PUZZLE_015 } from './puzzles/puzzle-015.js';
import { PUZZLE_016 } from './puzzles/puzzle-016.js';
import { PUZZLE_017 } from './puzzles/puzzle-017.js';
import { PUZZLE_018 } from './puzzles/puzzle-018.js';
import { PUZZLE_019 } from './puzzles/puzzle-019.js';
import { PUZZLE_020 } from './puzzles/puzzle-020.js';
import { PUZZLE_023 } from './puzzles/puzzle-023.js';
import { PUZZLE_024 } from './puzzles/puzzle-024.js';
import { PUZZLE_025 } from './puzzles/puzzle-025.js';
import { PUZZLE_026 } from './puzzles/puzzle-026.js';
import { PUZZLE_027 } from './puzzles/puzzle-027.js';
import { PUZZLE_028 } from './puzzles/puzzle-028.js';
import { PUZZLE_029 } from './puzzles/puzzle-029.js';
import { PUZZLE_030 } from './puzzles/puzzle-030.js';
import { PUZZLE_031 } from './puzzles/puzzle-031.js';
import { PUZZLE_032 } from './puzzles/puzzle-032.js';
import { PUZZLE_033 } from './puzzles/puzzle-033.js';
import { PUZZLE_034 } from './puzzles/puzzle-034.js';
import { PUZZLE_035 } from './puzzles/puzzle-035.js';
import { PUZZLE_036 } from './puzzles/puzzle-036.js';
import { PUZZLE_039 } from './puzzles/puzzle-039.js';
import { PUZZLE_040 } from './puzzles/puzzle-040.js';
import { PUZZLE_041 } from './puzzles/puzzle-041.js';
import { PUZZLE_042 } from './puzzles/puzzle-042.js';
import { PUZZLE_045 } from './puzzles/puzzle-045.js';
import { PUZZLE_046 } from './puzzles/puzzle-046.js';
import { PUZZLE_047 } from './puzzles/puzzle-047.js';
import { PUZZLE_048 } from './puzzles/puzzle-048.js';
import { PUZZLE_049 } from './puzzles/puzzle-049.js';
import { PUZZLE_022 } from './puzzles/puzzle-022.js';
import { PUZZLE_021 } from './puzzles/puzzle-021.js';

/** Every registered puzzle, keyed by id. */
export const PUZZLES: Record<string, PuzzleDefinition> = {
  [PUZZLE_001.id]: PUZZLE_001, [PUZZLE_002.id]: PUZZLE_002,
  [PUZZLE_003.id]: PUZZLE_003, [PUZZLE_004.id]: PUZZLE_004,
  [PUZZLE_005.id]: PUZZLE_005, [PUZZLE_006.id]: PUZZLE_006,
  [PUZZLE_007.id]: PUZZLE_007, [PUZZLE_008.id]: PUZZLE_008,
  [PUZZLE_009.id]: PUZZLE_009, [PUZZLE_010.id]: PUZZLE_010,
  [PUZZLE_011.id]: PUZZLE_011, [PUZZLE_012.id]: PUZZLE_012,
  [PUZZLE_013.id]: PUZZLE_013, [PUZZLE_014.id]: PUZZLE_014,
  [PUZZLE_015.id]: PUZZLE_015, [PUZZLE_016.id]: PUZZLE_016,
  [PUZZLE_017.id]: PUZZLE_017, [PUZZLE_018.id]: PUZZLE_018,
  [PUZZLE_019.id]: PUZZLE_019, [PUZZLE_020.id]: PUZZLE_020,
  [PUZZLE_021.id]: PUZZLE_021, [PUZZLE_022.id]: PUZZLE_022, [PUZZLE_023.id]: PUZZLE_023,
  [PUZZLE_024.id]: PUZZLE_024, [PUZZLE_025.id]: PUZZLE_025,
  [PUZZLE_026.id]: PUZZLE_026, [PUZZLE_027.id]: PUZZLE_027, [PUZZLE_028.id]: PUZZLE_028, [PUZZLE_029.id]: PUZZLE_029, [PUZZLE_030.id]: PUZZLE_030,
  [PUZZLE_031.id]: PUZZLE_031, [PUZZLE_032.id]: PUZZLE_032,
  [PUZZLE_033.id]: PUZZLE_033, [PUZZLE_034.id]: PUZZLE_034,
  [PUZZLE_035.id]: PUZZLE_035, [PUZZLE_036.id]: PUZZLE_036,
  [PUZZLE_039.id]: PUZZLE_039, [PUZZLE_040.id]: PUZZLE_040,
  [PUZZLE_041.id]: PUZZLE_041, [PUZZLE_042.id]: PUZZLE_042, [PUZZLE_045.id]: PUZZLE_045, [PUZZLE_046.id]: PUZZLE_046, [PUZZLE_047.id]: PUZZLE_047, [PUZZLE_048.id]: PUZZLE_048, [PUZZLE_049.id]: PUZZLE_049,
};

/**
 * Daily rotation, in order — the featured puzzle cycles by UTC-day index.
 * Interleaved focus / pull / reach so consecutive days feel different.
 */
export const PUZZLE_ROTATION: PuzzleDefinition[] = [
  // Interleaved on THREE dimensions (Fable reorder 2026-08-21): family,
  // ANSWER (same answer >= 5 days apart), and axis (pickers spread, 3-turns
  // spread). The previous order appended new entries as a clump — days 12-15
  // ran picker/3-turn/picker with #39 repeating #35's exact answer 3 days
  // later. Keep all three spacings when inserting; do not append.
  //
  // Answer tally, 28 entries: grasp 6 · freeze 6 · arrow-the-blocker 4 ·
  // pinning-the-healer 2 · purify 2 · bolt-the-blocker 2 · longshot-blocker 1 ·
  // longshot-healer 1 · longshot-far 1 · cold_snap 1 · ignore-free-kill 1 ·
  // sword 1.
  // CLOSED answers (do not author more): freeze · grasp · purify.
  // PICKERS: #1 #16 #24 #30 #32 #34 #39 #40 — 8 of 31 after the camouflage
  // sweep (2026-08-31) retrofitted #16 (cleric), #30 (warlock) and #32
  // (wizard). Hosts are now ranger x4, cleric, warlock, wizard — the ranger
  // bow picker is no longer the only shape a picker takes. Piercing is still
  // ALWAYS a decoy and must be an ANSWER somewhere before the picker returns
  // to the ranger. Every retrofit keeps the #24 rule: the DEFAULT loadout is
  // the most tempting DECOY, never the answer.
  // 3-TURN: #33 #34 #36 #45 #46 #47 #48 #49 — 8 of 36.
  // FATE: #41 #42 — the only non-Tier-0 puzzles. The disclosure banner is
  // itself a tell, so they are SPACED (a blocked-path puzzle sits between
  // them). #41 spends a scripted MISS, #42 protects a scripted HIT — never
  // schedule two of the same facet together.
  PUZZLE_007, // pull                 → grasp
  PUZZLE_015, // tempo/heal           → freeze
  PUZZLE_019, // blocked path         → arrow (the blocker)
  PUZZLE_033, // 3-TURN eliminate_all → longshot (the HEALER first)
  PUZZLE_031, // free-the-rooted      → purify (near-clone of #16, spaced from it)
  PUZZLE_017, // overkill/knockback   → sword (the weaker attack)
  PUZZLE_009, // pull                 → grasp
  PUZZLE_023, // tempo/self-heal      → freeze
  PUZZLE_040, // blocked path +PICKER → longshot the blocker (1 of 3)
  PUZZLE_018, // friendly fire        → arrow (the weaker shot)
  PUZZLE_032, // passive synergy +PICKER → cold_snap (default Ring of Frost is showier)
  PUZZLE_012, // pull                 → grasp
  PUZZLE_025, // tempo/heal           → freeze
  PUZZLE_036, // 3-TURN eliminate_all → longshot the FAR one (assign the reach)
  PUZZLE_022, // blocked path         → arrow (the REACHABLE door)
  PUZZLE_024, // camouflage +PICKER   → grasp (default is a decoy)
  PUZZLE_027, // tempo/self-heal      → freeze
  PUZZLE_035, // tempo/heal           → pinning the healer OUT OF RANGE
  PUZZLE_021, // blocked path         → bolt (the blocker)
  PUZZLE_013, // pull                 → grasp
  PUZZLE_028, // tempo/heal           → freeze
  PUZZLE_034, // 3-TURN +PICKER       → ignore the free kill (longshot among decoys)
  PUZZLE_026, // blocked path         → arrow (the blocker)
  PUZZLE_016, // free-the-finisher +PICKER → purify (default Heal is the big number)
  PUZZLE_020, // tempo/self-heal      → freeze
  PUZZLE_030, // pull        +PICKER  → grasp (default Drain out-damages it)
  PUZZLE_039, // tempo/heal +PICKER   → pinning the healer (1 of 3)
  PUZZLE_029, // friendly fire        → bolt (the weaker shot)
  PUZZLE_045, // 3-TURN eliminate_all → LEAVE the burning one alone (restraint)
  PUZZLE_022, // blocked path         → arrow (spacer: keep the two 'free kill' puzzles apart)
  PUZZLE_046, // 3-TURN eliminate_all → walk PAST the free kill (the cost is ground)
  PUZZLE_028, // tempo/heal           → freeze (spacer)
  PUZZLE_047, // 3-TURN status EXPIRY → hold the shot until Weakened wears off
  PUZZLE_021, // blocked path         → bolt (spacer)
  PUZZLE_048, // 3-TURN ORDER TRAP    → kill the HEALER first, not the free kill
  PUZZLE_012, // pull                 → grasp (spacer)
  PUZZLE_049, // 3-TURN SAVE YOUR OWN → shoot the Cur; the archer alone is not enough
  PUZZLE_041, // FATE QUEUE           → strike the bystander to spend the miss
  PUZZLE_026, // blocked path         → arrow (spacer: no two fate puzzles adjacent)
  PUZZLE_042, // FATE QUEUE           → freeze to deny the enemy a DIE
];

/**
 * ROTATION SHORTENED TO THE v2-PASSING SET (owner ruling 2026-08-19): a short
 * rotation of good puzzles beats a long one padded with arithmetic. Every entry
 * above passes the v2 bar — goal-greedy fails, min win depth >= 1.
 *
 * OFF the rotation, still REGISTERED (the solver keeps scoring them and old
 * share links still resolve):
 *
 *   UNSOLVABLE — never re-add without a solver re-run:
 *     PUZZLE_005 ("Concentrate Fire", target 21 HP)
 *     PUZZLE_010 ("One Step Closer",  target 22 HP) Both were authored 2026-07-27 with the target's HP set to the
 * exact sum of available player damage; pass21 balance values shipped into
 * gameData 2026-08-05 (a4c2bed), damage numbers moved, and an exact-sum puzzle
 * dies the moment any value shifts by one.
 *   ARITHMETIC (v2 depth 0 — the goal-greedy player solves them by counting):
 *     PUZZLE_003, PUZZLE_004, PUZZLE_006, PUZZLE_008, PUZZLE_011, PUZZLE_014
 *   MUDDY special-combo shapes:
 *     PUZZLE_001, PUZZLE_002
 *
 * PZ3 replaces the arithmetic six; as each replacement passes the bar it joins
 * the array above. See GAMEPLAN PZ3/PZ-BROKEN and PUZZLES_AND_INVITES.md.
 *
 * Standing rule this established: re-run `npx tsx src/ai/puzzleSolver.ts`
 * after ANY gameData balance change.
 */

const MS_PER_DAY = 86_400_000;

/**
 * The puzzle featured on a given UTC calendar day. Deterministic worldwide:
 * the index is the UTC day number modulo the rotation length, so every player
 * sees the same puzzle on the same date.
 */
export function getDailyPuzzle(date: Date = new Date()): PuzzleDefinition {
  const dayIndex = Math.floor(date.getTime() / MS_PER_DAY);
  const n = PUZZLE_ROTATION.length;
  return PUZZLE_ROTATION[((dayIndex % n) + n) % n];
}

/** The puzzle currently featured (today's daily). */
export const CURRENT_PUZZLE: PuzzleDefinition = getDailyPuzzle();
