/**
 * burnDeathOnCommit.test.ts — a unit that burns to death when its turn starts.
 *
 * Owner repro 2026-08-31 (Unlit Beacon e4): a burning Barbarian attacked, the
 * tick killed him, "but I still have movement left on him, even though he's
 * dead". The engine was right on every count; the CLIENT's start-of-turn tick
 * preview wrote currentHealth without isAlive, so the corpse stayed actionable
 * and the engine then discarded the actions it was given.
 *
 * These pin the contract the client's preview now depends on: beginTurn reports
 * the death, and a unit killed by its own start tick performs nothing.
 */
import { describe, it, expect } from 'vitest';
import { processTurn, beginTurn } from '../src/game/turnProcessor.js';
import { willDieToStartTick } from '../src/game/abilityExecutor.js';
import type { MatchState, UnitInstance } from '../src/types/matchState.js';

const P1 = 'p1', P2 = 'p2';
let seq = 0;
function mk(owner: string, x: number, over: Partial<UnitInstance> = {}): UnitInstance {
  return {
    instanceId: `u${++seq}`, definitionSlug: 'barbarian', ownerPlayerId: owner,
    position: { x, y: 1 }, currentHealth: 50, maxHealth: 50, armorClass: 10,
    movementRange: 3, abilities: ['sword'], passives: [], isAlive: true,
    hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {}, statusEffects: [],
    ...over,
  } as UnitInstance;
}
function burning(stacks: number): UnitInstance['statusEffects'] {
  return [{ slug: 'burning', turnsRemaining: 2, stacks, sourceUnitInstanceId: 'src' }] as never;
}
function st(units: UnitInstance[], slot = 0): MatchState {
  return {
    board: { width: 8, height: 8 }, units, turnNumber: 9, roundNumber: 2,
    activePlayerId: units[slot].ownerPlayerId, phase: 'action',
    initiative: { order: units.map((u) => u.instanceId), slot,
      round1FirstPlayerId: P1, activeUnitId: units[slot].instanceId, isRound1: false },
  } as MatchState;
}

describe('a unit killed by its own start-of-turn burn tick', () => {
  it('beginTurn reports the death — the client reads isAlive from here', () => {
    const barb = mk(P1, 1, { currentHealth: 4, statusEffects: burning(2) });
    const s = st([barb, mk(P2, 5), mk(P1, 3)]);
    const r = beginTurn(s, { type: 'MOVE', unitInstanceId: barb.instanceId, destination: { x: 2, y: 1 } } as never,
      P1, P1, P2);
    const after = r.updatedState.units.find((u) => u.instanceId === barb.instanceId)!;
    expect(after.currentHealth).toBe(0);
    expect(after.isAlive).toBe(false);       // ← the field the preview was dropping
  });

  it('performs NOTHING — the queued move is discarded, not applied', () => {
    const barb = mk(P1, 1, { currentHealth: 4, statusEffects: burning(2) });
    const s = st([barb, mk(P2, 5), mk(P1, 3)]);
    const r = processTurn(s, [
      { type: 'MOVE', unitInstanceId: barb.instanceId, destination: { x: 2, y: 1 } },
      { type: 'END_TURN' },
    ] as never, P1, P1, P2, new Map());
    const after = r.updatedState.units.find((u) => u.instanceId === barb.instanceId)!;
    expect(r.success).toBe(true);
    expect(after.isAlive).toBe(false);
    expect(after.position).toEqual({ x: 1, y: 1 });   // never moved
    expect(after.hasMovedThisTurn).toBe(false);
    expect(r.events.map((e) => e.type)).toContain('UNIT_DIED');
  });

  it('survives when the tick is not lethal, and then acts normally', () => {
    const barb = mk(P1, 1, { currentHealth: 40, statusEffects: burning(2) });
    const s = st([barb, mk(P2, 5), mk(P1, 3)]);
    const r = processTurn(s, [
      { type: 'MOVE', unitInstanceId: barb.instanceId, destination: { x: 2, y: 1 } },
      { type: 'END_TURN' },
    ] as never, P1, P1, P2, new Map());
    const after = r.updatedState.units.find((u) => u.instanceId === barb.instanceId)!;
    expect(after.isAlive).toBe(true);
    expect(after.position).toEqual({ x: 2, y: 1 });
    expect(after.currentHealth).toBeLessThan(40);
  });

  it('willDieToStartTick agrees with what beginTurn actually does', () => {
    for (const [hp, stacks] of [[4, 2], [40, 2], [1, 1], [999, 4]] as [number, number][]) {
      const barb = mk(P1, 1, { currentHealth: hp, statusEffects: burning(stacks) });
      const doomed = willDieToStartTick(barb);
      const r = beginTurn(st([barb, mk(P2, 5), mk(P1, 3)]),
        { type: 'MOVE', unitInstanceId: barb.instanceId, destination: { x: 2, y: 1 } } as never, P1, P1, P2);
      const after = r.updatedState.units.find((u) => u.instanceId === barb.instanceId)!;
      expect(doomed, `hp ${hp} / ${stacks} stacks`).toBe(!after.isAlive);
    }
  });
});
