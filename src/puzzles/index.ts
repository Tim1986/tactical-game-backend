/**
 * puzzles/index.ts — Registry of shipped puzzles.
 *
 * Every puzzle here MUST pass the solver's acceptance bar before shipping:
 *   cd backend && npx tsx src/ai/puzzleSolver.ts <id>
 */
import type { PuzzleDefinition } from './types.js';
import { PUZZLE_001 } from './puzzles/puzzle-001.js';

export const PUZZLES: Record<string, PuzzleDefinition> = {
  [PUZZLE_001.id]: PUZZLE_001,
};

/** The puzzle currently featured on the home page (daily rotation later). */
export const CURRENT_PUZZLE: PuzzleDefinition = PUZZLE_001;
