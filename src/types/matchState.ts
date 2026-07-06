import { UUID } from './index.js';

export interface BoardPosition {
  x: number;
  y: number;
}

// The board is an 8x8 grid with the four extreme corners removed (a 60-tile
// cross), so it fits better on a phone screen at the diagonal perspective.
// BOARD_WIDTH was incorrectly 10 for a long time (a leftover from an
// abandoned wider-board idea) — this must stay 8 and stay in lockstep with
// backend/src/ai/geometry.ts's BOARD_SIZE, which is the canonical source
// for corner exclusion.
export const BOARD_WIDTH = 8;
export const BOARD_HEIGHT = 8;

export interface ActiveStatusEffect {
  slug: string;
  turnsRemaining: number;
  stacks: number;
  sourceUnitInstanceId: UUID;
}

export interface UnitInstance {
  instanceId: UUID;
  definitionSlug: string;
  ownerPlayerId: UUID;
  position: BoardPosition;
  currentHealth: number;
  maxHealth: number;
  armorClass: number;
  movementRange: number;
  abilities: string[];
  passives: string[];
  isAlive: boolean;
  hasMovedThisTurn: boolean;
  hasActedThisTurn: boolean;
  cooldowns: Record<string, number>;
  statusEffects: ActiveStatusEffect[];
  fortuneMeter: number;
}

export type MatchPhase = 'action';

export interface InitiativeState {
  /** instanceIds in commitment order; grows 0→8 during round 1, then fixed */
  order: UUID[];
  /** 0-7 current slot index (only meaningful in round 2+) */
  slot: number;
  /** randomly chosen player who commits first in round 1 */
  round1FirstPlayerId: UUID;
  /** which unit must act this turn (null in round 1 — player's choice) */
  activeUnitId: UUID | null;
  /** true while order.length < 8 */
  isRound1: boolean;
}

export interface MatchState {
  board: { width: number; height: number; };
  units: UnitInstance[];
  turnNumber: number;
  /** Full initiative cycles completed (increments each time the order wraps). Charge is unavailable after round 10. */
  roundNumber: number;
  activePlayerId: UUID;
  phase: MatchPhase;
  initiative: InitiativeState;
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
  pushDestination?: BoardPosition;
}

export interface ChargeAction {
  type: 'CHARGE';
  unitInstanceId: UUID;
  destination: BoardPosition;
}

export interface EndTurnAction {
  type: 'END_TURN';
}

export type TurnAction = MoveAction | UseAbilityAction | ChargeAction | EndTurnAction;

export interface TurnResult {
  success: boolean;
  updatedState: MatchState;
  events: GameEvent[];
  matchOver: boolean;
  winnerId: UUID | null;
}

export type GameEventType =
  | 'UNIT_MOVED' | 'ABILITY_USED' | 'DAMAGE_DEALT' | 'HEALING_DONE'
  | 'STATUS_APPLIED' | 'STATUS_REMOVED' | 'STATUS_TICK' | 'UNIT_DIED'
  | 'UNIT_PUSHED' | 'UNIT_PULLED' | 'ATTACK_MISSED' | 'SHIELD_ABSORBED'
  | 'TURN_ENDED' | 'TURN_SKIPPED' | 'MATCH_OVER';

export interface GameEvent {
  type: GameEventType;
  sourceUnitInstanceId?: UUID;
  targetUnitInstanceId?: UUID;
  value?: number;
  position?: BoardPosition;
  statusSlug?: string;
  winnerId?: UUID;
  message?: string;
  abilitySlug?: string;
}
