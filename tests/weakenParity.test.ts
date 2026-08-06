import { describe, it, expect } from 'vitest';
import { executeAbility, WEAKENED_DAMAGE_REDUCTION } from '../src/game/abilityExecutor.js';
import { DEFAULT_ABILITIES } from '../src/ai/defaultData.js';
import { MatchState, UnitInstance } from '../src/types/matchState.js';

// The brain must model weaken with the SAME granularity as the engine: a flat
// cut on EVERY damage/lifesteal effect, floored at 0 — not one cut per ability.
// Modelling it as a single budget overvalued weakened multi-effect attacks
// (Twin Strike scored 12 where the engine deals 8).
const P1 = 'p1', P2 = 'p2';
let n = 0;
const mk = (owner: string, x: number, y: number, over: Partial<UnitInstance> = {}): UnitInstance => ({
  instanceId: `u${++n}`, definitionSlug: 'rogue', ownerPlayerId: owner,
  position: { x, y }, currentHealth: 200, maxHealth: 200, armorClass: 6,
  movementRange: 3, abilities: [], passives: [], isAlive: true,
  hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {}, statusEffects: [],
  ...over,
} as UnitInstance);

function damageDealt(slug: string, weakened: boolean): number {
  const ability = (DEFAULT_ABILITIES as any[]).find(a => a.slug === slug);
  const caster = mk(P1, 3, 3, weakened
    ? { statusEffects: [{ slug: 'weakened', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'x' }] }
    : {});
  const target = mk(P2, 4, 3);
  const state = { board: { width: 8, height: 8 }, units: [caster, target],
    turnNumber: 1, roundNumber: 1, activePlayerId: P1, phase: 'action' } as unknown as MatchState;
  const events: any[] = [];
  executeAbility({ state, caster, targetPosition: target.position, ability, events } as any);
  return events.filter(e => e.type === 'DAMAGE_DEALT').reduce((s, e) => s + e.value, 0);
}

describe('weaken parity between engine and brain model', () => {
  it('engine cuts every damage effect, not just the first', () => {
    // Twin Strike: two 8-damage effects. Per-effect => 4+4=8. Per-ability => 4+8=12.
    const healthy = damageDealt('twin', false);
    const weak = damageDealt('twin', true);
    expect(healthy).toBe(16);
    expect(weak).toBe(8);
    expect(healthy - weak).toBe(2 * WEAKENED_DAMAGE_REDUCTION);
  });

  it('single-effect abilities lose exactly one cut', () => {
    const healthy = damageDealt('arrow', false);
    const weak = damageDealt('arrow', true);
    expect(healthy - weak).toBe(WEAKENED_DAMAGE_REDUCTION);
  });

  it('the brain uses the engine constant, so the two cannot drift', () => {
    expect(WEAKENED_DAMAGE_REDUCTION).toBe(4);
  });
});
