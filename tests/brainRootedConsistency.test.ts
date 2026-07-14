import { describe, it, expect } from 'vitest';
import { processTurn } from '../src/game/turnProcessor.js';
import { OptimalBrain } from '../src/ai/aiBrain.js';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import { MatchState, UnitInstance, InitiativeState } from '../src/types/matchState.js';

// Guards the offline-Fable path: when one of Fable's units is freshly rooted
// (durationTurns:2 from Fear/Grasp/Cold Snap), the brain must NOT plan a MOVE
// for it — otherwise processTurn would throw "rooted" and crash the offline turn.
// This asserts engine (tick-first) and brain (willBlockOwnAction >= 2) stay in sync.

const P1 = 'p1'; const FABLE = '00000000-0000-0000-0000-000000000001';
const abilityMap = buildAbilityMap();
const brain = new OptimalBrain();

const makeUnit = (id: string, owner: string, slug: string, x: number, y: number, overrides: Partial<UnitInstance> = {}): UnitInstance => ({
  instanceId: id, definitionSlug: slug, ownerPlayerId: owner,
  position: { x, y }, currentHealth: 30, maxHealth: 30,
  armorClass: 15, movementRange: 3, abilities: [slug === 'warlock' ? 'eldritch' : 'sword'], passives: [],
  isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
  cooldowns: {}, statusEffects: [], ...overrides,
});

describe('brain does not submit illegal moves for a rooted unit (offline crash guard)', () => {
  it('freshly-rooted Fable unit (1-turn Fear root): brain plan is accepted by the engine without throwing', () => {
    const fableUnit = makeUnit('f1', FABLE, 'fighter', 4, 4, {
      statusEffects: [{ slug: 'rooted', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'h1' }],
    });
    const human = makeUnit('h1', P1, 'fighter', 1, 1);
    const order = ['h1', 'f1'];
    const initiative = { order, slot: 1, round1FirstPlayerId: P1, activeUnitId: 'f1', isRound1: false, roundNumber: 2 } as InitiativeState;
    const state = { board: { width: 8, height: 8 }, units: [human, fableUnit], turnNumber: 10, activePlayerId: FABLE, phase: 'action', initiative } as MatchState;

    const actions = brain.selectActions(state, FABLE, abilityMap);
    // The brain must not have planned a MOVE for the rooted unit.
    expect(actions.some((a) => a.type === 'MOVE')).toBe(false);
    // And whatever it planned must process cleanly (no "rooted" throw).
    expect(() => processTurn(state, actions, FABLE, P1, FABLE, abilityMap)).not.toThrow();
  });
});
