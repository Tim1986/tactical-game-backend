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
      exitDoors: [{ x: 7, y: 3 }, { x: 7, y: 4 }], doorMode,
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
    // ⚠ THE WHOLE PARTY CROSSES (owner spec 2026-08-31): one unit on the door
    // is no longer enough, so the door still refuses until p2 arrives.
    expect(maybeRoomTransition(st, p1, [])).toBe(false);
    p2.position = { x: 7, y: 4 };
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

  // Owner ruling 2026-08-24: survivors FOLLOW the party through an 'always'
  // door rather than being deleted. Deleting them made the door a free
  // room-skip — walk out and everything still standing ceased to exist.
  it("an 'always' door lets living enemies FOLLOW the party through", () => {
    const { st, p1, p2, e1 } = twoRoomState('always');
    const hpBefore = e1.currentHealth;
    const oldPos = { ...e1.position };
    p1.position = { x: 7, y: 3 };
    p2.position = { x: 7, y: 4 };                               // whole party on the doors
    expect(maybeRoomTransition(st, p1, [])).toBe(true);          // enemies alive, door works anyway

    const follower = st.units.find((u) => u.instanceId === e1.instanceId);
    expect(follower, 'the survivor must still be in the match').toBeDefined();
    expect(st.initiative.order, 'and must keep its initiative slot').toContain(e1.instanceId);
    // It kept its state and changed only its tile — it walked, it did not respawn.
    expect(follower!.currentHealth).toBe(hpBefore);
    expect(follower!.position).not.toEqual(oldPos);
    // And it arrived NEAR the party, not back where it started.
    const party = st.units.find((u) => u.instanceId === p1.instanceId)!;
    const dist = Math.abs(follower!.position.x - party.position.x)
      + Math.abs(follower!.position.y - party.position.y);
    expect(dist, 'a pursuer should come through at the party\'s back').toBeLessThanOrEqual(4);
  });

  it('a non-party unit on the door does not transition', () => {
    const { st, e1 } = twoRoomState('always');
    e1.position = { x: 7, y: 3 };
    expect(maybeRoomTransition(st, e1, [])).toBe(false);
  });
});

