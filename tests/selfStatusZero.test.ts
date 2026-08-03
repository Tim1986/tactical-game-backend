/**
 * A self-status priced at 0 turns must not be applied at all.
 * Without the guard it would be PERMANENT: decrementStatusDurations only ticks
 * effects with turnsRemaining > 0, and move/charge validation checks only for
 * the PRESENCE of 'rooted' — so a 0-turn channel would immobilise its caster
 * for the whole match (found while removing Blizzard's self-root, AC rework
 * pass 13).
 */
import { describe, it, expect } from 'vitest';
import { executeAbility } from '../src/game/abilityExecutor.js';
import { MatchState, UnitInstance, GameEvent } from '../src/types/matchState.js';
import { AbilityDefinition } from '../src/types/index.js';

const mkUnit = (id: string, owner: string, x: number, y: number): UnitInstance => ({
  instanceId: id, definitionSlug: 'wizard', ownerPlayerId: owner,
  position: { x, y }, currentHealth: 40, maxHealth: 40, armorClass: 6,
  movementRange: 3, abilities: ['missile'], passives: [], isAlive: true,
  hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {}, statusEffects: [],
});

const mkAbility = (selfDur: number): AbilityDefinition => ({
  id: 'a', slug: 'test_channel', name: 'Test', description: '',
  targetingType: 'aoe', range: 2, areaRadius: 1, cooldownTurns: 0,
  isSpecial: true, isUnblockable: true,
  selfStatus: { statusSlug: 'rooted', stacks: 1, durationTurns: selfDur },
  effects: [{ type: 'apply_status', statusSlug: 'frozen', stacks: 1, durationTurns: 1 }],
} as unknown as AbilityDefinition);

describe('self-status with 0 duration', () => {
  const run = (dur: number) => {
    const caster = mkUnit('c', 'p1', 3, 3);
    const foe = mkUnit('f', 'p2', 4, 3);
    const state = { board: { width: 8, height: 8 }, units: [caster, foe] } as unknown as MatchState;
    const events: GameEvent[] = [];
    executeAbility({ state, caster, targetPosition: foe.position, ability: mkAbility(dur), events });
    return caster;
  };

  it('does NOT apply the self-status when priced at 0 turns', () => {
    expect(run(0).statusEffects.some((se) => se.slug === 'rooted')).toBe(false);
  });

  it('still applies it at 1 turn', () => {
    const c = run(1);
    const r = c.statusEffects.find((se) => se.slug === 'rooted');
    expect(r?.turnsRemaining).toBe(1);
  });
});
