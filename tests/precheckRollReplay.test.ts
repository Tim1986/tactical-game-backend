import { describe, it, expect } from 'vitest';
import { precheckTurn } from '../src/game/turnBuilder.js';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import { MatchState, UnitInstance, InitiativeState } from '../src/types/matchState.js';

/**
 * OCCUPIED-CORPSE (owner, 2026-08-24, Unlit Beacon e6): "I killed a unit,
 * then walked onto his space" -> "Destination tile is occupied".
 *
 * Mechanism: the client's End-Turn precheck dry-runs the turn WITHOUT the
 * rolls the player already saw — processTurn then rolls fresh randomness, and
 * when the killing blow re-rolls as a MISS the victim survives inside the
 * precheck's simulation, so the queued MOVE onto the corpse tile is
 * "occupied". Probability per kill-then-move turn = the victim's dodge chance
 * (30% at AC 12) — which is why it presents as an intermittent, maddening bug.
 *
 * This test pins the engine mechanism deterministically via rollScript:
 * the same action list passes when the shown roll is replayed ('hit') and
 * fails when the dry-run is allowed to disagree ('miss'). The client fix is
 * to inject pendingRolls into the precheck state exactly as submitLocalTurn
 * injects them into the real execution.
 */
const P = 'p1'; const E = 'p2';
const abilityMap = buildAbilityMap();

const mk = (id: string, owner: string, x: number, y: number, hp: number): UnitInstance => ({
  instanceId: id, definitionSlug: 'fighter', ownerPlayerId: owner,
  position: { x, y }, currentHealth: hp, maxHealth: 40,
  armorClass: 12, movementRange: 3, abilities: ['sword'], passives: [],
  isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
  cooldowns: {}, statusEffects: [],
});

const makeState = (script: Array<'hit' | 'miss'>): MatchState => ({
  board: { width: 8, height: 8 },
  units: [mk('a', P, 3, 3, 40), mk('v', E, 4, 3, 1)],
  turnNumber: 9, roundNumber: 2, activePlayerId: P, phase: 'action',
  rollScript: script, rollIndex: 0,
  initiative: {
    order: ['a', 'v'], slot: 0, round1FirstPlayerId: P,
    activeUnitId: 'a', isRound1: false, roundNumber: 2,
  } as InitiativeState,
} as unknown as MatchState);

const KILL_THEN_STEP = [
  { type: 'USE_ABILITY', unitInstanceId: 'a', abilitySlug: 'sword', target: { x: 4, y: 3 } },
  { type: 'MOVE', unitInstanceId: 'a', destination: { x: 4, y: 3 } },
  { type: 'END_TURN' },
] as never;

describe('precheck must replay the rolls the player was shown', () => {
  it("with the SHOWN roll injected ('hit'): kill-then-step passes", () => {
    const pre = precheckTurn(makeState(['hit']), KILL_THEN_STEP, P, P, E, abilityMap);
    expect(pre).toEqual({ ok: true });
  });

  it("without it, a re-rolled 'miss' turns the same legal turn into 'occupied'", () => {
    const pre = precheckTurn(makeState(['miss']), KILL_THEN_STEP, P, P, E, abilityMap);
    expect(pre.ok).toBe(false);
    expect((pre as { error: string }).error).toMatch(/occupied/i);
  });
});
