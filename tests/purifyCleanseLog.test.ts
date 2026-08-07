/**
 * purifyCleanseLog.test.ts — Purify's cleanse must be visible in the combat log
 * (owner-reported: "Purify does not have a line after removing Frozen").
 *
 * The client shows a "no longer <status>" line ONLY for a STATUS_REMOVED event
 * that carries a sourceUnitInstanceId — that tag is what distinguishes a
 * deliberate cleanse (Purify) from natural status expiry, which stays silent.
 * So the contract the log line depends on is: a remove_status effect emits
 * STATUS_REMOVED WITH the caster as source, and ONLY when a status was present.
 */
import { describe, it, expect } from 'vitest';
import { executeAbility } from '../src/game/abilityExecutor.js';
import { MatchState, UnitInstance } from '../src/types/matchState.js';
import { AbilityDefinition } from '../src/types/index.js';

const mkUnit = (id: string, x: number, y: number, statusSlugs: string[] = []): UnitInstance => ({
  instanceId: id, definitionSlug: 'cleric', ownerPlayerId: 'p1',
  position: { x, y }, currentHealth: 30, maxHealth: 50, isAlive: true,
  hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {}, passives: [],
  statusEffects: statusSlugs.map((slug) => ({ slug, turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'x' })),
} as unknown as UnitInstance);

const purify: AbilityDefinition = {
  slug: 'purify', name: 'Purify', description: '', targetingType: 'single',
  range: 3, areaRadius: 0, cooldownTurns: 0, isSpecial: true, isUnblockable: true,
  effects: [
    { type: 'remove_status', statusSlug: 'frozen' },
    { type: 'remove_status', statusSlug: 'rooted' },
    { type: 'heal', formula: 'flat', value: 19 },
  ],
} as unknown as AbilityDefinition;

function cast(target: UnitInstance) {
  const caster = mkUnit('cleric', 1, 1);
  const events: any[] = [];
  executeAbility({ state: { units: [caster, target] } as MatchState, caster, targetPosition: target.position, ability: purify, events } as any);
  return { events, casterId: caster.instanceId };
}

describe('Purify cleanse is loggable', () => {
  it('emits STATUS_REMOVED with the caster as source for each status actually removed', () => {
    const ally = mkUnit('ally', 1, 2, ['frozen', 'rooted']);
    const { events, casterId } = cast(ally);
    const removed = events.filter((e) => e.type === 'STATUS_REMOVED');
    expect(removed.map((e) => e.statusSlug).sort()).toEqual(['frozen', 'rooted']);
    // The source tag is what makes the client render the log line.
    for (const e of removed) {
      expect(e.sourceUnitInstanceId).toBe(casterId);
      expect(e.targetUnitInstanceId).toBe('ally');
    }
  });

  it('does NOT emit STATUS_REMOVED for a status the target never had', () => {
    const ally = mkUnit('ally', 1, 2, ['frozen']); // no rooted
    const { events } = cast(ally);
    const removed = events.filter((e) => e.type === 'STATUS_REMOVED');
    expect(removed.map((e) => e.statusSlug)).toEqual(['frozen']);
  });
});
