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

/** Every registered puzzle, keyed by id. */
export const PUZZLES: Record<string, PuzzleDefinition> = {
  [PUZZLE_001.id]: PUZZLE_001, [PUZZLE_002.id]: PUZZLE_002,
  [PUZZLE_003.id]: PUZZLE_003, [PUZZLE_004.id]: PUZZLE_004,
  [PUZZLE_005.id]: PUZZLE_005, [PUZZLE_006.id]: PUZZLE_006,
  [PUZZLE_007.id]: PUZZLE_007, [PUZZLE_008.id]: PUZZLE_008,
  [PUZZLE_009.id]: PUZZLE_009, [PUZZLE_010.id]: PUZZLE_010,
  [PUZZLE_011.id]: PUZZLE_011, [PUZZLE_012.id]: PUZZLE_012,
  [PUZZLE_013.id]: PUZZLE_013, [PUZZLE_014.id]: PUZZLE_014,
};

/**
 * Daily rotation, in order — the featured puzzle cycles by UTC-day index.
 * Interleaved focus / pull / reach so consecutive days feel different.
 */
export const PUZZLE_ROTATION: PuzzleDefinition[] = [
  PUZZLE_003, // focus  (wizard)
  PUZZLE_007, // pull   (sorcerer)
  PUZZLE_008, // reach  (wizard)
  PUZZLE_004, // focus  (ranger)
  PUZZLE_009, // pull   (ranger)
  PUZZLE_010, // reach  (sorcerer)
  PUZZLE_005, // focus  (barbarian)
  PUZZLE_012, // pull   (sorcerer)
  PUZZLE_011, // reach  (barbarian)
  PUZZLE_006, // focus  (fighter)
  PUZZLE_013, // pull   (wizard)
  PUZZLE_014, // focus  (warlock)
  PUZZLE_001, // camouflage picker
];

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
