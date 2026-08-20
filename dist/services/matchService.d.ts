import { MatchState, TurnAction, GameEvent, MoveAction, ChargeAction, UseAbilityAction } from '../types/matchState.js';
import { processTurn, TurnValidationError } from '../game/turnProcessor.js';
import { FABLE_PLAYER_ID, FABLE_HP_SCALE } from '../game/initialState.js';
export { FABLE_PLAYER_ID };
export declare class MatchNotFoundError extends Error {
    constructor();
}
export declare class MatchAccessError extends Error {
    constructor();
}
export declare class MatchNotActiveError extends Error {
    constructor();
}
export declare class NotYourTurnError extends Error {
    constructor();
}
export declare class SeqMismatchError extends Error {
    constructor(expected: number, got: number);
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
    last_turn_events: unknown[];
    elo_delta_p1: number | null;
    elo_delta_p2: number | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    is_pve: boolean;
    is_ranked: boolean;
}
export type FableDifficulty = keyof typeof FABLE_HP_SCALE;
export declare function createPveMatch(humanPlayerId: string, humanTeamId: string, fableTeamId: string, difficulty?: FableDifficulty): Promise<{
    matchId: string;
    state: MatchState;
}>;
export declare function createMatch(playerOneId: string, playerTwoId: string, playerOneTeamId: string, playerTwoTeamId: string, turnDeadlineHours: number, isRanked?: boolean): Promise<{
    matchId: string;
    state: MatchState;
}>;
export declare function getMatch(matchId: string, requestingUserId: string): Promise<MatchRow>;
export declare function getMatchWithPlayers(matchId: string, requestingUserId: string): Promise<{
    match: MatchRow;
    playerOneUsername: string;
    playerTwoUsername: string;
}>;
export declare function getUserMatches(userId: string): Promise<(MatchRow & {
    player_one_username: string;
    player_two_username: string;
})[]>;
export declare function submitTurn(matchId: string, submittingPlayerId: string, actions: TurnAction[]): Promise<{
    result: ReturnType<typeof processTurn>;
    match: MatchRow;
}>;
export declare function submitRodAction(matchId: string, submittingPlayerId: string, action: MoveAction | ChargeAction | UseAbilityAction, seq: number): Promise<{
    events: GameEvent[];
    updatedState: MatchState;
    matchOver: boolean;
    winnerId: string | null;
}>;
export declare function submitRodEndTurn(matchId: string, submittingPlayerId: string): Promise<{
    events: GameEvent[];
    updatedState: MatchState;
    matchOver: boolean;
    winnerId: string | null;
    match: MatchRow;
}>;
export declare function forfeitMatch(matchId: string, forfeitingPlayerId: string): Promise<void>;
export declare function getTurnHistory(matchId: string, requestingUserId: string): Promise<unknown[]>;
//# sourceMappingURL=matchService.d.ts.map