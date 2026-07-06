import { describe, it, expect } from 'vitest';
import { chebyshevDistance, isInBounds, calculatePushDestination, calculatePullDestination, positionsEqual, getUnitsInRadius } from '../src/game/boardUtils.js';
import { UnitInstance } from '../src/types/matchState.js';

const makeUnit = (id: string, x: number, y: number): UnitInstance => ({ instanceId: id, definitionSlug: 'test', ownerPlayerId: 'p1', position: { x, y }, currentHealth: 100, maxHealth: 100, isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {}, statusEffects: [] });

describe('chebyshevDistance', () => {
  it('returns 0 for same position', () => { expect(chebyshevDistance({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0); });
  it('returns 1 for diagonal', () => { expect(chebyshevDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(1); });
  it('returns correct distance', () => { expect(chebyshevDistance({ x: 0, y: 0 }, { x: 4, y: 2 })).toBe(4); });
});

describe('isInBounds', () => {
  it('accepts valid non-corner positions', () => { expect(isInBounds({ x: 0, y: 3 })).toBe(true); expect(isInBounds({ x: 7, y: 3 })).toBe(true); });
  it('rejects out of bounds', () => { expect(isInBounds({ x: -1, y: 0 })).toBe(false); expect(isInBounds({ x: 8, y: 0 })).toBe(false); });
  it('rejects the four removed corners', () => {
    expect(isInBounds({ x: 0, y: 0 })).toBe(false);
    expect(isInBounds({ x: 7, y: 0 })).toBe(false);
    expect(isInBounds({ x: 0, y: 7 })).toBe(false);
    expect(isInBounds({ x: 7, y: 7 })).toBe(false);
  });
});

describe('calculatePushDestination', () => {
  it('pushes unit away from caster', () => { const result = calculatePushDestination({ x: 4, y: 2 }, { x: 2, y: 2 }, 2); expect(result.x).toBe(6); expect(result.y).toBe(2); });
  it('clamps to board edge', () => { const result = calculatePushDestination({ x: 6, y: 3 }, { x: 0, y: 3 }, 5); expect(result.x).toBe(7); });
});

describe('calculatePullDestination', () => {
  it('pulls unit toward caster', () => { const result = calculatePullDestination({ x: 5, y: 0 }, { x: 0, y: 0 }, 3); expect(result.x).toBe(2); expect(result.y).toBe(0); });
});

describe('positionsEqual', () => {
  it('returns true for same', () => { expect(positionsEqual({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(true); });
  it('returns false for different', () => { expect(positionsEqual({ x: 3, y: 4 }, { x: 3, y: 5 })).toBe(false); });
});

describe('getUnitsInRadius', () => {
  it('returns only units within radius', () => {
    const units = [makeUnit('a', 3, 3), makeUnit('b', 4, 4), makeUnit('c', 6, 6)];
    const result = getUnitsInRadius({ x: 3, y: 3 }, 2, units);
    expect(result.map((u) => u.instanceId)).toContain('a');
    expect(result.map((u) => u.instanceId)).toContain('b');
    expect(result.map((u) => u.instanceId)).not.toContain('c');
  });
});
