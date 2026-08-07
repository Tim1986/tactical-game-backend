/**
 * rootedRound1Commit.test.ts — the round-1 rooted soft-lock (owner-reported).
 *
 * Fable roots your last uncommitted unit in round 1. It cannot move (rooted),
 * cannot attack (nothing in range), and round 1 forbids passing (TRN-2) — so
 * the player had no legal action at all and End Turn bounced off "Must commit
 * a unit in round 1".
 *
 * The way out already existed in the engine: processMove accepts a
 * ZERO-DISTANCE move from a rooted unit ("hold position", MOV-4), which commits
 * it to the initiative. These tests pin that contract down, because the client
 * now relies on it — both for the "Commit (Rooted)" button and for End Turn
 * auto-committing the last uncommitted unit.
 */
import { describe, it, expect } from 'vitest';
import { processTurn, TurnValidationError } from '../src/game/turnProcessor.js';
import { MatchState, UnitInstance, InitiativeState } from '../src/types/matchState.js';
import { AbilityDefinition } from '../src/types/index.js';

const P1 = 'p1';
const P2 = 'p2';
const abilityMap = new Map<string, AbilityDefinition>();

const rooted = (turns = 2) => [{ slug: 'rooted', turnsRemaining: turns, stacks: 1, sourceUnitInstanceId: 'x' }];

const makeUnit = (id: string, owner: string, x: number, y: number, overrides: Partial<UnitInstance> = {}): UnitInstance => ({
  instanceId: id, definitionSlug: 'rogue', ownerPlayerId: owner,
  position: { x, y }, currentHealth: 100, maxHealth: 100,
  armorClass: 1, movementRange: 3, abilities: ['stab'], passives: [],
  isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
  cooldowns: {}, statusEffects: [], ...overrides,
} as UnitInstance);

/** Round 1, P2's turn, P2 has exactly one uncommitted unit and it is rooted. */
function lockedState() {
  const mine = makeUnit('rogue', P2, 4, 4, { statusEffects: rooted() as UnitInstance['statusEffects'] });
  const theirs = makeUnit('foe', P1, 0, 3);
  const initiative = {
    order: ['foe'], slot: -1, round1FirstPlayerId: P1, activeUnitId: null, isRound1: true,
  } as unknown as InitiativeState;
  return {
    board: { width: 8, height: 8 }, units: [theirs, mine],
    turnNumber: 2, activePlayerId: P2, phase: 'action', initiative,
  } as MatchState;
}

describe('round-1 rooted unit can still commit', () => {
  it('a bare END_TURN is rejected — this is the lock the client must not hit', () => {
    expect(() => processTurn(lockedState(), [{ type: 'END_TURN' }], P2, P1, P2, abilityMap))
      .toThrow(TurnValidationError);
  });

  it('a ZERO-DISTANCE move commits the rooted unit to the initiative', () => {
    const actions: any[] = [
      { type: 'MOVE', unitInstanceId: 'rogue', destination: { x: 4, y: 4 } },
      { type: 'END_TURN' },
    ];
    const r = processTurn(lockedState(), actions, P2, P1, P2, abilityMap);
    expect(r.updatedState.initiative!.order).toContain('rogue');
    const after = r.updatedState.units.find((u) => u.instanceId === 'rogue')!;
    expect(after.position).toEqual({ x: 4, y: 4 });
  });

  it('an actual move is still refused while rooted', () => {
    const actions: any[] = [
      { type: 'MOVE', unitInstanceId: 'rogue', destination: { x: 4, y: 5 } },
      { type: 'END_TURN' },
    ];
    expect(() => processTurn(lockedState(), actions, P2, P1, P2, abilityMap))
      .toThrow(TurnValidationError);
  });
});
