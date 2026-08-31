/**
 * roomAttrition.test.ts — the cost of a crossing.
 *
 * Owner spec 2026-08-31: "If everyone needs to get across, there needs to be a
 * cost. Tick one damage on each unit at the end of their turns, this encourages
 * playing strategically and advancing with reasonable speed." Clarified the
 * same day: "the ticking only starts once the door is unlocked."
 */
import { describe, it, expect } from 'vitest';
import { applyRoomAttrition, ROOM_ATTRITION_DAMAGE } from '../src/game/encounterFlow.js';
import type { MatchState, UnitInstance, GameEvent } from '../src/types/matchState.js';

const P = 'p1', E = 'p2';
let seq = 0;
const mk = (owner: string, over: Partial<UnitInstance> = {}): UnitInstance => ({
  instanceId: `u${++seq}`, definitionSlug: 'fighter', ownerPlayerId: owner,
  position: { x: 1, y: 1 }, currentHealth: 40, maxHealth: 40, armorClass: 6,
  movementRange: 3, abilities: ['sword'], passives: [], isAlive: true,
  hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {}, statusEffects: [],
  ...over,
} as UnitInstance);

function st(units: UnitInstance[], doors: { x: number; y: number }[], mode: 'on_clear' | 'always'): MatchState {
  return {
    board: { width: 8, height: 8 }, units, roundNumber: 1,
    encounterProgress: {
      waves: [], rooms: [{}], exitDoors: doors, doorMode: mode,
      partyIds: units.filter((u) => u.ownerPlayerId === P).map((u) => u.instanceId),
      roomIndex: 0, roomEnteredRound: 0,
    },
  } as unknown as MatchState;
}

describe('room attrition', () => {
  it('ticks a party member once its room\'s door is unlocked', () => {
    const p = mk(P);
    const s = st([p], [{ x: 7, y: 3 }], 'on_clear');   // no enemies = door open
    const ev: GameEvent[] = [];
    applyRoomAttrition(s, p, ev);
    expect(p.currentHealth).toBe(40 - ROOM_ATTRITION_DAMAGE);
    expect(ev.some((e) => e.type === 'DAMAGE_DEALT')).toBe(true);
  });

  it('does NOT tick while the door is still locked', () => {
    // "The ticking only starts once the door is unlocked" — a fight you cannot
    // yet walk away from must not bleed you for fighting it.
    const p = mk(P), foe = mk(E);
    const s = st([p, foe], [{ x: 7, y: 3 }], 'on_clear');
    applyRoomAttrition(s, p, []);
    expect(p.currentHealth).toBe(40);
  });

  it('an ALWAYS door ticks from the start — it was never locked', () => {
    const p = mk(P), foe = mk(E);
    const s = st([p, foe], [{ x: 7, y: 3 }], 'always');
    applyRoomAttrition(s, p, []);
    expect(p.currentHealth).toBe(39);
  });

  it('never ticks the ENEMY — waiting must not pay', () => {
    const p = mk(P), foe = mk(E);
    const s = st([p, foe], [{ x: 7, y: 3 }], 'always');
    applyRoomAttrition(s, foe, []);
    expect(foe.currentHealth).toBe(40);
  });

  it('is inert in a room with no exit — the last room, and every arena match', () => {
    const p = mk(P);
    const s = st([p], [], 'on_clear');
    applyRoomAttrition(s, p, []);
    expect(p.currentHealth).toBe(40);
    const arena = { board: { width: 8, height: 8 }, units: [p] } as unknown as MatchState;
    applyRoomAttrition(arena, p, []);
    expect(p.currentHealth).toBe(40);
  });

  it('does not tick the dead', () => {
    const p = mk(P, { isAlive: false, currentHealth: 0 });
    const s = st([p], [{ x: 7, y: 3 }], 'always');
    applyRoomAttrition(s, p, []);
    expect(p.currentHealth).toBe(0);
  });
});
