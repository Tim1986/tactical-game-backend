import { MatchState, TurnAction, TurnResult } from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';
export declare class TurnValidationError extends Error {
    constructor(message: string);
}
export declare function processTurn(state: MatchState, submittedActions: TurnAction[], submittingPlayerId: string, playerOneId: string, playerTwoId: string, abilityMap: Map<string, AbilityDefinition>): TurnResult;
export declare function generateInstanceId(): string;
//# sourceMappingURL=turnProcessor.d.ts.map