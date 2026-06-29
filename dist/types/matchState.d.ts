import { UUID } from './index.js';
export interface BoardPosition {
    x: number;
    y: number;
}
export declare const BOARD_WIDTH = 8;
export declare const BOARD_HEIGHT = 8;
export interface ActiveStatusEffect {
    slug: string;
    turnsRemaining: number;
    stacks: number;
    sourceUnitInstanceId: UUID;
    shieldValue?: number;
}
export interface UnitInstance {
    instanceId: UUID;
    definitionSlug: string;
    ownerPlayerId: UUID;
    position: BoardPosition;
    currentHealth: number;
    maxHealth: number;
    isAlive: boolean;
    hasMovedThisTurn: boolean;
    hasActedThisTurn: boolean;
    cooldowns: Record<string, number>;
    statusEffects: ActiveStatusEffect[];
}
export type MatchPhase = 'action';
export interface MatchState {
    board: {
        width: number;
        height: number;
    };
    units: UnitInstance[];
    turnNumber: number;
    activePlayerId: UUID;
    phase: MatchPhase;
}
export interface MoveAction {
    type: 'MOVE';
    unitInstanceId: UUID;
    destination: BoardPosition;
}
export interface UseAbilityAction {
    type: 'USE_ABILITY';
    unitInstanceId: UUID;
    abilitySlug: string;
    target: BoardPosition;
}
export interface EndTurnAction {
    type: 'END_TURN';
}
export type TurnAction = MoveAction | UseAbilityAction | EndTurnAction;
export interface TurnResult {
    success: boolean;
    updatedState: MatchState;
    events: GameEvent[];
    matchOver: boolean;
    winnerId: UUID | null;
}
export type GameEventType = 'UNIT_MOVED' | 'ABILITY_USED' | 'DAMAGE_DEALT' | 'HEALING_DONE' | 'STATUS_APPLIED' | 'STATUS_REMOVED' | 'STATUS_TICK' | 'UNIT_DIED' | 'UNIT_PUSHED' | 'UNIT_PULLED' | 'SHIELD_ABSORBED' | 'TURN_ENDED' | 'MATCH_OVER';
export interface GameEvent {
    type: GameEventType;
    sourceUnitInstanceId?: UUID;
    targetUnitInstanceId?: UUID;
    value?: number;
    position?: BoardPosition;
    statusSlug?: string;
    winnerId?: UUID;
    message?: string;
}
//# sourceMappingURL=matchState.d.ts.map