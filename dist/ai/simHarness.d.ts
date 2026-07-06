/**
 * simHarness.ts — In-memory match simulator for DungeonCombat. (v2)
 *
 * Runs N full matches between two AIBrain instances using the real game engine
 * (processTurn). No database required — unit/ability data comes from defaultData.ts.
 *
 * Usage (CLI):
 *   npx tsx src/ai/simHarness.ts fighter,barbarian,ranger,rogue vs wizard,cleric,sorcerer,warlock
 *   npx tsx src/ai/simHarness.ts fighter,barbarian,ranger,rogue vs wizard,cleric,sorcerer,warlock --games 200
 *   ... --verbose          log every validation error with the offending action payload
 *
 * v3 changes:
 *   - ROUND 1 PRE-FLIGHT (per V3 feedback, Bug A): when every uncommitted
 *     unit for the active player is frozen or dead, the harness commits one
 *     directly to initiative.order WITHOUT calling the engine — the engine
 *     rejects every per-unit action for such units, so this path must not
 *     count as a validation error.
 *   - Balance analytics: Wilson 95% CI on win rate, per-slug special-usage
 *     and death-turn stats, first-blood turn, first-mover win rate.
 *
 * v2 changes:
 *   - Validation errors are COUNTED and SAMPLED, not silently swallowed —
 *     they indicate brain/engine disagreements and hide regressions if unseen.
 *   - Consecutive-error abort: a match stuck in an error loop ends as a
 *     flagged draw after 20 back-to-back validation errors instead of
 *     burning the whole turn budget.
 *   - First player alternates deterministically across games (even game
 *     index → P1 first), halving first-mover variance vs a coin flip.
 *   - Per-slug survival rates in SimResult (which units live through games).
 *   - Draw diagnostics: lone-survivor draws counted separately — the
 *     kiting-endgame signature to watch.
 *   - Turn-limit draw block uses p1Id/p2Id params (was hardcoded 'p1'/'p2',
 *     breaking stats for custom player ids).
 *   - Round 1→2 interleave sized by team length instead of hardcoded 4.
 */
import { TurnValidationError } from '../game/turnProcessor.js';
import { AIBrain } from './aiBrain.js';
import { MatchState } from '../types/matchState.js';
import { AbilityDefinition, UnitCustomization } from '../types/index.js';
export interface MatchResult {
    winnerId: string | null;
    winnerSide: 'p1' | 'p2' | 'draw';
    turns: number;
    survivingUnits: {
        p1: number;
        p2: number;
    };
    totalHpRemaining: {
        p1: number;
        p2: number;
    };
    /** Slugs of surviving units per side (for per-slug survival stats). */
    survivingSlugs: {
        p1: string[];
        p2: string[];
    };
    /** Validation errors recovered during this match (should be ~0). */
    validationErrors: number;
    /** Match ended by the consecutive-error circuit breaker. */
    abortedByErrorLoop: boolean;
    /** Draw where one side was down to a single surviving unit (kiting signature). */
    loneSurvivorDraw: boolean;
    /** Which player took the first Round 1 turn. */
    firstPlayerId: string;
    /** Turn number of the first kill (null if nobody died). */
    firstBloodTurn: number | null;
    /** Every death: which unit slug died on which turn. */
    deaths: {
        slug: string;
        turn: number;
    }[];
    /** Slugs of units whose once-per-game special was spent (see caveat in code). */
    specialsSpent: string[];
}
export interface SimResult {
    p1Slugs: string[];
    p2Slugs: string[];
    games: number;
    p1Wins: number;
    p2Wins: number;
    draws: number;
    loneSurvivorDraws: number;
    p1WinRate: number;
    avgTurns: number;
    avgSurvivors: {
        p1: number;
        p2: number;
    };
    /** slug → fraction of its appearances that survived to game end. */
    unitSurvivalRates: Record<string, number>;
    /** Total validation errors recovered across all games (watch this — should be 0). */
    totalValidationErrors: number;
    /** Games aborted by the error circuit breaker. */
    abortedGames: number;
    /** First few distinct validation error messages, for diagnosis. */
    sampleErrors: string[];
    /** Wilson 95% confidence interval on p1WinRate — trust deltas, not points. */
    p1WinRateCI: [number, number];
    /** Fraction of games won by whichever side took the first turn. */
    firstMoverWinRate: number;
    /** slug → fraction of appearances that spent their special before game end. */
    specialUsageRates: Record<string, number>;
    /** slug → average turn of death, among appearances that died. */
    avgDeathTurn: Record<string, number>;
    /** Average turn of the first kill (games with at least one kill). */
    avgFirstBloodTurn: number | null;
}
export interface MatchOptions {
    p1Id?: string;
    p2Id?: string;
    forceFirstPlayerId?: string;
    /** Per-slot special/passive loadout for each team (parallel to p1Slugs/p2Slugs). Omit for default loadouts. */
    p1Customizations?: (UnitCustomization | undefined)[];
    p2Customizations?: (UnitCustomization | undefined)[];
    /** Called on every recovered validation error (for logging/diagnosis). */
    onValidationError?: (err: TurnValidationError, actions: unknown[], state: MatchState) => void;
}
export declare function runMatch(p1Slugs: string[], p2Slugs: string[], abilityMap: Map<string, AbilityDefinition>, brain1: AIBrain, brain2: AIBrain, options?: MatchOptions): MatchResult;
export declare function runSim(p1Slugs: string[], p2Slugs: string[], options?: {
    games?: number;
    brain1?: AIBrain;
    brain2?: AIBrain;
    abilityMap?: Map<string, AbilityDefinition>;
    /** Per-slot special/passive loadout for each team (parallel to p1Slugs/p2Slugs), held constant across all games. Omit for default loadouts. */
    p1Customizations?: (UnitCustomization | undefined)[];
    p2Customizations?: (UnitCustomization | undefined)[];
    /** Log every recovered validation error with its action payload. */
    verbose?: boolean;
    /**
     * 'alternate' (default): P1 goes first in even-indexed games — removes
     * first-mover bias deterministically. 'random': engine coin flip.
     */
    firstPlayerMode?: 'alternate' | 'random';
}): SimResult;
//# sourceMappingURL=simHarness.d.ts.map