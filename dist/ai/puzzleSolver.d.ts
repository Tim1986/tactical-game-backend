/**
 * puzzleSolver.ts — Authoring/verification tool for daily puzzles.
 *
 * Exhaustively searches the player's legal turn sequences (with OptimalBrain
 * playing every enemy reply) and reports whether a puzzle meets the
 * "tricky but fair" acceptance bar from PUZZLES_AND_INVITES.md:
 *
 *   1. Solvable: at least one line achieves the goal in maxPlayerTurns.
 *   2. Winning first moves ≤ 2 (ideally 1 — "only move" puzzles feel best).
 *   3. The greedy line (OptimalBrain playing the player side) does NOT win.
 *   4. Random lines win < 5% (the enemy can't simply be out-statted).
 *
 * Everything is deterministic (pinned fortune meters), so this is a plain
 * game-tree walk — no sampling needed except for the random-line check.
 *
 * Legality: candidates are enumerated generously and validated by running
 * them through the real processTurn (which throws TurnValidationError on
 * illegal input). The engine is the single legality oracle — this file
 * contains no movement/targeting rules of its own.
 *
 * CLI:  npx tsx src/ai/puzzleSolver.ts            (solves all registered puzzles)
 *       npx tsx src/ai/puzzleSolver.ts puzzle-001 (one puzzle)
 */
import type { MatchState, TurnAction } from '../types/matchState.js';
import type { PuzzleDefinition } from '../puzzles/types.js';
/** Enumerate all candidate turns (action lists) for the active player unit. */
export declare function enumeratePlayerTurns(state: MatchState): TurnAction[][];
export interface SolverReport {
    puzzleId: string;
    solvable: boolean;
    legalFirstMoves: number;
    /** Raw count — every retreat-tile variant counts separately. */
    winningFirstMoves: number;
    /** Distinct first IDEAS: deduped by core action (ability+target, or move
     *  destination for pure-move plans). The acceptance bar uses this — ten
     *  retreat tiles after the same killing blow are one idea, not ten. */
    winningFirstIdeas: number;
    /** Human-readable description of each winning first idea. */
    winningFirstMoveDescriptions: string[];
    greedyWins: boolean;
    /** v2: a goal-AWARE greedy player (the human's first attempt) wins. Fatal. */
    goalGreedyWins: boolean;
    /** v2: fewest non-greedy moves any winning line needs. 0 = arithmetic. */
    minWinDepth: number;
    /** v2: lowest goal HP reached by a non-winning line (<= 4 = "so close"). */
    nearMissRemaining: number;
    randomWinRate: number;
    randomTrials: number;
    passes: boolean;
    failures: string[];
    warnings: string[];
}
export declare function solvePuzzle(def: PuzzleDefinition, randomTrials?: number, 
/** Player special selections (from specialChoices) to solve under. */
specialOverrides?: Record<string, string>): SolverReport;
//# sourceMappingURL=puzzleSolver.d.ts.map