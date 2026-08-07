/**
 * displacementValidation.test.ts — the client may STEER a displacement (which
 * cardinal Fear shoves toward, which corner a diagonal Shadow Grasp cuts), but
 * it may not invent one.
 *
 * Regression: `pushDestination` used to be passed straight from the request
 * body into applyPush with no validation, so a crafted value shoved a unit any
 * distance in any direction — a 2-tile push became a 6-tile teleport, and it
 * could even drag a unit TOWARD the attacker.
 */
import { describe, it, expect } from 'vitest';
import { processTurn, TurnValidationError } from '../src/game/turnProcessor.js';
import { MatchState, UnitInstance } from '../src/types/matchState.js';
import { AbilityDefinition } from '../src/types/index.js';

const P1 = 'player-one';
const P2 = 'player-two';

const shove: AbilityDefinition = {
  slug: 'shove', name: 'Shove', description: '', targetingType: 'single',
  range: 2, areaRadius: 0, cooldownTurns: 0, isSpecial: false, isUnblockable: true,
  effects: [{ type: 'push', direction: 'away_from_caster', distance: 2 }],
} as AbilityDefinition;

const mkUnit = (id: string, owner: string, x: number, y: number): UnitInstance => ({
  instanceId: id, definitionSlug: 'test', ownerPlayerId: owner,
  position: { x, y }, currentHealth: 100, maxHealth: 100, isAlive: true,
  hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {},
  statusEffects: [], passives: [], abilities: ['shove'], armorClass: 1, movementRange: 3,
} as unknown as UnitInstance);

function mkState(): MatchState {
  // caster at (3,2), victim directly below at (3,3): a clean cardinal push south.
  return {
    units: [mkUnit('caster', P1, 3, 2), mkUnit('victim', P2, 3, 3)],
    turnNumber: 2, activePlayerId: P1, playerOneId: P1, playerTwoId: P2,
  } as unknown as MatchState;
}

const abilityMap = new Map<string, AbilityDefinition>([['shove', shove]]);

function push(pushDestination?: { x: number; y: number }) {
  const state = mkState();
  const actions: any[] = [
    { type: 'USE_ABILITY', unitInstanceId: 'caster', abilitySlug: 'shove', target: { x: 3, y: 3 }, ...(pushDestination ? { pushDestination } : {}) },
    { type: 'END_TURN' },
  ];
  const result = processTurn(state, actions, P1, P1, P2, abilityMap);
  const victim = result.updatedState.units.find((u) => u.instanceId === 'victim')!;
  return victim.position;
}

describe('displacement destinations are validated server-side', () => {
  it('an honest push travels exactly the ability distance', () => {
    expect(push()).toEqual({ x: 3, y: 5 });
  });

  it('REJECTS a destination further than the ability allows', () => {
    // (3,7) is 4 tiles away from a 2-tile push — the old code obeyed it.
    expect(() => push({ x: 3, y: 7 })).toThrow(TurnValidationError);
  });

  it('REJECTS a destination in a direction the push cannot travel', () => {
    // Sideways, and toward the caster — never legal for "away_from_caster".
    expect(() => push({ x: 6, y: 3 })).toThrow(TurnValidationError);
    expect(() => push({ x: 3, y: 1 })).toThrow(TurnValidationError);
  });

  it('ACCEPTS the legitimate destination', () => {
    expect(push({ x: 3, y: 5 })).toEqual({ x: 3, y: 5 });
  });
});
