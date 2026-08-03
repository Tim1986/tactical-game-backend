/**
 * puzzles/index.ts — Registry of shipped puzzles.
 *
 * Every puzzle here MUST pass the solver's acceptance bar before shipping:
 *   cd backend && npx tsx src/ai/puzzleSolver.ts <id>
 */
import type { PuzzleDefinition } from './types.js';
export declare const PUZZLES: Record<string, PuzzleDefinition>;
/** The puzzle currently featured on the home page (daily rotation later). */
export declare const CURRENT_PUZZLE: PuzzleDefinition;
//# sourceMappingURL=index.d.ts.map