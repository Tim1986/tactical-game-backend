/**
 * buildPuzzleState.ts — Deterministic MatchState builder for puzzles.
 *
 * Bypasses buildInitialState's round-1 commitment flow entirely: the
 * initiative order is fixed by the puzzle definition and the state starts
 * in round 2+ form (isRound1: false), so the first thing the player does
 * is act with the designated active unit.
 *
 * No randomness anywhere: fortune meters are pinned by the definition.
 */

import type { MatchState, UnitInstance } from '../types/matchState.js';
import type { UnitDefinition } from '../types/index.js';
import { buildUnitInstance } from '../game/initialState.js';
import { DEFAULT_UNITS } from '../ai/defaultData.js';
import type { PuzzleDefinition } from './types.js';

export const PUZZLE_PLAYER_ID = 'puzzle-player';
export const PUZZLE_ENEMY_ID = '00000000-0000-0000-0000-000000000001'; // Fable id — match UI treats it as the AI side

/**
 * Build the mid-battle MatchState for a puzzle. Also returns the mapping
 * from PuzzleUnitSpec ids to generated instanceIds (needed for
 * targetUnitId checks and initiative order).
 */
export function buildPuzzleState(def: PuzzleDefinition): {
  state: MatchState;
  instanceIdBySpecId: Record<string, string>;
} {
  const instanceIdBySpecId: Record<string, string> = {};
  const units: UnitInstance[] = def.units.map((spec) => {
    const unitDef = DEFAULT_UNITS[spec.slug] as unknown as UnitDefinition;
    if (!unitDef) throw new Error(`Puzzle ${def.id}: unknown unit slug '${spec.slug}'`);
    const ownerId = spec.side === 'player' ? PUZZLE_PLAYER_ID : PUZZLE_ENEMY_ID;
    const inst = buildUnitInstance(unitDef, ownerId, spec.position, {
      specialSlug: spec.specialSlug ?? unitDef.specialOptions[0],
      passiveSlug: spec.passiveSlug ?? null,
    });
    if (spec.currentHealth !== undefined) {
      inst.currentHealth = Math.min(spec.currentHealth, inst.maxHealth);
    }
    if (spec.cooldowns) {
      for (const [slug, cd] of Object.entries(spec.cooldowns)) inst.cooldowns[slug] = cd;
    }
    if (spec.statusEffects) {
      inst.statusEffects = spec.statusEffects.map((se) => ({
        ...se,
        sourceUnitInstanceId: inst.instanceId,
      }));
    }
    instanceIdBySpecId[spec.id] = inst.instanceId;
    return inst;
  });

  // Validate the initiative order references every unit exactly once.
  const specIds = new Set(def.units.map((u) => u.id));
  if (def.initiativeOrder.length !== def.units.length ||
      !def.initiativeOrder.every((id) => specIds.has(id))) {
    throw new Error(`Puzzle ${def.id}: initiativeOrder must list every unit id exactly once`);
  }

  const order = def.initiativeOrder.map((specId) => instanceIdBySpecId[specId]);
  const firstUnit = units.find((u) => u.instanceId === order[0])!;
  if (firstUnit.ownerPlayerId !== PUZZLE_PLAYER_ID) {
    throw new Error(`Puzzle ${def.id}: initiativeOrder must start with a player unit`);
  }

  const state: MatchState = {
    board: { width: 8, height: 8 },
    units,
    turnNumber: 1,
    roundNumber: 2, // past round 1: fixed-order initiative, Charge still available
    activePlayerId: PUZZLE_PLAYER_ID,
    phase: 'action',
    initiative: {
      order,
      slot: 0,
      round1FirstPlayerId: PUZZLE_PLAYER_ID,
      activeUnitId: order[0],
      isRound1: false,
    },
  };
  return { state, instanceIdBySpecId };
}

/**
 * Evaluate the puzzle goal against a state.
 * Returns 'won' | 'lost' | 'ongoing'. Turn-limit enforcement is the
 * caller's job (runner / solver) — this only reads the board.
 */
export function checkPuzzleGoal(
  def: PuzzleDefinition,
  state: MatchState,
  instanceIdBySpecId: Record<string, string>,
): 'won' | 'lost' | 'ongoing' {
  const playerAlive = state.units.some((u) => u.isAlive && u.ownerPlayerId === PUZZLE_PLAYER_ID);
  if (!playerAlive) return 'lost';

  if (def.goal === 'eliminate_target') {
    const targetInstanceId = instanceIdBySpecId[def.targetUnitId ?? ''];
    if (!targetInstanceId) throw new Error(`Puzzle ${def.id}: bad targetUnitId`);
    const target = state.units.find((u) => u.instanceId === targetInstanceId);
    return target && !target.isAlive ? 'won' : 'ongoing';
  }

  const enemyAlive = state.units.some((u) => u.isAlive && u.ownerPlayerId === PUZZLE_ENEMY_ID);
  return enemyAlive ? 'ongoing' : 'won';
}
