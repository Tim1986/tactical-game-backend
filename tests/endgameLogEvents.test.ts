import { describe, it, expect } from 'vitest';
import { processTurn } from '../src/game/turnProcessor.js';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import { MatchState, UnitInstance, InitiativeState } from '../src/types/matchState.js';

/**
 * Endgame (rulebook END-1/END-2) must be VISIBLE. The engine has always
 * emitted ENDGAME_STARTED and ENDGAME_DRAIN; the client filtered both out of
 * its log builder and never re-added them, so from round 11 a retreating unit
 * silently lost 1 HP a turn with nothing to explain it (owner 2026-08-24).
 *
 * This pins the ENGINE half — the events exist, carry a player-facing message,
 * and fire on exactly the retreat case the rule describes.
 */
const P = 'p1'; const E = 'p2';
const abilityMap = buildAbilityMap();

const mk = (id: string, owner: string, x: number, y: number): UnitInstance => ({
  instanceId: id, definitionSlug: 'fighter', ownerPlayerId: owner,
  position: { x, y }, currentHealth: 40, maxHealth: 40,
  armorClass: 10, movementRange: 3, abilities: ['sword'], passives: [],
  isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
  cooldowns: {}, statusEffects: [],
});

// Round 11 starts at turn 81 (8 turns per round).
const stateAtRound = (turnNumber: number, roundNumber: number): MatchState => ({
  board: { width: 8, height: 8 },
  units: [mk('a', P, 3, 4), mk('v', E, 6, 4)],
  turnNumber, roundNumber, activePlayerId: P, phase: 'action',
  initiative: {
    order: ['a', 'v'], slot: 0, round1FirstPlayerId: P,
    activeUnitId: 'a', isRound1: false, roundNumber,
  } as InitiativeState,
} as unknown as MatchState);

describe('endgame drain is announced and logged', () => {
  it('retreating in round 11 emits ENDGAME_DRAIN with a player-facing message', () => {
    const st = stateAtRound(81, 11);
    // Move AWAY from the only enemy: 3,4 -> 1,4 (dist 3 -> 5).
    const { events } = processTurn(st, [
      { type: 'MOVE', unitInstanceId: 'a', destination: { x: 1, y: 4 } },
      { type: 'END_TURN' },
    ] as never, P, P, E, abilityMap);

    const drain = events.find((e) => e.type === 'ENDGAME_DRAIN');
    expect(drain, 'retreating in endgame must emit ENDGAME_DRAIN').toBeDefined();
    expect((drain as { value?: number }).value).toBe(1);
    expect((drain as { message?: string }).message).toBeTruthy();
  });

  it('advancing in round 11 does NOT drain (END-2: only retreating costs)', () => {
    const st = stateAtRound(81, 11);
    const { events } = processTurn(st, [
      { type: 'MOVE', unitInstanceId: 'a', destination: { x: 5, y: 4 } },
      { type: 'END_TURN' },
    ] as never, P, P, E, abilityMap);
    expect(events.find((e) => e.type === 'ENDGAME_DRAIN')).toBeUndefined();
  });

  it('retreating BEFORE round 11 does not drain', () => {
    const st = stateAtRound(41, 6);
    const { events } = processTurn(st, [
      { type: 'MOVE', unitInstanceId: 'a', destination: { x: 1, y: 4 } },
      { type: 'END_TURN' },
    ] as never, P, P, E, abilityMap);
    expect(events.find((e) => e.type === 'ENDGAME_DRAIN')).toBeUndefined();
  });
});