describe('A4 — transition timing regression (D2 Goblinopolis bug)', () => {
  it('MOVE onto a door + queued ability: ability resolves in the OLD room, transition fires at end of turn', async () => {
    const { processTurn } = await import('../src/game/turnProcessor.js');
    const { buildAbilityMap } = await import('../src/ai/defaultData.js');
    const map = buildAbilityMap();
    // Party unit with heal, standing 2 from the door; wounded ally beside the
    // door's OLD-room neighborhood. Board clear -> on_clear door is active.
    const healer = mk(P, 5, 3, { abilities: ['heal'], cooldowns: { heal: 0 }, movementRange: 3 });
    const buddy  = mk(P, 7, 4, { currentHealth: 20 });  // parked on the second door
    const g1 = mk(E, 0, 0);
    // Two doors: the whole party must fit on them (owner spec 2026-08-31), and
    // the buddy is parked on the second one so the healer's arrival is what
    // completes the crossing — which is the moment this test is about.
    const ep = progress({
      exitDoors: [{ x: 7, y: 3 }, { x: 7, y: 4 }], doorMode: 'on_clear',
      rooms: [{
        units: [g1], placement: [{ x: 6, y: 3 }], waves: [],
        exitDoors: [], doorMode: 'on_clear',
        entryTiles: [{ x: 1, y: 3 }, { x: 1, y: 4 }],
      }],
    }, [healer.instanceId, buddy.instanceId]);
    const st = mkState([healer, buddy], ep);
    // Real builds always synthesize an objective when encounterProgress exists
    // (pending-content suppression lives there) — mirror that.
    st.objective = { partyId: P, enemyId: E, mainId: healer.instanceId, text: 'x', win: [{ kind: 'all_enemies_dead' }], loss: [] } as never;
    st.turnContext = undefined;
    st.initiative.activeUnitId = healer.instanceId;
    // The exact failing shape: MOVE ends on the door, heal targets a tile that
    // only exists in the old room's geometry. Pre-fix this threw
    // "Target out of range" because the transition teleported the healer first.
    const r = processTurn(st, [
      { type: 'MOVE', unitInstanceId: healer.instanceId, destination: { x: 7, y: 3 } },
      { type: 'USE_ABILITY', unitInstanceId: healer.instanceId, abilitySlug: 'heal', target: { x: 7, y: 4 } },
      { type: 'END_TURN' },
    ] as never, P, P, E, map);
    const ws = r.updatedState;
    const healedBuddy = ws.units.find((u) => u.instanceId === buddy.instanceId)!;
    expect(healedBuddy.currentHealth).toBe(47);                       // 20 + 27, resolved pre-transition
    expect(ws.encounterProgress!.roomIndex).toBe(1);                  // transition DID fire...
    expect(r.events.findIndex((e) => e.type === 'ROOM_ENTERED'))
      .toBeGreaterThan(r.events.findIndex((e) => e.type === 'HEALING_DONE')); // ...after the heal
    const movedHealer = ws.units.find((u) => u.instanceId === healer.instanceId)!;
    expect(movedHealer.position).toEqual({ x: 1, y: 3 });             // party entered room 2
  });

  // ⚠ THIS TEST WAS INVERTED ON 2026-08-27. It used to assert that ending a
  // turn on an open door WITHOUT moving does NOT transition — and that rule
  // was a softlock, not a requirement:
  //   1. a unit steps onto an 'on_clear' door while enemies live (door shut,
  //      transition correctly declines);
  //   2. the party kills the last enemy, opening the door;
  //   3. that unit is already ON the door and has no reason to move again;
  //   4. the transition only fired on MOVEMENT, so it never fired again.
  // The party mills at an open door forever. campaignSim scored 13-15% of e8
  // medium games as "draws (stall)" with exactly this fingerprint, which also
  // made e8 read as a melee WALL (13%) in the battery.
  //
  // The movement test was never what fixed the D2 Goblinopolis bug — that fix
  // was about TIMING (run the transition at END of turn so queued actions
  // resolve in the old room's geometry), and the test above still guards it.
  // The real invariant is the one maybeRoomTransition's docstring states:
  // "a party unit ENDED ITS TURN on an ACTIVE exit door". Both halves are
  // asserted below.
  it('a unit that ENDS its turn on a NEWLY-OPENED door transitions even without moving', async () => {
    const { processTurn } = await import('../src/game/turnProcessor.js');
    const { buildAbilityMap } = await import('../src/ai/defaultData.js');
    const map = buildAbilityMap();
    const sitter = mk(P, 7, 3, { movementRange: 3 });   // starts ON the door
    const buddy  = mk(P, 7, 4);                        // ...and so does the rest of the party
    const g1 = mk(E, 0, 0);
    const ep = progress({
      exitDoors: [{ x: 7, y: 3 }, { x: 7, y: 4 }], doorMode: 'on_clear',
      rooms: [{ units: [g1], placement: [{ x: 6, y: 3 }], waves: [], exitDoors: [], doorMode: 'on_clear', entryTiles: [{ x: 1, y: 3 }, { x: 1, y: 4 }] }],
    }, [sitter.instanceId, buddy.instanceId]);
    const st = mkState([sitter, buddy], ep);
    st.objective = { partyId: P, enemyId: E, mainId: sitter.instanceId, text: 'x', win: [{ kind: 'all_enemies_dead' }], loss: [] } as never;
    st.turnContext = undefined;
    st.initiative.activeUnitId = sitter.instanceId;
    const r = processTurn(st, [
      { type: 'MOVE', unitInstanceId: sitter.instanceId, destination: { x: 7, y: 3 } }, // hold position
      { type: 'END_TURN' },
    ] as never, P, P, E, map);
    expect(r.updatedState.encounterProgress!.roomIndex).toBe(1);      // door open -> it goes through
  });

  it('...but an on_clear door with enemies still standing does NOT transition', async () => {
    // The other half of the invariant: it is the door being ACTIVE that
    // matters, not movement. With a living enemy on the board the same
    // stand-still turn must NOT advance the room.
    const { processTurn } = await import('../src/game/turnProcessor.js');
    const { buildAbilityMap } = await import('../src/ai/defaultData.js');
    const map = buildAbilityMap();
    const sitter = mk(P, 7, 3, { movementRange: 3 });   // starts ON the door
    const buddy  = mk(P, 5, 3);
    const foe    = mk(E, 4, 3);                          // ALIVE, on the board
    const g1 = mk(E, 0, 0);
    const ep = progress({
      exitDoors: [{ x: 7, y: 3 }], doorMode: 'on_clear',
      rooms: [{ units: [g1], placement: [{ x: 6, y: 3 }], waves: [], exitDoors: [], doorMode: 'on_clear', entryTiles: [{ x: 1, y: 3 }, { x: 1, y: 4 }] }],
    }, [sitter.instanceId, buddy.instanceId]);
    const st = mkState([sitter, buddy, foe], ep);
    st.objective = { partyId: P, enemyId: E, mainId: sitter.instanceId, text: 'x', win: [{ kind: 'all_enemies_dead' }], loss: [] } as never;
    st.turnContext = undefined;
    st.initiative.activeUnitId = sitter.instanceId;
    const r = processTurn(st, [
      { type: 'MOVE', unitInstanceId: sitter.instanceId, destination: { x: 7, y: 3 } },
      { type: 'END_TURN' },
    ] as never, P, P, E, map);
    expect(r.updatedState.encounterProgress!.roomIndex).toBe(0);      // door shut -> stays put
  });

  it('units_dead naming a boss in a LATER room does not vacuously win before the boss spawns', () => {
    // The bug (surfaced by campaign 2's e12): a boss living in the last room is
    // prebuilt at encounter build (stable id, name known from turn 1), so a
    // `units_dead` win naming it is legal per the design — but the boss's
    // UnitInstance isn't spliced into state.units until the party actually
    // transitions into that room. Before this fix, checking `isAlive` on an
    // instanceId absent from state.units read as "not alive" -> vacuous win on
    // turn 1, mirroring the all_enemies_dead mercy rule's own pre-A4 bug.
    const party  = mk(P, 1, 3);
    const boss   = mk(E, 0, 0); // exists (has a stable id) but not yet spawned
    const ep = progress({
      exitDoors: [{ x: 7, y: 3 }], doorMode: 'on_clear',
      rooms: [{
        units: [boss], placement: [{ x: 6, y: 3 }], waves: [],
        exitDoors: [], doorMode: 'on_clear',
        entryTiles: [{ x: 1, y: 3 }],
      }],
    }, [party.instanceId]);
    const st = mkState([party], ep); // note: boss is NOT in state.units yet
    st.objective = {
      partyId: P, enemyId: E, mainId: party.instanceId, text: 'x',
      win: [{ kind: 'units_dead', unitIds: [boss.instanceId] }], loss: [],
    } as never;
    const result = checkWinCondition(st, P, E);
    expect(result.isOver).toBe(false); // must NOT win while the boss hasn't spawned

    // Once the boss is actually on the board and dead, the same check must win.
    const spawnedDead = { ...boss, isAlive: false };
    const st2 = mkState([party, spawnedDead], progress({}, [party.instanceId]));
    st2.objective = {
      partyId: P, enemyId: E, mainId: party.instanceId, text: 'x',
      win: [{ kind: 'units_dead', unitIds: [boss.instanceId] }], loss: [],
    } as never;
    expect(checkWinCondition(st2, P, E).isOver).toBe(true);
  });
});
