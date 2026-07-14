/**
 * initialState.ts — Pure engine helpers for building a fresh MatchState.
 *
 * Extracted from matchService.ts so the mobile app can import this without
 * pulling in any server dependencies (Postgres, auth, etc.).
 * No external dependencies — works in both Node.js and React Native.
 */

import {
  MatchState, UnitInstance, InitiativeState, BoardPosition,
  BOARD_WIDTH, BOARD_HEIGHT,
} from '../types/matchState.js';
import { UnitDefinition, UnitCustomization } from '../types/index.js';

export const FABLE_PLAYER_ID = '00000000-0000-0000-0000-000000000001';
export const FABLE_HP_SCALE = { easy: 0.8, medium: 0.9, hard: 1.0 } as const;
export type FableDifficulty = keyof typeof FABLE_HP_SCALE;

// Simple ID generator — no external dependency so this file is RN-compatible.
// IDs are unique within a session; format doesn't matter (stored as JSON).
let _idSeq = 0;
export function newInstanceId(): string {
  return `i${Date.now().toString(36)}_${(++_idSeq).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function buildUnitInstance(
  def: UnitDefinition,
  ownerId: string,
  position: BoardPosition,
  customization?: UnitCustomization,
): UnitInstance {
  const basicSlug = def.abilities.find((s) => !def.specialOptions.includes(s)) ?? def.abilities[0];
  const specialSlug = customization?.specialSlug ?? def.specialOptions[0] ?? def.abilities[1];
  const abilities = basicSlug && specialSlug ? [basicSlug, specialSlug] : def.abilities;

  const passive = customization?.passiveSlug
    ? def.passiveOptions.find((p) => p.slug === customization.passiveSlug)
    : undefined;
  const maxHealth = def.maxHealth + (passive?.stat === 'maxHealth' ? (passive.value ?? 0) : 0);
  const armorClass = (def.armorClass ?? 10) + (passive?.stat === 'armorClass' ? (passive.value ?? 0) : 0);
  const movementRange = def.movementRange + (passive?.stat === 'movementRange' ? (passive.value ?? 0) : 0);
  const passives = passive?.passiveFlag ? [...def.passives, passive.passiveFlag] : def.passives;

  const cooldowns: Record<string, number> = {};
  for (const slug of abilities) cooldowns[slug] = 0;

  const instanceId = newInstanceId();
  const initialStatuses = passives.includes('warded')
    ? [{ slug: 'shielded', turnsRemaining: 99, stacks: 1, sourceUnitInstanceId: instanceId }]
    : [];

  return {
    instanceId, definitionSlug: def.slug, ownerPlayerId: ownerId,
    position, currentHealth: maxHealth, maxHealth,
    armorClass, movementRange,
    abilities, passives,
    isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
    cooldowns, statusEffects: initialStatuses,
    fortuneMeter: Math.random(),
  };
}

export function buildInitialState(
  playerOneId: string,
  playerTwoId: string,
  p1Units: UnitDefinition[],
  p2Units: UnitDefinition[],
  p1Placement: BoardPosition[],
  p2Placement: BoardPosition[],
  forceFirstPlayerId?: string,
  p1Customizations?: UnitCustomization[],
  p2Customizations?: UnitCustomization[],
  fableHpScale = 1,
): MatchState {
  const p1Fallback: BoardPosition[] = [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }];
  const p2Fallback: BoardPosition[] = [{ x: 6, y: 0 }, { x: 6, y: 2 }, { x: 6, y: 4 }, { x: 6, y: 6 }];
  const p1Positions = p1Placement.length >= p1Units.length ? p1Placement : p1Fallback;
  const p2Raw       = p2Placement.length >= p2Units.length ? p2Placement : p2Fallback;
  const p2Positions = p2Raw.map(pos => ({ x: 7 - pos.x, y: pos.y }));

  const units: UnitInstance[] = [
    ...p1Units.map((def, i) => buildUnitInstance(def, playerOneId, p1Positions[i], p1Customizations?.[i])),
    ...p2Units.map((def, i) => {
      const inst = buildUnitInstance(def, playerTwoId, p2Positions[i], p2Customizations?.[i]);
      if (playerTwoId === FABLE_PLAYER_ID && fableHpScale < 1) {
        const scaled = Math.max(1, Math.floor(inst.maxHealth * fableHpScale));
        inst.maxHealth = scaled;
        inst.currentHealth = scaled;
      }
      return inst;
    }),
  ];

  const round1FirstPlayerId = forceFirstPlayerId ?? (Math.random() < 0.5 ? playerOneId : playerTwoId);
  const initiative: InitiativeState = {
    order: [], slot: 0, round1FirstPlayerId, activeUnitId: null, isRound1: true,
  };
  return {
    board: { width: BOARD_WIDTH, height: BOARD_HEIGHT },
    units, turnNumber: 1, roundNumber: 1,
    activePlayerId: round1FirstPlayerId, phase: 'action', initiative,
  };
}
