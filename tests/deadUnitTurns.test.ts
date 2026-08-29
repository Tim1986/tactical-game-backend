/**
 * deadUnitTurns.test.ts — dead units cost nothing; frozen units still cost a turn.
 *
 * Owner ruling 2026-08-28: the combat log was drowning in "defeated, turn
 * skipped" — worst in campaigns, where whole waves lie dead, and in any arena
 * match past the first casualty. A dead unit now has no turn at all: no event,
 * no turn number. A FROZEN unit is deliberately the opposite, because losing a
 * turn to ice happened to a living unit and the player wants to know.
 *
 * The knock-on pinned here is rounds. A round is one LAP of the initiative
 * order, not turnNumber/8 — that derivation was equivalent only while every
 * slot consumed a turn number, and would now drift by one turn per death,
 * taking the round-11 endgame with it.
 */
import { describe, it, expect } from 'vitest';
import { processTurn } from '../src/game/turnProcessor.js';
import type { MatchState, UnitInstance } from '../src/types/matchState.js';

const P1 = 'p1', P2 = 'p2';
let seq = 0;
function mk(owner: string, x: number, over: Partial<UnitInstance> = {}): UnitInstance {
  return {
    instanceId: `u${++seq}`, definitionSlug: 'fighter', ownerPlayerId: owner,
    position: { x, y: 1 }, currentHealth: 50, maxHealth: 50, armorClass: 10,
    movementRange: 3, abilities: ['sword'], passives: [], isAlive: true,
    hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {}, statusEffects: [],
    ...over,
  } as UnitInstance;
}
function st(units: UnitInstance[], slot = 0, over: Partial<MatchState> = {}): MatchState {
  return {
    board: { width: 8, height: 8 }, units, turnNumber: 9, roundNumber: 2,
    activePlayerId: units[slot].ownerPlayerId, phase: 'action',
    initiative: { order: units.map(u => u.instanceId), slot,
      round1FirstPlayerId: P1, activeUnitId: units[slot].instanceId, isRound1: false },
    ...over,
  } as MatchState;
}
const END = [{ type: 'END_TURN' as const }];

describe('a dead unit has no turn', () => {
  it('produces no combat-log entry and consumes no turn number', () => {
    // Both sides must keep a living unit or the match is already over and the
    // turn never finishes — which is itself why these fixtures look padded.
    const a = mk(P1, 1), dead = mk(P2, 2, { isAlive: false, currentHealth: 0 }), c = mk(P1, 3), live2 = mk(P2, 4);
    const s = st([a, dead, c, live2]);
    const r = processTurn(s, END, P1, P1, P2, new Map());
    expect(r.events.some(e => e.type === 'TURN_SKIPPED')).toBe(false);
    expect(r.updatedState.turnNumber).toBe(10);            // 9 + the acting turn only
    expect(r.updatedState.initiative!.activeUnitId).toBe(c.instanceId);
  });

  it('several dead in a row still cost nothing', () => {
    const a = mk(P1, 1);
    const d1 = mk(P2, 2, { isAlive: false }), d2 = mk(P1, 3, { isAlive: false }), d3 = mk(P2, 4, { isAlive: false });
    const e = mk(P1, 5), live2 = mk(P2, 6);
    const r = processTurn(st([a, d1, d2, d3, e, live2]), END, P1, P1, P2, new Map());
    expect(r.updatedState.turnNumber).toBe(10);
    expect(r.updatedState.initiative!.activeUnitId).toBe(e.instanceId);
    expect(r.events.filter(ev => ev.type === 'TURN_SKIPPED')).toHaveLength(0);
  });
});

describe('a frozen unit still has a turn', () => {
  it('is reported in the log and consumes a turn number', () => {
    const a = mk(P1, 1);
    const frozen = mk(P2, 2, { statusEffects: [
      { slug: 'frozen', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'x' }] });
    const c = mk(P1, 3);
    const r = processTurn(st([a, frozen, c]), END, P1, P1, P2, new Map());
    const skip = r.events.find(e => e.type === 'TURN_SKIPPED');
    expect(skip?.sourceUnitInstanceId).toBe(frozen.instanceId);
    expect(r.updatedState.turnNumber).toBe(11);            // acting turn + the frozen one
    expect(r.updatedState.initiative!.activeUnitId).toBe(c.instanceId);
  });
});

describe('rounds are laps of the order, not turnNumber/8', () => {
  it('advances the round when the order wraps, however short the lap has become', () => {
    // Two live units and two dead: a lap is now two turns, not four.
    const a = mk(P1, 1), dead = mk(P2, 2, { isAlive: false }), b = mk(P2, 3), dead2 = mk(P1, 4, { isAlive: false });
    let s: MatchState = st([a, dead, b, dead2], 0, { roundNumber: 4 });
    const r1 = processTurn(s, END, P1, P1, P2, new Map());
    expect(r1.updatedState.roundNumber).toBe(4);           // mid-lap
    s = r1.updatedState;
    const r2 = processTurn(s, END, P2, P1, P2, new Map());
    expect(r2.updatedState.roundNumber).toBe(5);           // wrapped
  });
});
