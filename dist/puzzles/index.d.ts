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
/** Every registered puzzle, keyed by id. */
export declare const PUZZLES: Record<string, PuzzleDefinition>;
/**
 * Daily rotation, in order — the featured puzzle cycles by UTC-day index.
 * Interleaved focus / pull / reach so consecutive days feel different.
 */
export declare const PUZZLE_ROTATION: PuzzleDefinition[];
/**
 * The puzzle featured on a given UTC calendar day. Deterministic worldwide:
 * the index is the UTC day number modulo the rotation length, so every player
 * sees the same puzzle on the same date.
 */
export declare function getDailyPuzzle(date?: Date): PuzzleDefinition;
/** The puzzle currently featured (today's daily). */
export declare const CURRENT_PUZZLE: PuzzleDefinition;
//# sourceMappingURL=index.d.ts.map