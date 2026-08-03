/**
 * buildPuzzleState.ts — Deterministic MatchState builder for puzzles.
 *
 * Bypasses buildInitialState's round-1 commitment flow entirely: the
 * initiative order is fixed by the puzzle definition and the state starts
 * in round 2+ form (isRound1: false), so the first thing the player does
 * is act with the designated active unit.
 *
 * No randomness anywhere: dodge rolls are pre-scripted by the definition's
 * rollScript (consumed by the engine's rollMisses) and disclosed to the
 * player as fate text.
 */
import type { MatchState } from '../types/matchState.js';
import type { PuzzleDefinition } from './types.js';
export declare const PUZZLE_PLAYER_ID = "puzzle-player";
export declare const PUZZLE_ENEMY_ID = "00000000-0000-0000-0000-000000000001";
/**
 * Build the mid-battle MatchState for a puzzle. Also returns the mapping
 * from PuzzleUnitSpec ids to generated instanceIds (needed for
 * targetUnitId checks and initiative order).
 */
export declare function buildPuzzleState(def: PuzzleDefinition, 
/** Player-chosen specials by spec id (from specialChoices pickers). */
specialOverrides?: Record<string, string>): {
    state: MatchState;
    instanceIdBySpecId: Record<string, string>;
};
/**
 * Evaluate the puzzle goal against a state.
 * Returns 'won' | 'lost' | 'ongoing'. Turn-limit enforcement is the
 * caller's job (runner / solver) — this only reads the board.
 */
export declare function checkPuzzleGoal(def: PuzzleDefinition, state: MatchState, instanceIdBySpecId: Record<string, string>): 'won' | 'lost' | 'ongoing';
//# sourceMappingURL=buildPuzzleState.d.ts.map