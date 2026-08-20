import { MatchState, TurnAction, MoveAction, UseAbilityAction, ChargeAction, TurnResult } from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';
export declare class TurnValidationError extends Error {
    constructor(message: string);
}
/** Round 1 = turns 1–8, round 2 = turns 9–16, etc. (dead-unit skips still count). */
export declare function roundFromTurn(turnNumber: number): number;
export declare function processTurn(state: MatchState, submittedActions: TurnAction[], submittingPlayerId: string, playerOneId: string, playerTwoId: string, abilityMap: Map<string, AbilityDefinition>): TurnResult;
/** Open a turn: establish the acting unit + run start-of-turn effects ONCE.
 *  `firstAction` names the acting unit (round 1) / is validated against the
 *  predetermined unit (round 2+); pass null for a bare-END_TURN forced commit. */
export declare function beginTurn(state: MatchState, firstAction: MoveAction | ChargeAction | UseAbilityAction | null, submittingPlayerId: string, playerOneId: string, playerTwoId: string): TurnResult;
/** Resolve ONE action against the open turn. The server rolls here. */
export declare function applyAction(state: MatchState, action: MoveAction | ChargeAction | UseAbilityAction, submittingPlayerId: string, playerOneId: string, playerTwoId: string, abilityMap: Map<string, AbilityDefinition>): TurnResult;
/** Finalize the open turn and advance initiative. */
export declare function endTurn(state: MatchState, submittingPlayerId: string, playerOneId: string, playerTwoId: string): TurnResult;
export declare function generateInstanceId(): string;
//# sourceMappingURL=turnProcessor.d.ts.map