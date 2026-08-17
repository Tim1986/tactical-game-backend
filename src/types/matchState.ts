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
  passiveSlug?: string;
  isAlive: boolean;
  hasMovedThisTurn: boolean;
  hasActedThisTurn: boolean;
  cooldowns: Record<string, number>;
  statusEffects: ActiveStatusEffect[];
  /** CAMPAIGN-ONLY (ENCOUNTER_SPEC A2). 'phasing' moves through blocked tiles
   *  (never ends on them). Arena builds never set this. */
  moveFlags?: string[];
}

/**
 * CAMPAIGN-ONLY resolved objective (ENCOUNTER_SPEC A3). Built by
 * buildEncounterState from the authored ObjectiveSpec with every reference
 * resolved to instance ids. Arena states never carry this — checkWinCondition
 * falls back to classic kill-all when absent (the arena-untouched invariant).
 */
export type ResolvedWinCondition =
  | { kind: 'all_enemies_dead' }
  /** All listed enemy instances dead (boss + adds resolved from enemyKeys). */
  | { kind: 'units_dead'; unitIds: string[] }
  /** Survive: satisfied once round `round` has COMPLETED (roundNumber > round). */
  | { kind: 'round_reached'; round: number }
  | { kind: 'units_at_tiles'; scope: 'any' | 'main' | 'all'; tiles: BoardPosition[]; simultaneous?: boolean }
  /** [A5] An escort instance standing on one of the tiles. */
  | { kind: 'ally_at_tiles'; unitIds: string[]; tiles: BoardPosition[] };

export type ResolvedLossCondition =
  /** [A5] Any listed escort instance dead. */
  | { kind: 'ally_dead'; unitIds: string[] }
  /** Deadline: round `round` completed without a win = loss. */
  | { kind: 'round_reached'; round: number }
  | { kind: 'main_dead' };

export interface ObjectiveState {
  /** The party's (human's) player id and the opposing side's. */
  partyId: UUID;
  enemyId: UUID;
  /** The main character's instance id (scope 'main' conditions). */
  mainId: UUID;
  /** Player-facing objective line for the banner. */
  text: string;
  /** ANY satisfied → party wins. */
  win: ResolvedWinCondition[];
  /** ANY satisfied → party loses. Party wipe is always an implicit loss. */
  loss: ResolvedLossCondition[];
}

/**
 * CAMPAIGN-ONLY static terrain (ENCOUNTER_SPEC A2). Arena states never carry
 * this field — every consumer treats `undefined` as "no terrain" and behaves
 * exactly as before (the arena-untouched invariant).
 */
export interface TerrainState {
  /** Impassable, sight-blocking tiles (walls/pillars). */
  blocked?: BoardPosition[];
  /** Tiles that apply an effect to a unit ENDING a move/displacement on them. */
  hazards?: { pos: BoardPosition; type: 'fire' }[];
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
  /** CAMPAIGN-ONLY board terrain — absent in every arena match (see TerrainState). */
  terrain?: TerrainState;
  /** CAMPAIGN-ONLY objective — absent in every arena match (see ObjectiveState). */
  objective?: ObjectiveState;
  /**
   * Puzzle-only: pre-scripted outcomes for blockable dodge rolls, consumed in
   * order (one entry per roll attempt; multi-hit attacks consume one entry per
   * hit). When the script is exhausted, further rolls HIT deterministically —
   * authors script misses explicitly. Absent in normal matches (random rolls).
   * The script is disclosed to the player as "fate" text on the puzzle intro.
   */
  rollScript?: Array<'hit' | 'miss'>;
  /** Index of the next rollScript entry to consume. */
  rollIndex?: number;
  /**
   * When present, every dodge roll (random OR scripted) appends its result here
   * in order. The offline client sets this to `[]` before a dry-run so it can
   * capture exactly what the engine rolled and replay it at End Turn. Never set
   * server-side, so it has no effect on online play.
   */
  rollLog?: Array<'hit' | 'miss'>;
  /**
   * Roll-on-demand (online): mid-turn scaffolding that must survive between the
   * separate HTTP calls that resolve one action at a time. Set by `beginTurn`,
   * read by `applyAction`/`endTurn`, CLEARED by `endTurn`. The single-shot
   * `processTurn` sets and clears it within one call, so it never appears in
   * that path's output (offline/puzzles/legacy never persist it). Absent means
   * "no turn in progress".
   */
  turnContext?: {
    /** unit committed to act this turn */
    actingUnitId: UUID;
    /** its position at the start of the turn (for the round-11+ drain check) */
    startPos: BoardPosition;
    /** round-1 bare-END_TURN forced commit: skips start/end-of-turn ticks */
    forcedCommit: boolean;
    /** last applied action sequence number (ROD3 idempotency); -1 before any action */
    seq: number;
    /**
     * Every event emitted by this turn's beginTurn/applyAction calls, in order.
     * Accumulated by the ROD service layer so end-turn can persist the FULL
     * turn's events to last_turn_events — without this, the opponent's poll
     * sees only the end-turn residue (ticks, TURN_ENDED) and their combat log
     * and replay silently drop the turn's moves/abilities/pushes/statuses.
     * Dies with the turnContext when endTurn clears it.
     */
    events?: GameEvent[];
  };
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
  | 'UNIT_PUSHED' | 'UNIT_PULLED' | 'PUSH_RESISTED' | 'ATTACK_MISSED' | 'DODGED' | 'SHIELD_ABSORBED'
  | 'TURN_ENDED' | 'TURN_SKIPPED' | 'MATCH_OVER' | 'ENDGAME_STARTED' | 'ENDGAME_DRAIN'
  | 'UNDYING_TRIGGERED' | 'STATUS_RESISTED';

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
  /** Damage attribution for a DAMAGE_DEALT event: the base hit plus each
   *  passive/status modifier that changed it, so the combat log can explain a
   *  number the player would otherwise find inexplicable (e.g. Opportunist's
   *  +4 vs a status-afflicted target). Only present when a modifier applied. */
  damageParts?: { label: string; amount: number }[];
}
