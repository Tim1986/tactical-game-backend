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
    // The forced commit IS this unit's round-1 slot, skipped by the freeze, so
    // the freeze ticks here exactly as it would in advanceSlot (rulebook TRN-6).
    // This assertion used to expect 2 (no tick), which made a 2-turn freeze cost
    // the victim THREE turns: the free round-1 skip plus two ticked slots
    // (COMBAT_AUDIT C22b item 5 — owner-reported).
    const after = result.updatedState.units.find((u) => u.instanceId === 'u2')!;
    expect(after.statusEffects.find((se) => se.slug === 'frozen')?.turnsRemaining).toBe(1);
    expect(result.events.some((e) => e.type === 'TURN_SKIPPED' && e.sourceUnitInstanceId === 'u2')).toBe(true);
  });

  it('a 2-turn freeze on an uncommitted round-1 unit costs exactly 2 skipped turns', () => {
    // End-to-end duration count for the owner-reported bug: round-1 forced
    // commit (skip 1) → next slot ticks to 0 and skips (skip 2) → then free.
    const frozen = makeUnit('u2', P2, 4, 4, { statusEffects: [{ slug: 'frozen', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'u1' }] });
    const other = makeUnit('u1', P1, 0, 0);
    const initiative = { order: ['u1'], slot: -1, round1FirstPlayerId: P1, activeUnitId: null, isRound1: true } as unknown as InitiativeState;
    const state = { board: { width: 8, height: 8 }, units: [other, frozen], turnNumber: 2, activePlayerId: P2, phase: 'action', initiative } as MatchState;

    const r1 = processTurn(state, [{ type: 'END_TURN' }], P2, P1, P2, abilityMap);
    const afterCommit = r1.updatedState.units.find((u) => u.instanceId === 'u2')!;
    expect(afterCommit.statusEffects.find((se) => se.slug === 'frozen')?.turnsRemaining).toBe(1);

    // u1 takes its round-2 turn; advancing past u2's slot ticks the last point off.
    const s2 = r1.updatedState;
    s2.activePlayerId = P1;
    const r2 = processTurn(s2, [{ type: 'END_TURN' }], P1, P1, P2, abilityMap);
    const afterSecond = r2.updatedState.units.find((u) => u.instanceId === 'u2')!;
    expect(afterSecond.statusEffects.some((se) => se.slug === 'frozen')).toBe(false);
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
