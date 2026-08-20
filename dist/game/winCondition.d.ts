import { MatchState } from '../types/matchState.js';
export interface WinCheckResult {
    isOver: boolean;
    winnerId: string | null;
    loserId: string | null;
    /** CAMPAIGN objectives only: player-facing reason ("The deadline passed"). */
    reason?: string;
}
/**
 * Match-over check. Arena (no state.objective): classic mutual kill-all,
 * byte-identical to the original implementation. Campaign encounters with an
 * objective evaluate ENCOUNTER_SPEC A3 semantics:
 *   - party wipe is always an implicit loss;
 *   - WIN conditions are checked before LOSS conditions (a simultaneous
 *     win+loss resolves as a WIN — player-favoring tie, owner call);
 *   - enemy wipe is a mercy win even when kill-all isn't listed: with nothing
 *     left to oppose the party, no remaining condition can be stopped.
 *     (Revisit at A4 — pending waves/rooms must suppress the mercy rule.)
 */
export declare function checkWinCondition(state: MatchState, playerOneId: string, playerTwoId: string): WinCheckResult;
//# sourceMappingURL=winCondition.d.ts.map