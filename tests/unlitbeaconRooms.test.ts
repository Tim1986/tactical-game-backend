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

    // A unit that STEPPED on the tile and moved on still springs it — the trail
    // is what stops the end-of-turn deferral from letting you brush past the
    // ambush and escape it (which would silently gut the mechanic).
    const brushBefore = new Set(state.units.map((u) => u.instanceId));
    mover.position = { x: 5, y: 5 };                       // ended the turn elsewhere
    checkSpawnTriggers(state, [], mover, [{ x: 2, y: 2 }, { x: 6, y: 3 }, { x: 5, y: 5 }]);
    expect(state.encounterProgress!.waves).toHaveLength(0);
    expect(state.units.filter((u) => !brushBefore.has(u.instanceId)).length).toBe(1);
  });

  it('a door wave does not fire mid-turn (it would orphan the queued turn)', () => {
    // Regression for the e8 blocker: the guard spawning the instant a MOVE
    // landed on (6,3) dropped a body into the path of the CHARGE the same turn
    // had already queued, and the engine rejected it as unreachable. The action
    // site now passes NO mover, so door triggers cannot fire there at all.
    const { state } = buildE8();
    const ep0 = state.encounterProgress!;
    const mover = state.units.find((u) => u.instanceId === ep0.partyIds[0])!;
    mover.position = { ...ep0.exitDoors[0] };
    maybeRoomTransition(state, mover, []);

    mover.position = { x: 6, y: 3 };
    checkSpawnTriggers(state, []);            // the action-site call: no mover
    expect(state.encounterProgress!.waves).toHaveLength(1);   // still pending
  });

  it('springs on the end-of-turn sweep', () => {
    const { state } = buildE8();
    const ep0 = state.encounterProgress!;
    const mover = state.units.find((u) => u.instanceId === ep0.partyIds[0])!;
    mover.position = { ...ep0.exitDoors[0] };
    maybeRoomTransition(state, mover, []);

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

// ── Fable review of 5fc1aad ──────────────────────────────────────────────────
// The trail must record LEAP landings, not just MOVE/CHARGE. Driven through the
// real processTurn so the append site itself is under test, not a reenactment.
import { processTurn } from '../src/game/turnProcessor.js';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import { applyCampaignAbilities, applyCooldownOverrides } from '../src/game/abilityOverrides.js';

describe('door trigger vs move_self (Fable review of 5fc1aad)', () => {
  it('a Leaping Slam that LANDS on the trigger tile springs the ambush at end of turn', () => {
    const build = (() => {
      const choices = choicesForLevel(PARTY, 7);
      return buildEncounterState(unlitBeaconCampaign, 'e8', PARTY, choices, 7, 'hard', HUMAN, ENEMY);
    })();
    const state = build.state;
    const abilityMap = applyCooldownOverrides(
      applyCampaignAbilities(buildAbilityMap(), build.campaignAbilities), build.cooldownOverrides);

    // Walk the party through floor 1's 'always' door onto floor 2.
    const ep0 = state.encounterProgress!;
    const barb = state.units.find((u) => ep0.partyIds.includes(u.instanceId) && u.definitionSlug === 'barbarian')!;
    barb.position = { ...ep0.exitDoors[0] };
    maybeRoomTransition(state, barb, []);

    // Floor 2: put the barbarian in leap range of the trigger tile (6,3), give
    // it the turn, and make the leap legal (tile free — the test above pins
    // that occupied tiles are rejected).
    barb.position = { x: 4, y: 3 };
    state.initiative.isRound1 = false;
    state.initiative.order = [barb.instanceId];
    state.initiative.slot = 0;
    state.initiative.activeUnitId = barb.instanceId;
    state.activePlayerId = HUMAN;
    if (!barb.abilities.includes('roar')) barb.abilities.push('roar');
    barb.cooldowns['roar'] = 0;

    const before = new Set(state.units.map((u) => u.instanceId));
    const result = processTurn(
      state,
      [
        { type: 'USE_ABILITY', unitInstanceId: barb.instanceId, abilitySlug: 'roar', target: { x: 6, y: 3 } },
        { type: 'END_TURN' },
      ] as never,
      HUMAN, HUMAN, ENEMY, abilityMap,
    );

    const moved = result.updatedState.units.find((u) => u.instanceId === barb.instanceId)!;
    expect(moved.position).toEqual({ x: 6, y: 3 });                 // the leap really landed there
    expect(result.updatedState.encounterProgress!.waves).toHaveLength(0);  // ambush sprung
    const spawned = result.updatedState.units.filter((u) => !before.has(u.instanceId));
    expect(spawned.length).toBe(1);
  });
});
