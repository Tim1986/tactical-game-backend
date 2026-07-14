import { describe, it, expect } from 'vitest';
import { processTurn } from '../src/game/turnProcessor.js';
import { MatchState, UnitInstance, InitiativeState } from '../src/types/matchState.js';
import { AbilityDefinition } from '../src/types/index.js';

// Regression for the Fear bug: durations decrement at the END of a unit's turn,
// so a rooted unit is blocked on its next turn (a 1-turn root actually roots).
// Previously the engine ticked at the START of the turn, expiring a 1-turn root
// before it could block anything.

const P1 = 'p1'; const P2 = 'p2';

const makeUnit = (id: string, owner: string, x: number, y: number, overrides: Partial<UnitInstance> = {}): UnitInstance => ({
  instanceId: id, definitionSlug: 'fighter', ownerPlayerId: owner,
  position: { x, y }, currentHealth: 100, maxHealth: 100,
  armorClass: 1, movementRange: 3, abilities: ['sword'], passives: [],
  isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
  cooldowns: {}, statusEffects: [], ...overrides,
});

const makeRound2State = (units: UnitInstance[], activeUnitId: string, activePlayerId: string): MatchState => {
  const order = units.map((u) => u.instanceId);
  const initiative: InitiativeState = {
    order, slot: order.indexOf(activeUnitId), round1FirstPlayerId: P1,
    activeUnitId, isRound1: false, roundNumber: 2,
  } as InitiativeState;
  return { board: { width: 8, height: 8 }, units, turnNumber: 9, activePlayerId, phase: 'action', initiative } as MatchState;
};

const abilityMap = new Map<string, AbilityDefinition>();

describe('round-1 forced commit when no unit can legally act', () => {
  it('bare END_TURN auto-commits when every uncommitted unit is frozen', () => {
    const frozen = makeUnit('u2', P2, 4, 4, { statusEffects: [{ slug: 'frozen', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'u1' }] });
    const other = makeUnit('u1', P1, 0, 0);
    const initiative = { order: ['u1'], slot: -1, round1FirstPlayerId: P1, activeUnitId: null, isRound1: true } as unknown as InitiativeState;
    const state = { board: { width: 8, height: 8 }, units: [other, frozen], turnNumber: 2, activePlayerId: P2, phase: 'action', initiative } as MatchState;
    const result = processTurn(state, [{ type: 'END_TURN' }], P2, P1, P2, abilityMap);
    expect(result.updatedState.initiative!.order).toContain('u2');
    // Frozen duration untouched — advanceSlot handles its skipped slots later.
    const after = result.updatedState.units.find((u) => u.instanceId === 'u2')!;
    expect(after.statusEffects.find((se) => se.slug === 'frozen')?.turnsRemaining).toBe(2);
  });

  it('bare END_TURN still throws when a unit could legally commit', () => {
    const healthy = makeUnit('u2', P2, 4, 4);
    const other = makeUnit('u1', P1, 0, 0);
    const initiative = { order: ['u1'], slot: -1, round1FirstPlayerId: P1, activeUnitId: null, isRound1: true } as unknown as InitiativeState;
    const state = { board: { width: 8, height: 8 }, units: [other, healthy], turnNumber: 2, activePlayerId: P2, phase: 'action', initiative } as MatchState;
    expect(() => processTurn(state, [{ type: 'END_TURN' }], P2, P1, P2, abilityMap)).toThrow('Must commit');
  });
});

describe('rooted blocks movement on the victim\'s next turn (end-of-turn tick)', () => {
  it('a 1-turn root blocks the victim\'s MOVE on its very next turn', () => {
    const rooted = makeUnit('u2', P2, 4, 4, { statusEffects: [{ slug: 'rooted', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'u1' }] });
    const state = makeRound2State([makeUnit('u1', P1, 0, 0), rooted], 'u2', P2);
    expect(() => processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u2', destination: { x: 4, y: 6 } }, { type: 'END_TURN' }], P2, P1, P2, abilityMap))
      .toThrow('rooted');
  });

  it('the root is spent at end of that turn — the victim is free next time', () => {
    const rooted = makeUnit('u2', P2, 4, 4, { statusEffects: [{ slug: 'rooted', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'u1' }] });
    const state = makeRound2State([makeUnit('u1', P1, 0, 0), rooted], 'u2', P2);
    // Bare END_TURN: unit doesn't move, but its root decrements and expires.
    const result = processTurn(state, [{ type: 'END_TURN' }], P2, P1, P2, abilityMap);
    const after = result.updatedState.units.find((u) => u.instanceId === 'u2')!;
    expect(after.statusEffects.some((se) => se.slug === 'rooted')).toBe(false);
  });

  it('a zero-distance MOVE ("hold position") is legal while rooted', () => {
    // Needed so a rooted unit can always satisfy the round-1 commit rule.
    const rooted = makeUnit('u2', P2, 4, 4, { statusEffects: [{ slug: 'rooted', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'u1' }] });
    const state = makeRound2State([makeUnit('u1', P1, 0, 0), rooted], 'u2', P2);
    const result = processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u2', destination: { x: 4, y: 4 } }, { type: 'END_TURN' }], P2, P1, P2, abilityMap);
    expect(result.updatedState.units.find((u) => u.instanceId === 'u2')!.position).toEqual({ x: 4, y: 4 });
  });

  it('a 2-turn root still blocks after one turn has passed', () => {
    const rooted = makeUnit('u2', P2, 4, 4, { statusEffects: [{ slug: 'rooted', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'u1' }] });
    const state = makeRound2State([makeUnit('u1', P1, 0, 0), rooted], 'u2', P2);
    // First turn: blocked, root decrements 2 -> 1 at end.
    const r1 = processTurn(state, [{ type: 'END_TURN' }], P2, P1, P2, abilityMap);
    const mid = r1.updatedState.units.find((u) => u.instanceId === 'u2')!;
    expect(mid.statusEffects.find((se) => se.slug === 'rooted')?.turnsRemaining).toBe(1);
  });
});
