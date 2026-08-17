/**
 * A4 — waves, doors, rooms (ENCOUNTER_SPEC.md). Initiative weave per the
 * owner's rule (party order never resets; spawns act same-round; surprise
 * skips one slot), spawn triggers, pending-content win suppression, and full
 * room transitions. All campaign-only via MatchState.encounterProgress.
 */
import { describe, it, expect } from 'vitest';
import {
  MatchState, UnitInstance, EncounterProgressState, PendingWave,
} from '../src/types/matchState.js';
import { weaveIntoInitiative, spawnWave, checkSpawnTriggers, maybeRoomTransition, hasPendingContent } from '../src/game/encounterFlow.js';
import { checkWinCondition } from '../src/game/winCondition.js';

const P = 'party-id';
const E = 'enemy-id';

let seq = 0;
const mk = (owner: string, x: number, y: number, over: Partial<UnitInstance> = {}): UnitInstance => ({
  instanceId: `u${++seq}`, definitionSlug: 'test', ownerPlayerId: owner,
  position: { x, y }, currentHealth: 50, maxHealth: 50, isAlive: true,
  hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {},
  statusEffects: [], passives: [], abilities: [], armorClass: 8, movementRange: 3,
  ...over,
} as unknown as UnitInstance);

const progress = (over: Partial<EncounterProgressState> = {}, partyIds: string[] = []): EncounterProgressState => ({
  waves: [], rooms: [], exitDoors: [], doorMode: 'on_clear', partyIds, roomIndex: 0, ...over,
});

const mkState = (units: UnitInstance[], ep?: EncounterProgressState, roundNumber = 3): MatchState => ({
  units, turnNumber: 20, roundNumber, activePlayerId: P, phase: 'action',
  initiative: {
    order: units.map((u) => u.instanceId), slot: 0,
    round1FirstPlayerId: P, activeUnitId: units[0]?.instanceId ?? null, isRound1: false,
  },
  ...(ep ? { encounterProgress: ep } : {}),
} as unknown as MatchState);

const wave = (units: UnitInstance[], trigger: PendingWave['trigger'], over: Partial<PendingWave> = {}): PendingWave =>
  ({ units, placement: units.map((_, i) => ({ x: 6, y: 2 + i })), trigger, ...over });

describe('A4 — initiative weave (owner rule)', () => {
  it('weaves a spawn into the first party slot lacking a follower; extras append', () => {
    const p1 = mk(P, 1, 1), e1 = mk(E, 5, 1), p2 = mk(P, 1, 2), p3 = mk(P, 1, 3), p4 = mk(P, 1, 4);
    // Order: P1,E1,P2,P3,P4 — P2 is the first party unit with no enemy after it.
    const st = mkState([p1, e1, p2, p3, p4], progress({}, [p1, p2, p3, p4].map((u) => u.instanceId)));
    const s1 = mk(E, 6, 6), s2 = mk(E, 6, 7);
    weaveIntoInitiative(st, [s1, s2], []);
    expect(st.initiative.order).toEqual([
      p1.instanceId, e1.instanceId, p2.instanceId, s1.instanceId, p3.instanceId, s2.instanceId, p4.instanceId,
    ]);
  });

  it('keeps the pointer on the acting unit when inserting before it', () => {
    const p1 = mk(P, 1, 1), e1 = mk(E, 5, 1), p2 = mk(P, 1, 2);
    const st = mkState([p1, e1, p2], progress({}, [p1, p2].map((u) => u.instanceId)));
    st.initiative.slot = 2; // acting: p2
    const s1 = mk(E, 6, 6);
    weaveIntoInitiative(st, [s1], []); // inserts after p2 → index 3, after slot
    expect(st.initiative.order[st.initiative.slot]).toBe(p2.instanceId);
    const s2 = mk(E, 6, 7);
    weaveIntoInitiative(st, [s2], []); // next open party slot is p1?? p1 has e1 after → after s1? appended
    expect(st.initiative.order[st.initiative.slot]).toBe(p2.instanceId); // pointer never drifts
  });

  it('surprise spawns carry skipFirstSlot; spawnWave places on occupied → nearest free', () => {
    const p1 = mk(P, 1, 1), e1 = mk(E, 6, 2);
    const st = mkState([p1, e1], progress({}, [p1.instanceId]));
    const s1 = mk(E, 0, 0);
    spawnWave(st, wave([s1], { on: 'round', round: 1 }, { surprise: true, placement: [{ x: 6, y: 2 }] }), []);
    expect(s1.skipFirstSlot).toBe(true);
    // authored tile (6,2) occupied by e1 → nearest free ring tile
    expect(s1.position).not.toEqual({ x: 6, y: 2 });
    expect(Math.abs(s1.position.x - 6) + Math.abs(s1.position.y - 2)).toBe(1);
    expect(st.units).toContain(s1);
  });
});

