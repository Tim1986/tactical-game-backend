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
  [PUZZLE_017.id]: PUZZLE_017,
};

/**
 * Daily rotation, in order — the featured puzzle cycles by UTC-day index.
 * Interleaved focus / pull / reach so consecutive days feel different.
 */
export const PUZZLE_ROTATION: PuzzleDefinition[] = [
  PUZZLE_007, // pull  (sorcerer) — v2 PASS, depth 1
  PUZZLE_015, // tempo (ranger)   — v2 PASS, depth 1
  PUZZLE_009, // pull  (ranger)   — v2 PASS, depth 1
  PUZZLE_012, // pull  (sorcerer) — v2 PASS, depth 1
  PUZZLE_013, // pull  (wizard)   — v2 PASS, depth 1
  PUZZLE_016, // free-the-finisher (sorcerer) — v2 PASS, depth 1
  PUZZLE_017, // overkill/knockback (ranger)  — v2 PASS, depth 1
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
