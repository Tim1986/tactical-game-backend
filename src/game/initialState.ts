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
import { isInBounds } from './boardUtils.js';

/**
 * Replace any placement the board cannot actually hold with a legal one.
 *
 * The deployment-zone rule (x 0–2) and the board's SHAPE are separate
 * constraints, and only the first was ever enforced on saved placements — so
 * (0,0) passed validation despite being one of the four removed corner tiles.
 * A unit deployed there rendered outside the board and could not be selected,
 * while still counting as a live unit (QA F-20). Duplicates are caught here for
 * the same reason: two units on one tile is not a state the board can show.
 *
 * Positions are sanitized in the P1 frame, before any mirroring — the mirror
 * (x -> BOARD_WIDTH-1-x) maps legal tiles to legal tiles and corners to corners,
 * so doing it here fixes both sides.
 */
function sanitizePlacements(requested: BoardPosition[], count: number): BoardPosition[] {
  const taken = new Set<string>();
  const key = (p: BoardPosition) => `${p.x},${p.y}`;
  const legalZoneTiles: BoardPosition[] = [];
  for (let x = 0; x <= 2; x++) {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (isInBounds({ x, y })) legalZoneTiles.push({ x, y });
    }
  }
  const out: BoardPosition[] = [];
  for (let i = 0; i < count; i++) {
    const want = requested[i];
    const usable = want && isInBounds(want) && !taken.has(key(want));
    const pos = usable ? want : legalZoneTiles.find(t => !taken.has(key(t)));
    // legalZoneTiles holds 22 tiles against at most 4 units, so the fallback
    // can only be undefined if the board constants change underneath us.
    const chosen = pos ?? { x: 1, y: 1 };
    taken.add(key(chosen));
    out.push(chosen);
  }
  return out;
}

export const FABLE_PLAYER_ID = '00000000-0000-0000-0000-000000000001';
export const FABLE_HP_SCALE = { easy: 0.8, medium: 0.9, hard: 1.0, nightmare: 1.1 } as const;
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
  // A customization's special must be one this class actually offers. An unknown
  // slug used to be carried into the live unit verbatim (QA F-21), producing a
  // unit whose ability list named something the engine has no definition for;
  // fall back to the class default instead, matching how an unknown UNIT slug is
  // dropped rather than fielded.
  const chosenSpecial = customization?.specialSlug;
  const specialSlug = (chosenSpecial && def.specialOptions.includes(chosenSpecial))
    ? chosenSpecial
    : def.specialOptions[0] ?? def.abilities[1];
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
    passiveSlug: customization?.passiveSlug ?? undefined,
    isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
    cooldowns, statusEffects: initialStatuses,
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
  // Both fallbacks are authored in the P1 frame (x 0–2), because p2Raw — every
  // source of it, planPlacement() and a team's saved placement alike — is in the
  // P1 frame and gets mirrored below. A P2-frame fallback (x=6) would mirror to
  // x=1 and deploy player two INSIDE player one's zone, stacked on their units.
  const p1Fallback: BoardPosition[] = [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }];
  const p2Fallback: BoardPosition[] = [{ x: 1, y: 0 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 1, y: 6 }];
  const p1Requested = p1Placement.length >= p1Units.length ? p1Placement : p1Fallback;
  const p2Requested = p2Placement.length >= p2Units.length ? p2Placement : p2Fallback;
  // Sanitize before mirroring — see sanitizePlacements.
  const p1Positions = sanitizePlacements(p1Requested, p1Units.length);
  const p2Raw       = sanitizePlacements(p2Requested, p2Units.length);
  const p2Positions = p2Raw.map(pos => ({ x: BOARD_WIDTH - 1 - pos.x, y: pos.y }));

  const units: UnitInstance[] = [
    ...p1Units.map((def, i) => buildUnitInstance(def, playerOneId, p1Positions[i], p1Customizations?.[i])),
    ...p2Units.map((def, i) => {
      const inst = buildUnitInstance(def, playerTwoId, p2Positions[i], p2Customizations?.[i]);
      if (playerTwoId === FABLE_PLAYER_ID && fableHpScale !== 1) {
        const scaled = Math.max(1, Math.round(inst.maxHealth * fableHpScale));
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
