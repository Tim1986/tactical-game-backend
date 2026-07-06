// Re-export all types needed by the AI brain and sim harness.

export type {
  AbilityDefinition,
  AbilityEffect,
  PassiveOption,
  UnitCustomization,
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
  /** All special abilities available at team-build time (default first). */
  specialOptions: string[];
  /** All passive options available at team-build time. */
  passiveOptions: import('../types/index.js').PassiveOption[];
}
