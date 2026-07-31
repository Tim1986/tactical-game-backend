/**
 * Regression test for the ROD event-loss bug (found in live PvP testing,
 * 2026-07-31): per-action events from /matches/:id/action were never
 * persisted, so submitRodEndTurn wrote only the end-turn residue (ticks,
 * TURN_ENDED) to last_turn_events. The OPPONENT's client builds its combat
 * log and replay from lastTurnEvents via polling — so every ROD turn's
 * moves/abilities/pushes/statuses silently vanished from their log while the
 * actor (who displays per-action responses directly) saw everything.
 *
 * Contract under test:
 *  - last_turn_events after end-turn = [per-action events..., end-turn events...]
 *  - the /end-turn RESPONSE events exclude the per-action events (the acting
 *    client splices its own accumulated copy in front; returning them again
 *    would double its log/replay).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildInitialState } from '../src/game/initialState.js';
import { MatchState, MoveAction, GameEvent } from '../src/types/matchState.js';

vi.mock('../src/services/notificationService.js', () => ({
  notifyUser: vi.fn().mockResolvedValue(undefined),
  notifyMatchPlayers: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/services/achievementService.js', () => ({
  evaluateAchievements: vi.fn().mockResolvedValue(undefined),
}));

// Minimal stateful fake covering exactly the SQL the ROD service issues.
const db = { match: null as Record<string, unknown> | null, abilityDefs: [] as Record<string, unknown>[] };

function fakeQuery(text: string, params: unknown[] = []): { rows: unknown[]; rowCount: number } {
  const t = text.replace(/\s+/g, ' ').trim();
  const ok = (rows: unknown[] = []) => ({ rows, rowCount: rows.length });
  if (t.startsWith('SELECT * FROM matches WHERE id')) return ok(db.match ? [db.match] : []);
  if (t.includes('FROM ability_definitions')) return ok(db.abilityDefs);
  if (t.startsWith('UPDATE matches SET match_state = $1 WHERE')) {
    // Mid-turn per-action persistence (2 params: state, id)
    Object.assign(db.match!, { match_state: JSON.parse(params[0] as string) });
    return ok();
  }
  if (t.startsWith('UPDATE matches SET match_state')) {
    // End-turn persistence (6 params)
    const [state, active, turn, deadline, events] = params as string[];
    Object.assign(db.match!, {
      match_state: JSON.parse(state), active_player_id: active, turn_number: turn,
      turn_deadline: deadline, last_turn_events: JSON.parse(events),
    });
    return ok();
  }
  if (t.startsWith('INSERT INTO turn_history')) return ok();
  throw new Error(`FakeDb: unhandled SQL: ${t.slice(0, 120)}`);
}

vi.mock('../src/db/pool.js', () => ({
  query: vi.fn(async (text: string, params?: unknown[]) => fakeQuery(text, params as unknown[])),
  withTransaction: vi.fn(async (fn: (c: unknown) => Promise<unknown>) =>
    fn({ query: async (text: string, params?: unknown[]) => fakeQuery(text, params as unknown[]), release: () => {} })),
  pool: { query: vi.fn(), connect: vi.fn() },
  checkDatabaseConnection: vi.fn(),
}));

const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';

let matchService: typeof import('../src/services/matchService.js');
let state: MatchState;

beforeAll(async () => {
  const { ABILITY_DEFS } = await import('../src/config/gameData.js');
  db.abilityDefs = ABILITY_DEFS.map((a, i) => ({
    id: `ab-${i}`, slug: a.slug, name: a.name, description: a.description,
    targeting_type: a.targetingType, range: a.range, area_radius: a.areaRadius,
    cooldown_turns: a.cooldownTurns, is_special: a.isSpecial, is_unblockable: a.isUnblockable,
    exclude_allies: a.excludeAllies, is_multi_hit: a.isMultiHit ?? false, effects: a.effects,
  }));
  const { DEFAULT_UNITS } = await import('../src/ai/defaultData.js');
  const team = ['warlock', 'ranger', 'barbarian', 'wizard'].map((s) => DEFAULT_UNITS[s]);
  const specials = [
    { specialSlug: 'fear', passiveSlug: null },
    { specialSlug: 'pinning', passiveSlug: null },
    { specialSlug: 'roar', passiveSlug: null },
    { specialSlug: 'freeze', passiveSlug: null },
  ];
  state = buildInitialState(
    P1, P2, team, team,
    [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }],
    [{ x: 6, y: 0 }, { x: 6, y: 2 }, { x: 6, y: 4 }, { x: 6, y: 6 }],
    P1, specials, specials,
  );
  matchService = await import('../src/services/matchService.js');
});

describe('ROD per-action events reach last_turn_events', () => {
  it('persists the full turn (action events + end-turn events) for the opponent', async () => {
    const actor = state.activePlayerId;
    const unit = state.units.find((u) => u.ownerPlayerId === actor && u.isAlive)!;
    db.match = {
      id: 'm1', player_one_id: P1, player_two_id: P2, status: 'active',
      active_player_id: actor, turn_number: 1, turn_deadline: null,
      winner_id: null, match_state: state, last_turn_events: [], is_pve: false, is_ranked: false,
    };

    const move: MoveAction = {
      type: 'MOVE', unitInstanceId: unit.instanceId,
      destination: { x: unit.position.x + 1, y: unit.position.y },
    };
    const actionRes = await matchService.submitRodAction('m1', actor, move, 0);
    expect(actionRes.matchOver).toBe(false);
    const moveEvents = actionRes.events.filter((e) => e.type === 'UNIT_MOVED');
    expect(moveEvents.length).toBe(1);

    // The accumulated events must survive in the persisted turnContext
    const midState = (db.match.match_state as MatchState);
    expect(midState.turnContext?.events?.some((e) => e.type === 'UNIT_MOVED')).toBe(true);

    const endRes = await matchService.submitRodEndTurn('m1', actor);
    const persisted = db.match.last_turn_events as GameEvent[];

    // Opponent's view: the move AND the turn end, in order
    expect(persisted.some((e) => e.type === 'UNIT_MOVED')).toBe(true);
    expect(persisted.some((e) => e.type === 'TURN_ENDED')).toBe(true);
    expect(persisted.findIndex((e) => e.type === 'UNIT_MOVED'))
      .toBeLessThan(persisted.findIndex((e) => e.type === 'TURN_ENDED'));

    // Actor's view: response events must NOT repeat the per-action events
    expect(endRes.events.some((e) => e.type === 'UNIT_MOVED')).toBe(false);

    // turnContext (and its event buffer) is gone after the turn
    expect((db.match.match_state as MatchState).turnContext).toBeUndefined();
  });
});
