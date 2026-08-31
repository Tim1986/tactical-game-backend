/**
 * shieldMultiHit.test.ts — a shielded target still rolls against EVERY hit.
 *
 * Owner question 2026-08-31: a Breaker (rogue chassis, Twin Strike) hit a
 * shielded unit, "the first attack popped the shield, then it seemed like the
 * second one was the only one that rolled. I thought we established previously
 * that we do need attack rolls against shielded targets."
 *
 * DGE-5 says: dodge resolves BEFORE the shield, a Miss leaves the shield
 * standing, and against a multi-hit the shield absorbs only the first hit that
 * LANDS. These pin all three against the multi-hit path specifically.
 */
import { describe, it, expect } from 'vitest';
import { executeAbility } from '../src/game/abilityExecutor.js';
import type { MatchState, UnitInstance, GameEvent, AbilityDefinition } from '../src/types/matchState.js';

const P1 = 'p1', P2 = 'p2';
let seq = 0;
function mk(owner: string, over: Partial<UnitInstance> = {}): UnitInstance {
  return {
    instanceId: `u${++seq}`, definitionSlug: 'rogue', ownerPlayerId: owner,
    position: { x: 1, y: 1 }, currentHealth: 100, maxHealth: 100, armorClass: 6,
    movementRange: 4, abilities: ['twin'], passives: [], isAlive: true,
    hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {}, statusEffects: [],
    ...over,
  } as UnitInstance;
}
const TWIN = {
  slug: 'twin', name: 'Twin Strike', targetingType: 'single', range: 1, areaRadius: 0,
  cooldownTurns: 0, isSpecial: false, isUnblockable: false, isMultiHit: true,
  effects: [{ type: 'damage', formula: 'flat', value: 8 }, { type: 'damage', formula: 'flat', value: 8 }],
} as unknown as AbilityDefinition;

function cast(target: UnitInstance, caster: UnitInstance, alwaysHit: boolean): GameEvent[] {
  const events: GameEvent[] = [];
  const state = { board: { width: 8, height: 8 }, units: [caster, target] } as MatchState;
  const real = Math.random;
  Math.random = () => (alwaysHit ? 0.99 : 0.0);   // 0.99 never misses, 0.0 always does
  try {
    executeAbility({ state, caster, targetPosition: target.position, ability: TWIN, events } as never);
  } finally { Math.random = real; }
  return events;
}

describe('shield vs a multi-hit attack', () => {
  it('absorbs the FIRST hit and lets the second through — both hits resolve', () => {
    const caster = mk(P1, { position: { x: 1, y: 1 } });
    const target = mk(P2, { position: { x: 2, y: 1 }, armorClass: 6,
      statusEffects: [{ slug: 'shielded', turnsRemaining: 3, stacks: 1, sourceUnitInstanceId: 'x' }] as never });
    const events = cast(target, caster, true);
    expect(events.filter(e => e.type === 'SHIELD_ABSORBED')).toHaveLength(1);
    expect(events.filter(e => e.type === 'DAMAGE_DEALT')).toHaveLength(1);
    expect(target.currentHealth).toBe(92);                      // one dagger of 8 got through
    expect(target.statusEffects.some(se => se.slug === 'shielded')).toBe(false);
  });

  it('a DODGED first dagger leaves the shield up for the second', () => {
    // Every roll misses, so nothing lands and the shield is never spent.
    const caster = mk(P1, { position: { x: 1, y: 1 } });
    const target = mk(P2, { position: { x: 2, y: 1 }, armorClass: 20,
      statusEffects: [{ slug: 'shielded', turnsRemaining: 3, stacks: 1, sourceUnitInstanceId: 'x' }] as never });
    const events = cast(target, caster, false);
    expect(events.filter(e => e.type === 'DODGED').length).toBeGreaterThan(0);
    expect(events.filter(e => e.type === 'SHIELD_ABSORBED')).toHaveLength(0);
    expect(target.statusEffects.some(se => se.slug === 'shielded')).toBe(true);
    expect(target.currentHealth).toBe(100);
  });

  it('emits one display-able outcome PER dagger — the client shows two dice', () => {
    // The count the owner was checking: a shielded multi-hit must produce two
    // resolvable strikes, not one. Absorb + damage = 2.
    const caster = mk(P1, { position: { x: 1, y: 1 } });
    const target = mk(P2, { position: { x: 2, y: 1 }, armorClass: 6,
      statusEffects: [{ slug: 'shielded', turnsRemaining: 3, stacks: 1, sourceUnitInstanceId: 'x' }] as never });
    const events = cast(target, caster, true);
    const strikes = events.filter(e =>
      e.type === 'DAMAGE_DEALT' || e.type === 'DODGED' || e.type === 'SHIELD_ABSORBED');
    expect(strikes).toHaveLength(2);
  });

  it('unshielded multi-hit still deals both daggers', () => {
    const caster = mk(P1, { position: { x: 1, y: 1 } });
    const target = mk(P2, { position: { x: 2, y: 1 }, armorClass: 6 });
    cast(target, caster, true);
    expect(target.currentHealth).toBe(84);
  });
});
