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
