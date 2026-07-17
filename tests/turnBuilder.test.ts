import { describe, it, expect } from 'vitest';
import { precheckTurn, round1LockedUnitId, isTurnComplete } from '../src/game/turnBuilder.js';
import { buildInitialState } from '../src/game/initialState.js';
import { buildAbilityMap, DEFAULT_UNITS } from '../src/ai/defaultData.js';
import { TurnAction } from '../src/types/matchState.js';

const P1 = 'p1'; const P2 = 'p2';
const abilityMap = buildAbilityMap();
const team = (slugs: string[]) => slugs.map((s) => DEFAULT_UNITS[s]);

function freshState() {
  return buildInitialState(
    P1, P2,
    team(['fighter', 'barbarian', 'ranger', 'rogue']),
    team(['wizard', 'cleric', 'sorcerer', 'warlock']),
    [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }],
    [{ x: 1, y: 0 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 1, y: 6 }],
    P1,
  );
}

describe('precheckTurn', () => {
  it('accepts a legal round-1 move+charge commit and does not mutate state', () => {
    const state = freshState();
    const before = JSON.stringify(state);
    const u = state.units[0];
    const actions: TurnAction[] = [
      { type: 'MOVE', unitInstanceId: u.instanceId, destination: { x: u.position.x + 1, y: u.position.y } },
      { type: 'CHARGE', unitInstanceId: u.instanceId, destination: { x: u.position.x + 2, y: u.position.y } },
      { type: 'END_TURN' },
    ];
    expect(precheckTurn(state, actions, P1, P1, P2, abilityMap)).toEqual({ ok: true });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rejects an out-of-range move with the engine message', () => {
    const state = freshState();
    const u = state.units[0];
    const r = precheckTurn(state, [
      { type: 'MOVE', unitInstanceId: u.instanceId, destination: { x: 6, y: 1 } },
      { type: 'END_TURN' },
    ], P1, P1, P2, abilityMap);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/range|reachable/i);
  });

  it('rejects a mixed-unit round-1 commit', () => {
    const state = freshState();
    const [a, b] = state.units;
    const r = precheckTurn(state, [
      { type: 'MOVE', unitInstanceId: a.instanceId, destination: { x: a.position.x + 1, y: a.position.y } },
      { type: 'MOVE', unitInstanceId: b.instanceId, destination: { x: b.position.x + 1, y: b.position.y } },
      { type: 'END_TURN' },
    ], P1, P1, P2, abilityMap);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/same unit/i);
  });

  it('rejects acting out of turn', () => {
    const state = freshState();
    const enemy = state.units.find((u) => u.ownerPlayerId === P2)!;
    const r = precheckTurn(state, [
      { type: 'MOVE', unitInstanceId: enemy.instanceId, destination: { x: enemy.position.x + 1, y: enemy.position.y } },
      { type: 'END_TURN' },
    ], P2, P1, P2, abilityMap);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not your turn/i);
  });
});

describe('round1LockedUnitId', () => {
  it('is null with no queued actions and locks to the first acting unit', () => {
    expect(round1LockedUnitId([])).toBeNull();
    expect(round1LockedUnitId([{ type: 'END_TURN' }])).toBeNull();
    expect(round1LockedUnitId([
      { type: 'MOVE', unitInstanceId: 'u1', destination: { x: 0, y: 0 } },
    ])).toBe('u1');
  });
});

describe('isTurnComplete', () => {
  const mv: TurnAction = { type: 'MOVE', unitInstanceId: 'u1', destination: { x: 0, y: 0 } };
  const ch: TurnAction = { type: 'CHARGE', unitInstanceId: 'u1', destination: { x: 1, y: 0 } };
  const ab: TurnAction = { type: 'USE_ABILITY', unitInstanceId: 'u1', abilitySlug: 'sword', target: { x: 1, y: 1 } };

  it('move alone is incomplete; move+charge and move+ability are complete', () => {
    expect(isTurnComplete('u1', [mv])).toBe(false);
    expect(isTurnComplete('u1', [mv, ch])).toBe(true);
    expect(isTurnComplete('u1', [mv, ab])).toBe(true);
  });

  it('another unit\'s actions do not count', () => {
    expect(isTurnComplete('u2', [mv, ab])).toBe(false);
  });
});