describe('A4 — spawn triggers', () => {
  it('round trigger fires when the round arrives, not before', () => {
    const p1 = mk(P, 1, 1), e1 = mk(E, 5, 1), s1 = mk(E, 6, 6);
    const ep = progress({ waves: [wave([s1], { on: 'round', round: 5 })] }, [p1.instanceId]);
    const st = mkState([p1, e1], ep, 4);
    checkSpawnTriggers(st, []);
    expect(st.units).not.toContain(s1);
    st.roundNumber = 5;
    checkSpawnTriggers(st, []);
    expect(st.units).toContain(s1);
    expect(ep.waves.length).toBe(0);
  });

  it('room_cleared trigger fires only when the board is clear of enemies', () => {
    const p1 = mk(P, 1, 1), e1 = mk(E, 5, 1), s1 = mk(E, 6, 6);
    const ep = progress({ waves: [wave([s1], { on: 'room_cleared' })] }, [p1.instanceId]);
    const st = mkState([p1, e1], ep);
    checkSpawnTriggers(st, []);
    expect(st.units).not.toContain(s1);
    e1.isAlive = false;
    checkSpawnTriggers(st, []);
    expect(st.units).toContain(s1);
  });

  it('door trigger fires when a PARTY unit stands on the tile (movers only)', () => {
    const p1 = mk(P, 3, 3), e1 = mk(E, 5, 1), s1 = mk(E, 6, 6);
    const ep = progress({ waves: [wave([s1], { on: 'door', tile: { x: 3, y: 3 } })] }, [p1.instanceId]);
    const st = mkState([p1, e1], ep);
    checkSpawnTriggers(st, [], e1);      // an enemy on the tile does nothing
    expect(st.units).not.toContain(s1);
    checkSpawnTriggers(st, [], p1);      // the party mover opens it
    expect(st.units).toContain(s1);
  });
});

describe('A4 — pending content suppresses wins', () => {
  it('kill-all objective does not fire on a clear board with waves pending', () => {
    const p1 = mk(P, 1, 1);
    const deadE = mk(E, 5, 5, { isAlive: false });
    const s1 = mk(E, 6, 6);
    const ep = progress({ waves: [wave([s1], { on: 'round', round: 9 })] }, [p1.instanceId]);
    const st = mkState([p1, deadE], ep);
    (st as MatchState).objective = {
      partyId: P, enemyId: E, mainId: p1.instanceId, text: 'x',
      win: [{ kind: 'all_enemies_dead' }], loss: [],
    };
    expect(hasPendingContent(st)).toBe(true);
    expect(checkWinCondition(st, P, E).isOver).toBe(false);
    ep.waves = [];
    expect(checkWinCondition(st, P, E).isOver).toBe(true);
  });
});

describe('A4 — room transitions', () => {
  const twoRoomState = (doorMode: 'on_clear' | 'always') => {
    const p1 = mk(P, 3, 3), p2 = mk(P, 3, 4), e1 = mk(E, 5, 5);
    const g1 = mk(E, 0, 0), g2 = mk(E, 0, 0);
    const ep = progress({
      exitDoors: [{ x: 7, y: 3 }], doorMode,
      rooms: [{
        terrain: { blocked: [{ x: 4, y: 4 }], hazards: [] },
        units: [g1, g2], placement: [{ x: 6, y: 3 }, { x: 6, y: 4 }],
        waves: [], exitDoors: [], doorMode: 'on_clear',
        entryTiles: [{ x: 1, y: 3 }, { x: 1, y: 4 }],
      }],
    }, [p1.instanceId, p2.instanceId]);
    return { st: mkState([p1, p2, e1], ep), p1, p2, e1, g1, g2, ep };
  };

  it('on_clear door refuses while enemies live, then transitions: carve swaps, party re-enters, garrison weaves in', () => {
    const { st, p1, p2, e1, g1, ep } = twoRoomState('on_clear');
    p1.position = { x: 7, y: 3 };
    expect(maybeRoomTransition(st, p1, [])).toBe(false); // e1 still alive
    e1.isAlive = false;
    const events: never[] = [];
    expect(maybeRoomTransition(st, p1, events as never)).toBe(true);
    expect(st.terrain?.blocked).toEqual([{ x: 4, y: 4 }]);      // new carve
    expect(p1.position).toEqual({ x: 1, y: 3 });                 // entry tiles, party order
    expect(p2.position).toEqual({ x: 1, y: 4 });
    expect(st.units).toContain(g1);                              // garrison spawned
    expect(st.initiative.order).toContain(g1.instanceId);        // and woven in
    expect(ep.rooms.length).toBe(0);
    expect(ep.roomIndex).toBe(1);
    expect(hasPendingContent(st)).toBe(false);
  });

  it("an 'always' door abandons living enemies — removed from match and initiative", () => {
    const { st, p1, e1 } = twoRoomState('always');
    p1.position = { x: 7, y: 3 };
    expect(maybeRoomTransition(st, p1, [])).toBe(true);          // enemies alive, door works anyway
    expect(st.units.find((u) => u.instanceId === e1.instanceId)).toBeUndefined();
    expect(st.initiative.order).not.toContain(e1.instanceId);
  });

  it('a non-party unit on the door does not transition', () => {
    const { st, e1 } = twoRoomState('always');
    e1.position = { x: 7, y: 3 };
    expect(maybeRoomTransition(st, e1, [])).toBe(false);
  });
});
