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
 *
 * ⚠ COVERAGE NOTE (2026-08-24). Floor 1 used to carry `doorMode:'always'` and
 * this file was the catalog's ONLY real-content exercise of that flag. It is
 * now `'on_clear'`: once survivors began FOLLOWING the party through an
 * 'always' door (owner ruling), a door sitting at x=7 behind the enemy line
 * became an accident waiting to happen — a unit chasing a pikeman ends its
 * turn on it and drags the floor upstairs, which measured 0% at EVERY
 * difficulty including easy.
 *
 * So `doorMode:'always'` currently has NO authored-content coverage. The
 * mechanic itself is covered generically in wavesRooms.test.ts (including the
 * follow behaviour). If a future campaign wants the flag, place the door
 * where stepping on it is a DELIBERATE act — not in the lane the party
 * fights through.
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

/** Clear floor 1 and climb. Floor 1's door is `on_clear` as of 2026-08-24, so
 *  every floor-2 test has to earn the transition rather than walking out of a
 *  live fight (which is exactly the accident that change was made to stop). */
/**
 * @param armDoorTrigger re-points floor 2's pending wave at a DOOR trigger.
 *
 * ⚠ THE DOOR-MACHINERY TESTS BELOW MUST OWN THEIR OWN FIXTURE. They used to
 * lean on e8 happening to author a door-triggered wave, so when the owner had
 * that wave changed to a room clock on 2026-08-27 ("going through the door
 * implies going to the NEXT ROOM"), three unrelated engine tests broke with
 * it. The `on: 'door'` trigger is still a supported feature other content can
 * use, so its coverage must not be hostage to one encounter's tuning.
 */
function crossWholeParty(state: ReturnType<typeof buildE8>['state']): void {
  // ⚠ THE WHOLE PARTY CROSSES (owner spec 2026-08-31). Parking one unit on a
  // door no longer opens the room, so every fixture that used to walk a single
  // mover through has to stand the party on the doors first.
  const ep = state.encounterProgress!;
  ep.partyIds.forEach((id, i) => {
    const u = state.units.find((x) => x.instanceId === id);
    if (u?.isAlive) u.position = { ...ep.exitDoors[Math.min(i, ep.exitDoors.length - 1)] };
  });
}

function climbToFloor2(state: ReturnType<typeof buildE8>['state'], armDoorTrigger = false) {
  const ep = state.encounterProgress!;
  const mover = state.units.find((u) => u.instanceId === ep.partyIds[0])!;
  for (const e of living(state)) e.isAlive = false;
  crossWholeParty(state);
  maybeRoomTransition(state, mover, []);
  if (armDoorTrigger && state.encounterProgress!.waves[0]) {
    state.encounterProgress!.waves[0].trigger = { on: 'door', tile: { x: 6, y: 3 } };
  }
  return mover;
}

