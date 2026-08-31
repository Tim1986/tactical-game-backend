/**
 * roomPlacementCarry.test.ts — the opening the player chose survives every door.
 *
 * Owner repro 2026-08-31 (e8): "My opening placement in the next room is
 * completely goofy... now my Barbarian is in the back." The party re-entered in
 * PARTY ORDER at each door, so slot 0 took entryTiles[0] regardless of where the
 * player had put them.
 */
import { describe, it, expect } from 'vitest';
import { buildEncounterState } from '../src/campaigns/runtime.js';
import { CAMPAIGNS } from '../src/campaigns/index.js';
import { choicesForLevel } from '../src/ai/campaignSim.js';

const PARTY = ['barbarian', 'sorcerer', 'warlock', 'rogue'];

describe('multi-room placement', () => {
  it('stores the chosen opening on encounterProgress', () => {
    const order = [3, 2, 1, 0];
    const enc = CAMPAIGNS.unlitbeacon.encounters.e8;
    const { state } = buildEncounterState(
      CAMPAIGNS.unlitbeacon, 'e8', PARTY, choicesForLevel(PARTY, enc.level),
      enc.level, 'medium', 'HUMAN', 'ENEMY', undefined, undefined, undefined, order);
    expect((state as { encounterProgress?: { placementOrder?: number[] } })
      .encounterProgress?.placementOrder).toEqual(order);
  });

  it('omits it entirely when the player did not choose — identity default', () => {
    const enc = CAMPAIGNS.unlitbeacon.encounters.e8;
    const { state } = buildEncounterState(
      CAMPAIGNS.unlitbeacon, 'e8', PARTY, choicesForLevel(PARTY, enc.level),
      enc.level, 'medium', 'HUMAN', 'ENEMY');
    expect((state as { encounterProgress?: { placementOrder?: number[] } })
      .encounterProgress?.placementOrder).toBeUndefined();
  });

  it('the chosen order actually places the party that way in room 0', () => {
    const enc = CAMPAIGNS.unlitbeacon.encounters.e8;
    const tiles = (enc as { rooms?: { playerPlacement?: unknown }[] }).rooms
      ? CAMPAIGNS.unlitbeacon.encounters.e8.playerPlacement
      : CAMPAIGNS.unlitbeacon.encounters.e8.playerPlacement;
    const order = [3, 2, 1, 0];
    const { state } = buildEncounterState(
      CAMPAIGNS.unlitbeacon, 'e8', PARTY, choicesForLevel(PARTY, enc.level),
      enc.level, 'medium', 'HUMAN', 'ENEMY', undefined, undefined, undefined, order);
    const party = state.units.filter((u) => u.ownerPlayerId === 'HUMAN');
    expect(party[0].position).toEqual(tiles[3]);   // hero took the tile they picked
    expect(party[3].position).toEqual(tiles[0]);
  });
});

describe('[owner spec 2026-08-31] the whole party crosses, and pays for dawdling', () => {
  it('every shipped door room fits the whole party', () => {
    // The rule makes a room with fewer doors than party members unleavable.
    // Every door room shipped with 1-2 tiles for a party of 4 before this.
    for (const [cs, c] of Object.entries(CAMPAIGNS)) {
      for (const [id, enc] of Object.entries(c.encounters)) {
        const rooms = (enc as { rooms?: { exitDoors?: unknown[] }[] }).rooms ?? [];
        for (const [i, r] of rooms.entries()) {
          const doors = r.exitDoors?.length ?? 0;
          if (doors === 0) continue;                       // last room, nothing to cross to
          expect(doors, `${cs} ${id} room${i}`).toBeGreaterThanOrEqual(enc.playerPlacement.length);
        }
      }
    }
  });

  it('multi-room entry tiles keep ONE shape across every room', () => {
    // "Multi room encounters need the same shape of opening squares in each
    // room" — a scattered column cannot express the block the player arranged.
    const norm = (ts: { x: number; y: number }[]): string =>
      [...ts].map((t) => `${t.x},${t.y}`).sort().join(' ');
    for (const [cs, c] of Object.entries(CAMPAIGNS)) {
      for (const [id, enc] of Object.entries(c.encounters)) {
        const rooms = (enc as { rooms?: { entryTiles?: { x: number; y: number }[] }[] }).rooms ?? [];
        const shapes = rooms.map((r) => r.entryTiles).filter((t): t is { x: number; y: number }[] => !!t);
        if (shapes.length < 2) continue;
        const first = norm(shapes[0]);
        for (const [i, sh] of shapes.entries()) {
          expect(norm(sh), `${cs} ${id} room entry shape ${i}`).toBe(first);
        }
      }
    }
  });
});
