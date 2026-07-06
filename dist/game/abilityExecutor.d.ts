import { MatchState, UnitInstance, GameEvent, BoardPosition } from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';
export interface ExecutionContext {
    state: MatchState;
    caster: UnitInstance;
    targetPosition: BoardPosition;
    ability: AbilityDefinition;
    events: GameEvent[];
    pushDestination?: BoardPosition;
}
export declare function executeAbility(ctx: ExecutionContext): void;
/** Tick status effects for a single unit (called at the start of that unit's initiative turn). */
export declare function tickUnitStatusEffects(unit: UnitInstance, events: GameEvent[]): void;
/** Tick ability cooldowns for a single unit (called at the end of that unit's initiative turn). */
export declare function tickUnitCooldowns(unit: UnitInstance): void;
/** Reset move/act flags for a single unit (called at the start of that unit's initiative turn). */
export declare function resetUnitTurnFlags(unit: UnitInstance): void;
export declare function tickStatusEffects(state: MatchState, playerId: string, events: GameEvent[]): void;
export declare function tickCooldowns(state: MatchState, playerId: string): void;
export declare function resetTurnFlags(state: MatchState, playerId: string): void;
//# sourceMappingURL=abilityExecutor.d.ts.map