describe('e8 room flags', () => {
  it('carries the authored flags into encounterProgress', () => {
    const { state } = buildE8();
    const ep = state.encounterProgress!;
    expect(ep).toBeDefined();
    // Floor 1 is 'on_clear' (see the coverage note above).
    expect(ep.doorMode).toBe('on_clear');
    expect(ep.rooms.length).toBe(2);
    // Floor 2 carries surprise + the landing guard on a room clock.
    expect(ep.rooms[0].surprise).toBe(true);
    expect(ep.rooms[0].waves).toHaveLength(1);
    // ⚠ Was a door trigger; the owner had it changed to a room clock
    // (2026-08-27) because a door-sprung ambush "deceives the player".
    expect(ep.rooms[0].waves[0].trigger).toEqual({ on: 'rounds_after_entry', rounds: 3 });
  });

  it("floor 1's on_clear door REFUSES while the garrison lives, then opens", () => {
    const { state } = buildE8();
    const ep = state.encounterProgress!;
    const mover = state.units.find((u) => u.instanceId === ep.partyIds[0])!;

    // Enemies still standing — the door must refuse. (This is the guard that
    // stops a chasing unit from accidentally dragging the floor upstairs.)
    expect(living(state).length).toBeGreaterThan(0);
    mover.position = { ...ep.exitDoors[0] };
    expect(maybeRoomTransition(state, mover, [])).toBe(false);

    // Clear the floor, and the same tile now works — once the REST of the
    // party is standing on the doors too.
    for (const e of living(state)) e.isAlive = false;
    expect(maybeRoomTransition(state, mover, []), 'one unit is not a crossing').toBe(false);
    crossWholeParty(state);
    const events: GameEvent[] = [];
    expect(maybeRoomTransition(state, mover, events)).toBe(true);
    expect(events.some((e) => e.type === 'ROOM_ENTERED')).toBe(true);
    expect(state.encounterProgress!.roomIndex).toBe(1);
  });

  it('the floor-2 garrison spawns SURPRISED (skips its first slot)', () => {
    const { state } = buildE8();
    const before = new Set(state.units.map((u) => u.instanceId));

    climbToFloor2(state);

    const garrison = state.units.filter((u) => !before.has(u.instanceId) && u.ownerPlayerId === ENEMY);
    expect(garrison.length).toBeGreaterThan(0);
    // The whole point of the flag: every one of them loses its first turn.
    expect(garrison.every((u) => u.skipFirstSlot === true)).toBe(true);
  });

  it("the landing guard spawns only when a PARTY unit steps on the door tile", () => {
    const { state } = buildE8();
    const mover = climbToFloor2(state, true);    // now on floor 2, door trigger armed

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
    const mover = climbToFloor2(state);

    mover.position = { x: 6, y: 3 };
    checkSpawnTriggers(state, []);            // the action-site call: no mover
    expect(state.encounterProgress!.waves).toHaveLength(1);   // still pending
  });

  it("a room clock is measured from ENTERING the room, not the absolute round", () => {
    // The whole reason 'rounds_after_entry' exists. A later room is reached at
    // an unpredictable absolute round, so an absolute trigger would fire the
    // instant the party walks in (exactly the "baddie in my face" the owner
    // rejected) or never fire at all.
    const { state } = buildE8();
    state.roundNumber = 11;                       // floor 1 took a while
    const mover = climbToFloor2(state);           // keeps the authored room clock
    const ep = state.encounterProgress!;
    expect(ep.waves[0].trigger).toEqual({ on: 'rounds_after_entry', rounds: 3 });
    expect(ep.roomEnteredRound).toBe(11);         // clock reset on entry

    // Two rounds in: not yet, even though the absolute round is far past 3.
    state.roundNumber = 13;
    checkSpawnTriggers(state, [], mover);
    expect(state.encounterProgress!.waves).toHaveLength(1);

    // Three full rounds after entry: it lands, wherever anyone is standing.
    state.roundNumber = 14;
    checkSpawnTriggers(state, [], mover);
    expect(state.encounterProgress!.waves).toHaveLength(0);
  });

  it('springs on the end-of-turn sweep', () => {
    const { state } = buildE8();
    const mover = climbToFloor2(state, true);

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

    // Clear floor 1 and climb (its door is `on_clear` as of 2026-08-24).
    const ep0 = state.encounterProgress!;
    const barb = state.units.find((u) => ep0.partyIds.includes(u.instanceId) && u.definitionSlug === 'barbarian')!;
    for (const e of state.units.filter((u) => u.ownerPlayerId === ENEMY && u.isAlive)) e.isAlive = false;
    crossWholeParty(state);
    barb.position = { ...ep0.exitDoors[0] };
    maybeRoomTransition(state, barb, []);

    // ⚠ Arm a DOOR trigger explicitly — this test is about the move_self
    // landing sweep, not about e8's authored content. e8's floor-2 wave moved
    // to a room clock on 2026-08-27 (owner: a door-sprung ambush "deceives the
    // player"), and this test broke with it despite testing unrelated engine
    // behaviour. The 'door' trigger is still supported, so it keeps its
    // coverage on a fixture this test owns.
    if (state.encounterProgress!.waves[0]) {
      state.encounterProgress!.waves[0].trigger = { on: 'door', tile: { x: 6, y: 3 } };
    }

    // Floor 2: put the barbarian in leap range of the trigger tile (6,3), give
    // it the turn, and make the leap legal (tile free — the test above pins
    // that occupied tiles are rejected). ⚠ The floor-2 garrison is placed by
    // the transition and one of them can sit ON (6,3); clear that tile or the
    // leap is rejected for occupancy and the test fails for the wrong reason.
    for (const u of state.units) {
      if (u.ownerPlayerId === ENEMY && u.isAlive && u.position.x === 6 && u.position.y === 3) {
        u.position = { x: 6, y: 6 };
      }
    }
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
