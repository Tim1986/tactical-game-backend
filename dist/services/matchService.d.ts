import { MatchState, TurnAction } from '../types/matchState.js';
import { processTurn, TurnValidationError } from '../game/turnProcessor.js';
export declare class MatchNotFoundError extends Error {
    constructor();
}
export declare class MatchAccessError extends Error {
    constructor();
}
export declare class MatchNotActiveError extends Error {
    constructor();
}
export { TurnValidationError };
interface MatchRow {
    id: string;
    player_one_id: string;
    player_two_id: string;
    player_one_team: string;
    player_two_team: string;
    status: string;
    active_player_id: string;
    turn_number: number;
    turn_deadline: string | null;
    winner_id: string | null;
    match_state: MatchState;
    elo_delta_p1: number | null;
    elo_delta_p2: number | null;
    created_at: string;
    completed_at: string | null;
}
export declare function createMatch(playerOneId: string, playerTwoId: string, playerOneTeamId: string, playerTwoTeamId: string, turnDeadlineHours: number): Promise<{
    matchId: string;
    state: MatchState;
}>;
export declare function getMatch(matchId: string, requestingUserId: string): Promise<MatchRow>;
export declare function getUserMatches(userId: string): Promise<MatchRow[]>;
export declare function submitTurn(matchId: string, submittingPlayerId: string, actions: TurnAction[]): Promise<{
    result: ReturnType<typeof processTurn>;
    match: MatchRow;
}>;
export declare function forfeitMatch(matchId: string, forfeitingPlayerId: string): Promise<void>;
export declare function getTurnHistory(matchId: string, requestingUserId: string): Promise<unknown[]>;
//# sourceMappingURL=matchService.d.ts.map