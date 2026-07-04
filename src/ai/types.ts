// Re-export all types needed by the AI brain and sim harness.

export type {
  AbilityDefinition,
  AbilityEffect,
} from '../types/index.js';

export type {
  MatchState,
  UnitInstance,
  TurnAction,
  BoardPosition,
  MoveAction,
  UseAbilityAction,
  ChargeAction,
  EndTurnAction,
  ActiveStatusEffect,
  GameEvent,
  GameEventType,
  TurnResult,
} from '../types/matchState.js';

export interface UnitDefinition {
  slug: string;
  maxHealth: number;
  armorClass: number;
  movementRange: number;
  abilities: string[];
  passives: string[];
}
