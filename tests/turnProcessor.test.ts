import { describe, it, expect } from 'vitest';
import { processTurn, TurnValidationError } from '../src/game/turnProcessor.js';
import { MatchState, UnitInstance } from '../src/types/matchState.js';
import { AbilityDefinition } from '../src/types/index.js';

const makeUnit = (id: string, ownerId: string, x: number, y: number, overrides = {}): UnitInstance => ({ instanceId: id, definitionSlug: 'iron_golem', ownerPlayerId: ownerId, position: { x, y }, currentHealth: 100, maxHealth: 100, isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: { shield_bash: 0 }, statusEffects: [], ...({ movementRange: 3 } as object), ...({ abilities: ['shield_bash'] } as object), ...({ passives: [] } as object), ...overrides } as UnitInstance);
const makeState = (p1Id: string, p2Id: string, units: UnitInstance[]): MatchState => ({ board: { width: 8, height: 8 }, units, turnNumber: 1, activePlayerId: p1Id, phase: 'action' });
const SHIELD_BASH: AbilityDefinition = { id: 'ab-1', slug: 'shield_bash', name: 'Shield Bash', description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 2, effects: [{ type: 'damage', formula: 'flat', value: 20, damageType: 'physical' }] };
const abilityMap = new Map([['shield_bash', SHIELD_BASH]]);
const P1 = 'player-one'; const P2 = 'player-two';

describe('validation', () => {
  it('throws if not your turn', () => { const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 6, 6)]); expect(() => processTurn(state, [{ type: 'END_TURN' }], P2, P1, P2, abilityMap)).toThrow(TurnValidationError); });
  it('throws if END_TURN missing', () => { const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 6, 6)]); expect(() => processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u1', destination: { x: 2, y: 1 } }], P1, P1, P2, abilityMap)).toThrow('END_TURN'); });
});

describe('MOVE', () => {
  it('moves unit within range', () => { const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 6, 6)]); const result = processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u1', destination: { x: 3, y: 1 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap); expect(result.updatedState.units.find((u) => u.instanceId === 'u1')?.position).toEqual({ x: 3, y: 1 }); });
  it('throws if out of range', () => { const state = makeState(P1, P2, [makeUnit('u1', P1, 0, 0), makeUnit('u2', P2, 6, 6)]); expect(() => processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u1', destination: { x: 7, y: 7 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap)).toThrow('movement range'); });
  it('throws if tile occupied', () => { const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P1, 2, 1), makeUnit('u3', P2, 6, 6)]); expect(() => processTurn(state, [{ type: 'MOVE', unitInstanceId: 'u1', destination: { x: 2, y: 1 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap)).toThrow('occupied'); });
});

describe('USE_ABILITY', () => {
  it('deals damage to target', () => { const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 2, 1)]); const result = processTurn(state, [{ type: 'USE_ABILITY', unitInstanceId: 'u1', abilitySlug: 'shield_bash', target: { x: 2, y: 1 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap); expect(result.updatedState.units.find((u) => u.instanceId === 'u2')?.currentHealth).toBe(80); });
  it('throws if on cooldown', () => { const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1, { cooldowns: { shield_bash: 2 } }), makeUnit('u2', P2, 2, 1)]); expect(() => processTurn(state, [{ type: 'USE_ABILITY', unitInstanceId: 'u1', abilitySlug: 'shield_bash', target: { x: 2, y: 1 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap)).toThrow('cooldown'); });
  it('throws if out of range', () => { const state = makeState(P1, P2, [makeUnit('u1', P1, 0, 0), makeUnit('u2', P2, 5, 5)]); expect(() => processTurn(state, [{ type: 'USE_ABILITY', unitInstanceId: 'u1', abilitySlug: 'shield_bash', target: { x: 5, y: 5 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap)).toThrow('range'); });
});

describe('win condition', () => {
  it('detects match over', () => { const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 2, 1, { currentHealth: 15 })]); const result = processTurn(state, [{ type: 'USE_ABILITY', unitInstanceId: 'u1', abilitySlug: 'shield_bash', target: { x: 2, y: 1 } }, { type: 'END_TURN' }], P1, P1, P2, abilityMap); expect(result.matchOver).toBe(true); expect(result.winnerId).toBe(P1); });
});

describe('turn swap', () => {
  it('swaps active player after END_TURN', () => { const state = makeState(P1, P2, [makeUnit('u1', P1, 1, 1), makeUnit('u2', P2, 6, 6)]); const result = processTurn(state, [{ type: 'END_TURN' }], P1, P1, P2, abilityMap); expect(result.updatedState.activePlayerId).toBe(P2); expect(result.updatedState.turnNumber).toBe(2); });
});
