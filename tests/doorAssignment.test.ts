/**
 * doorAssignment.test.ts — the party spreads across the doors, one each.
 *
 * DOOR1 made a room end only when EVERY living party member stands on a door
 * tile. The brain's existing pull was toward "the nearest door", which stopped
 * being a gradient the moment the rule changed: all four units converge on one
 * tile, one stands on it, the rest hover adjacent because they cannot enter an
 * occupied square, and the crossing never completes. e8/medium fell to 10%.
 */
import { describe, it, expect } from 'vitest';
import { OptimalBrain } from '../src/ai/aiBrain.js';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import type { MatchState, UnitInstance } from '../src/types/matchState.js';

const P = 'HUMAN', E = 'ENEMY';
const map = buildAbilityMap();
let n = 0;
const mk = (o: string, x: number, y: number): UnitInstance => ({
  instanceId: `u${++n}`, definitionSlug: 'fighter', ownerPlayerId: o, position: { x, y },
  currentHealth: 40, maxHealth: 40, armorClass: 6, movementRange: 3,
  abilities: ['sword'], passives: [], isAlive: true, hasMovedThisTurn: false,
  hasActedThisTurn: false, cooldowns: {}, statusEffects: [],
} as UnitInstance);

const DOORS = [{ x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }];

function clearedRoom(): { st: MatchState; party: UnitInstance[] } {
  n = 0;
  const party = [mk(P, 1, 2), mk(P, 1, 3), mk(P, 1, 4), mk(P, 1, 5)];
  const st = {
    board: { width: 8, height: 8 }, units: [...party], turnNumber: 5, roundNumber: 2,
    activePlayerId: P, phase: 'action',
    initiative: { order: party.map((u) => u.instanceId), slot: 0,
      round1FirstPlayerId: P, activeUnitId: party[0].instanceId, isRound1: false },
    encounterProgress: {
      waves: [], rooms: [{}], exitDoors: DOORS, doorMode: 'on_clear',
      partyIds: party.map((u) => u.instanceId), roomIndex: 0, roomEnteredRound: 0,
    },
  } as unknown as MatchState;
  return { st, party };
}

/** Walk the party until everyone is on a door, or give up. */
function crossingTurns(limit = 40): number {
  const { st, party } = clearedRoom();
  const brain = new OptimalBrain();
  for (let turn = 0; turn < limit; turn++) {
    if (party.every((u) => DOORS.some((d) => d.x === u.position.x && d.y === u.position.y))) return turn;
    const active = party[turn % party.length];
    st.initiative.activeUnitId = active.instanceId;
    const acts = brain.selectActions(st, P, map) as { type: string; destination?: { x: number; y: number } }[];
    const mv = acts.find((a) => a.type === 'MOVE');
    if (mv?.destination) active.position = mv.destination;
  }
  return -1;
}

describe('crossing a cleared room', () => {
  it('the whole party reaches the doors', () => {
    const turns = crossingTurns();
    expect(turns, 'the party never completed the crossing').toBeGreaterThanOrEqual(0);
  });

  it('and lands on FOUR DISTINCT doors, not stacked at the nearest one', () => {
    const { st, party } = clearedRoom();
    const brain = new OptimalBrain();
    for (let turn = 0; turn < 40; turn++) {
      const active = party[turn % party.length];
      st.initiative.activeUnitId = active.instanceId;
      const acts = brain.selectActions(st, P, map) as { type: string; destination?: { x: number; y: number } }[];
      const mv = acts.find((a) => a.type === 'MOVE');
      if (mv?.destination) active.position = mv.destination;
    }
    const tiles = new Set(party.map((u) => `${u.position.x},${u.position.y}`));
    expect(tiles.size, 'units ended stacked or off-door').toBe(4);
    for (const u of party) {
      expect(DOORS.some((d) => d.x === u.position.x && d.y === u.position.y),
        `${u.instanceId} at ${JSON.stringify(u.position)} is not on a door`).toBe(true);
    }
  });
});
