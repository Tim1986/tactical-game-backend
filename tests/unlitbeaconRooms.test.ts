/**
 * e8 "The Vigil" — the three room flags actually FIRE.
 *
 * §6.4 of CAMPAIGN3_DESIGN.md flagged these as never having executed real
 * content: `doorMode:'always'`, a room-level `surprise`, and a wave triggered
 * `on:'door'`. A clean smoke run does NOT prove any of them — a flag that is
 * silently ignored produces no validation error, it just quietly makes the
 * encounter a plain three-room slog. These drive each flag through the real
 * engine functions on the REAL authored encounter.
 *
 * The room-0 asymmetry is the trap worth remembering: room 0 is placed at
 * build time and never passes through enterNextRoom, so its `surprise` would
 * be dropped on the floor. e8 puts surprise on floor 2, which is why it works.
 */
import { describe, it, expect } from 'vitest';
import { buildEncounterState } from '../src/campaigns/runtime.js';
import { unlitBeaconCampaign } from '../src/campaigns/unlitbeacon.js';
import { checkSpawnTriggers, maybeRoomTransition } from '../src/game/encounterFlow.js';
import { choicesForLevel } from '../src/ai/campaignSim.js';
import type { GameEvent } from '../src/types/matchState.js';

const HUMAN = 'human', ENEMY = 'enemy';
const PARTY = ['fighter', 'barbarian', 'rogue', 'cleric'];

function buildE8() {
  const choices = choicesForLevel(PARTY, 7);
  return buildEncounterState(
    unlitBeaconCampaign, 'e8', PARTY, choices, 7, 'hard', HUMAN, ENEMY,
  );
}

const living = (s: { units: { ownerPlayerId: string; isAlive: boolean }[] }) =>
  s.units.filter((u) => u.ownerPlayerId === ENEMY && u.isAlive);

describe('e8 room flags', () => {
  it('carries the authored flags into encounterProgress', () => {
    const { state } = buildE8();
    const ep = state.encounterProgress!;
    expect(ep).toBeDefined();
    // Floor 1's 'always' door must survive the room-0 build path.
    expect(ep.doorMode).toBe('always');
    expect(ep.rooms.length).toBe(2);
    // Floor 2 carries surprise + the door-triggered landing guard.
    expect(ep.rooms[0].surprise).toBe(true);
    expect(ep.rooms[0].waves).toHaveLength(1);
    expect(ep.rooms[0].waves[0].trigger).toEqual({ on: 'door', tile: { x: 6, y: 3 } });
  });

  it("doorMode:'always' lets the party leave floor 1 MID-FIGHT", () => {
    const { state } = buildE8();
    const ep = state.encounterProgress!;
    const mover = state.units.find((u) => u.instanceId === ep.partyIds[0])!;

    // Enemies still standing — an 'on_clear' door would refuse here.
    expect(living(state).length).toBeGreaterThan(0);
    mover.position = { ...ep.exitDoors[0] };
    const events: GameEvent[] = [];
    expect(maybeRoomTransition(state, mover, events)).toBe(true);
    expect(events.some((e) => e.type === 'ROOM_ENTERED')).toBe(true);
    expect(state.encounterProgress!.roomIndex).toBe(1);
  });

  it('the floor-2 garrison spawns SURPRISED (skips its first slot)', () => {
    const { state } = buildE8();
    const ep = state.encounterProgress!;
    const mover = state.units.find((u) => u.instanceId === ep.partyIds[0])!;
    const before = new Set(state.units.map((u) => u.instanceId));

    mover.position = { ...ep.exitDoors[0] };
    maybeRoomTransition(state, mover, []);

    const garrison = state.units.filter((u) => !before.has(u.instanceId) && u.ownerPlayerId === ENEMY);
    expect(garrison.length).toBeGreaterThan(0);
    // The whole point of the flag: every one of them loses its first turn.
    expect(garrison.every((u) => u.skipFirstSlot === true)).toBe(true);
  });

  it("the landing guard spawns only when a PARTY unit steps on the door tile", () => {
    const { state } = buildE8();
    const ep0 = state.encounterProgress!;
    const mover = state.units.find((u) => u.instanceId === ep0.partyIds[0])!;
    mover.position = { ...ep0.exitDoors[0] };
    maybeRoomTransition(state, mover, []);      // now on floor 2

    const ep = state.encounterProgress!;
    expect(ep.waves).toHaveLength(1);           // landing guard still pending

    // Standing anywhere else does nothing.
    mover.position = { x: 2, y: 2 };
    checkSpawnTriggers(state, [], mover);
    expect(state.encounterProgress!.waves).toHaveLength(1);

    // An ENEMY on the tile must not spring the party's own ambush.
    const foe = living(state)[0];
    const foeWas = { ...foe.position };
    foe.position = { x: 6, y: 3 };
    checkSpawnTriggers(state, [], foe);
    expect(state.encounterProgress!.waves).toHaveLength(1);
    foe.position = foeWas;

    // The party unit stepping on (6,3) springs it.
    const before = new Set(state.units.map((u) => u.instanceId));
    mover.position = { x: 6, y: 3 };
    const events: GameEvent[] = [];
    checkSpawnTriggers(state, events, mover);
    expect(state.encounterProgress!.waves).toHaveLength(0);
    const spawned = state.units.filter((u) => !before.has(u.instanceId));
    expect(spawned.length).toBe(1);
    expect(events.some((e) => e.type === 'UNIT_SPAWNED')).toBe(true);
  });
});
