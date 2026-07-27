/**
 * puzzles/index.ts — Registry of shipped puzzles + daily rotation.
 *
 * Every puzzle here MUST pass the solver's acceptance bar before shipping:
 *   cd backend && npx tsx src/ai/puzzleSolver.ts <id>
 *
 * NOTE (2026-07-27): puzzle-003..006 are authored & solver-verified but held
 * back from this build — the owner deferred the new puzzle batch pending more
 * mechanic variety (see GAMEPLAN.md C10). Their files remain in the repo but
 * are intentionally NOT imported/registered here, so they are neither bundled
 * nor shown. Re-add them (and 007–014) when C10 resumes.
 */
import type { PuzzleDefinition } from './types.js';
import { PUZZLE_001 } from './puzzles/puzzle-001.js';
import { PUZZLE_002 } from './puzzles/puzzle-002.js';

/** Every registered puzzle, keyed by id. */
export const PUZZLES: Record<string, PuzzleDefinition> = {
  [PUZZLE_001.id]: PUZZLE_001,
  [PUZZLE_002.id]: PUZZLE_002,
};

/**
 * Daily rotation, in order. The featured puzzle cycles by UTC-day index.
 * ONLY newbie-graspable dailies belong here (see PUZZLES_AND_INVITES.md
 * "The two poles"). puzzle-002 is an expert puzzle — registered/shareable but
 * excluded from rotation. Until the varied batch lands, the rotation is just
 * the one shipped daily.
 */
export const PUZZLE_ROTATION: PuzzleDefinition[] = [
  PUZZLE_001,
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
