import { MatchState } from '../types/matchState.js';
export interface WinCheckResult {
    isOver: boolean;
    winnerId: string | null;
    loserId: string | null;
}
export declare function checkWinCondition(state: MatchState, playerOneId: string, playerTwoId: string): WinCheckResult;
//# sourceMappingURL=winCondition.d.ts.map