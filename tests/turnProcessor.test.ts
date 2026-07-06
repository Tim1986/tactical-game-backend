import { describe, it, expect } from 'vitest';
import { processTurn, TurnValidationError } from '../src/game/turnProcessor.js';
import { MatchState, UnitInstance } from '../src/types/matchState.js';
import { AbilityDefinition } from '../src/types/index.js';

const makeUnit = (id: string, ownerId: string, x: number, y: number, overrides: Partial<UnitInstance> = {}): UnitInstance => ({
  instanceId: id, definitionSlug: 'fighter', ownerPlayerId: ownerId,
  position: { x, y }, currentHealth: 100, maxHealth: 100,
  armorClass: 1, // AC 1 = always hit (any roll + HIT_BONUS exceeds 1)
  movementRange: 3, abilities: ['shield_bash'], passives: [],
  isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
  cooldowns: { shield_bash: 0 }, statusEffects: [],
  ...overrides,
});

const makeState = (p1Id: string, p2Id: string, units: UnitInstance[]): MatchState => ({
  board: { width: 8, height: 8 }, units, turnNumber: 1, activePlayerId: p1Id, phase: 'action',
});

// Unblockable so existing tests don't depend on AC roll randomness
const SHIELD_BASH: AbilityDefinition = {
  id: 'ab-1', slug: 'shield_bash', name: 'Shield Bash', description: '',
  targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 2,
  isUnblockable: true,
  effects: [{ type: 'damage', formula: 'flat', value: 20, damageType: 'physical' }],
};
const abilityMap = new Map([['shield_bash', SHIELD_BASH]]);
const P1 = 'player-one'; const P2 = 'player-two';

describe('validation', () => {
  it('throws if not your turn', () => {
    const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 6, 6)]);
    expect(() => processTurn(state, [{ type: 'END_TURN' }], P2, P1, P2, abilityMap)).toThrow(TurnValidationError);
  });
  it('throws if END_TURN missing', () => {
    const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 6, 6)]);
    expect(() => processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u1', destination: { x: 2, y: 1 } }], P1, P1, P2, abilityMap)).toThrow('END_TURN');
  });
});

describe('MOVE', () => {
  it('moves unit within range', () => {
    const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 6, 6)]);
    const result = processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u1', destination: { x: 3, y: 1 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap);
    expect(result.updatedState.units.find((u) => u.instanceId === 'u1')?.position).toEqual({ x: 3, y: 1 });
  });
  it('throws if out of range', () => {
    // Destination must be in-bounds (not a removed corner) but beyond
    // movement range, so the range check — not the bounds check — fires.
    const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 6, 6)]);
    expect(() => processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u1', destination: { x: 7, y: 1 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap)).toThrow('movement range');
  });
  it('rejects diagonal as 2 moves (manhattan)', () => {
    // Range 3 unit at (0,0): tile (2,2) is distance 4 via Manhattan — out of range
    const state = makeState(P1, P2, [makeUnit('u1', P1, 0, 0), makeUnit('u2', P2, 6, 6)]);
    expect(() => processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u1', destination: { x: 2, y: 2 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap)).toThrow('movement range');
  });
  it('allows (1,2) diagonal costing 3 moves', () => {
    // (0,0) → (1,2) = Manhattan 3 = exactly in range
    const state = makeState(P1, P2, [makeUnit('u1', P1, 0, 0), makeUnit('u2', P2, 6, 6)]);
    const result = processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u1', destination: { x: 1, y: 2 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap);
    expect(result.updatedState.units.find((u) => u.instanceId === 'u1')?.position).toEqual({ x: 1, y: 2 });
  });
  it('throws if tile occupied', () => {
    const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P1, 2, 1), makeUnit('u3', P2, 6, 6)]);
    expect(() => processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u1', destination: { x: 2, y: 1 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap)).toThrow('occupied');
  });
});

describe('USE_ABILITY', () => {
  it('deals damage to target', () => {
    const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 2, 1)]);
    const result = processTurn(state, [{ type: 'USE_ABILITY', unitInstanceId: 'u1', abilitySlug: 'shield_bash', target: { x: 2, y: 1 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap);
    expect(result.updatedState.units.find((u) => u.instanceId === 'u2')?.currentHealth).toBe(80);
  });
  it('throws if on cooldown', () => {
    const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1, { cooldowns: { shield_bash: 2 } }), makeUnit('u2', P2, 2, 1)]);
    expect(() => processTurn(state, [{ type: 'USE_ABILITY', unitInstanceId: 'u1', abilitySlug: 'shield_bash', target: { x: 2, y: 1 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap)).toThrow('cooldown');
  });
  it('throws if out of range', () => {
    const state = makeState(P1, P2, [makeUnit('u1', P1, 0, 0), makeUnit('u2', P2, 5, 5)]);
    expect(() => processTurn(state, [{ type: 'USE_ABILITY', unitInstanceId: 'u1', abilitySlug: 'shield_bash', target: { x: 5, y: 5 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap)).toThrow('range');
  });
  it('throws if unit already acted', () => {
    const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 2, 1)]);
    expect(() => processTurn(state, [
      { type: 'USE_ABILITY', unitInstanceId: 'u1', abilitySlug: 'shield_bash', target: { x: 2, y: 1 } },
      { type: 'USE_ABILITY', unitInstanceId: 'u1', abilitySlug: 'shield_bash', target: { x: 2, y: 1 } },
      { type: 'END_TURN' },
    ], P1, P1, P2, abilityMap)).toThrow('already used');
  });
});

describe('win condition', () => {
  it('detects match over when last enemy dies', () => {
    const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 2, 1, { currentHealth: 15 })]);
    const result = processTurn(state, [{ type: 'USE_ABILITY', unitInstanceId: 'u1', abilitySlug: 'shield_bash', target: { x: 2, y: 1 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap);
    expect(result.matchOver).toBe(true);
    expect(result.winnerId).toBe(P1);
  });
});

describe('turn swap', () => {
  it('swaps active player and increments turn', () => {
    const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 6, 6)]);
    const result = processTurn(state, [{ type: 'END_TURN' }], P1, P1, P2, abilityMap);
    expect(result.updatedState.activePlayerId).toBe(P2);
    expect(result.updatedState.turnNumber).toBe(2);
  });
  it('frozen unit cannot move', () => {
    const state = makeState(P1, P2, [
      makeUnit('u1', P1, 1, 1, { statusEffects: [{ slug: 'frozen', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'u2' }] }),
      makeUnit('u2', P2, 6, 6),
    ]);
    expect(() => processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u1', destination: { x: 2, y: 1 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap)).toThrow('frozen');
  });
});
