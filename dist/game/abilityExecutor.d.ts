import { MatchState, UnitInstance, GameEvent, BoardPosition } from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';
export interface ExecutionContext {
    state: MatchState;
    caster: UnitInstance;
    targetPosition: BoardPosition;
    ability: AbilityDefinition;
    events: GameEvent[];
}
export declare function executeAbility(ctx: ExecutionContext): void;
export declare function tickStatusEffects(state: MatchState, playerId: string, events: GameEvent[]): void;
export declare function tickCooldowns(state: MatchState, playerId: string): void;
export declare function resetTurnFlags(state: MatchState, playerId: string): void;
//# sourceMappingURL=abilityExecutor.d.ts.map