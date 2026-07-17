/**
 * HTTP integration tests: route → zod schema → service → engine, end to end.
 *
 * Every layer below the route has unit tests; the seams between them had none —
 * which is how the ".uuid() rejects engine instance ids" bug shipped. These
 * tests drive the REAL express app with REAL request payloads against a
 * stateful in-memory Postgres fake seeded from the REAL gameData definitions,
 * so schema/service/engine disagreements fail here instead of on testers.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';

// Env must exist before config/index.ts loads (routes import it transitively).
process.env.DATABASE_URL = 'postgres://fake/fake';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-long-enough-for-hs256';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-long-enough-for-hs256';
process.env.RATE_LIMIT_API_MAX = '100000';
process.env.RATE_LIMIT_AUTH_MAX = '100000';

// Side-effectful services that fire on match completion — irrelevant here.
vi.mock('../src/services/notificationService.js', () => ({
  notifyUser: vi.fn().mockResolvedValue(undefined),
  notifyMatchPlayers: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/services/achievementService.js', () => ({
  evaluateAchievements: vi.fn().mockResolvedValue(undefined),
}));

// ─── Stateful in-memory db fake ──────────────────────────────────────────────
// Routes queries by SQL substring to in-memory tables. Unknown SQL throws so a
// new query added to a service fails loudly here instead of silently no-op'ing.

interface Row { [k: string]: unknown }
const db = {
  matches: new Map<string, Row>(),
  turnHistory: [] as Row[],
  users: new Map<string, Row>(),
  teams: new Map<string, Row>(),
  unitDefs: [] as Row[],
  abilityDefs: [] as Row[],
  matchSeq: 0,
};

function fakeQuery(text: string, params: unknown[] = []): { rows: Row[]; rowCount: number } {
  const t = text.replace(/\s+/g, ' ').trim();
  const ok = (rows: Row[] = []) => ({ rows, rowCount: rows.length });

  if (t.startsWith('SELECT unit_ids, placement, unit_customizations FROM teams')) {
    const team = db.teams.get(params[0] as string);
    return ok(team ? [team] : []);
  }
  if (t.includes('FROM unit_definitions WHERE id = ANY')) {
    const ids = params[0] as string[];
    return ok(db.unitDefs.filter((u) => ids.includes(u.id as string)));
  }
  if (t.includes('FROM ability_definitions')) return ok(db.abilityDefs);
  if (t.startsWith('INSERT INTO matches')) {
    const id = `match-${++db.matchSeq}`;
    const isPve = t.includes('is_pve');
    const [p1, p2, t1, t2, active, deadline, state] = params as string[];
    db.matches.set(id, {
      id, player_one_id: p1, player_two_id: p2, player_one_team: t1, player_two_team: t2,
      status: 'active', active_player_id: active, turn_number: 1, turn_deadline: deadline,
      winner_id: null, match_state: JSON.parse(state), last_turn_events: [],
      elo_delta_p1: null, elo_delta_p2: null, created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), completed_at: null, is_pve: isPve,
    });
    return ok([{ id }]);
  }
  if (t.startsWith('SELECT m.*, u1.username')) {
    const m = db.matches.get(params[0] as string);
    if (!m) return ok([]);
    const uname = (uid: unknown) => (db.users.get(uid as string)?.username as string) ?? 'unknown';
    return ok([{ ...m, p1_username: uname(m.player_one_id), p2_username: uname(m.player_two_id) }]);
  }
  if (t.startsWith('SELECT * FROM matches WHERE id')) {
    const m = db.matches.get(params[0] as string);
    return ok(m ? [m] : []);
  }
  if (t.startsWith('INSERT INTO turn_history')) { db.turnHistory.push({ match_id: params[0], player_id: params[1], turn_number: params[2] }); return ok(); }
  if (t.startsWith('UPDATE matches SET match_state')) {
    const [state, active, turn, deadline, events, id] = params as string[];
    const m = db.matches.get(id)!;
    Object.assign(m, { match_state: JSON.parse(state), active_player_id: active, turn_number: turn, turn_deadline: deadline, last_turn_events: JSON.parse(events) });
    return ok();
  }
  if (t.startsWith('UPDATE matches SET status')) {
    const [winner, d1, d2, id] = params as string[];
    Object.assign(db.matches.get(id)!, { status: 'completed', winner_id: winner, elo_delta_p1: d1, elo_delta_p2: d2, completed_at: new Date().toISOString() });
    return ok();
  }
  if (t.startsWith('SAVEPOINT') || t.startsWith('RELEASE') || t.startsWith('ROLLBACK') || t === 'BEGIN' || t === 'COMMIT') return ok();
  if (t.includes('FROM (VALUES')) return ok([]); // analytics comp lookup
  if (t.startsWith('INSERT INTO match_analytics')) return ok();
  if (t.includes('FROM users WHERE id = ANY')) return ok([]);
  if (t.startsWith('UPDATE users')) return ok();
  if (t.includes('account_xp FROM users')) return ok([{ account_xp: 0 }]);
  if (t.startsWith('SELECT player_id, turn_number')) return ok(db.turnHistory.filter((h) => h.match_id === params[0]));
  throw new Error(`FakeDb: unhandled SQL: ${t.slice(0, 120)}`);
}

vi.mock('../src/db/pool.js', () => ({
  query: vi.fn(async (text: string, params?: unknown[]) => fakeQuery(text, params)),
  withTransaction: vi.fn(async (fn: (c: unknown) => Promise<unknown>) =>
    fn({ query: async (text: string, params?: unknown[]) => fakeQuery(text, params), release: () => {} })),
  pool: { query: vi.fn(), connect: vi.fn() },
  checkDatabaseConnection: vi.fn(),
}));

// ─── Seed from REAL game data ────────────────────────────────────────────────
const HUMAN = '11111111-1111-4111-8111-111111111111';
const FABLE = '00000000-0000-0000-0000-000000000001';
const HUMAN_TEAM = '22222222-2222-4222-8222-222222222222';
const FABLE_TEAM = '33333333-3333-4333-8333-333333333333';

let app: import('express').Application;
let authHeader: string;

beforeAll(async () => {
  const { ABILITY_DEFS, UNIT_DEFS } = await import('../src/config/gameData.js');
  db.abilityDefs = ABILITY_DEFS.map((a, i) => ({ id: `ab-${i}`, ...a }));
  db.unitDefs = UNIT_DEFS.map((u, i) => ({ id: `unit-${i}`, ...u }));
  const idOf = (slug: string) => db.unitDefs.find((u) => u.slug === slug)!.id as string;

  db.users.set(HUMAN, { id: HUMAN, username: 'tester' });
  db.users.set(FABLE, { id: FABLE, username: 'Fable' });
  db.teams.set(HUMAN_TEAM, {
    unit_ids: ['fighter', 'barbarian', 'ranger', 'rogue'].map(idOf),
    placement: [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }],
    unit_customizations: [],
  });
  db.teams.set(FABLE_TEAM, {
    unit_ids: ['wizard', 'cleric', 'sorcerer', 'warlock'].map(idOf),
    placement: [{ x: 1, y: 0 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 1, y: 6 }],
    unit_customizations: [],
  });

  const { createApp } = await import('../src/app.js');
  app = createApp();
  const token = jwt.sign({ sub: HUMAN, username: 'tester' }, process.env.JWT_ACCESS_SECRET!);
  authHeader = `Bearer ${token}`;
});

// ─── The tests ───────────────────────────────────────────────────────────────

describe('PvE match over HTTP (create → move+charge → Fable replies)', () => {
  let matchId: string;
  let unitId: string;
  let unitPos: { x: number; y: number };

  it('creates a PvE match with human first', async () => {
    const res = await request(app).post('/matches/pve').set('Authorization', authHeader)
      .send({ myTeamId: HUMAN_TEAM, fableTeamId: FABLE_TEAM, difficulty: 'hard' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    matchId = res.body.data.matchId;
    const state = res.body.data.state;
    expect(state.activePlayerId).toBe(HUMAN);
    const mine = state.units.filter((u: Row) => u.ownerPlayerId === HUMAN);
    expect(mine).toHaveLength(4);
    unitId = mine[0].instanceId;
    unitPos = mine[0].position;
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get(`/matches/${matchId}`);
    expect(res.status).toBe(401);
  });

  it('GET /matches/:id returns the match to a participant', async () => {
    const res = await request(app).get(`/matches/${matchId}`).set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.isMyTurn).toBe(true);
  });

  it('accepts move + charge on turn 1 (the exact tester crash repro) and Fable replies', async () => {
    const res = await request(app).post(`/matches/${matchId}/turn`).set('Authorization', authHeader)
      .send({ actions: [
        { type: 'MOVE', unitInstanceId: unitId, destination: { x: unitPos.x + 1, y: unitPos.y } },
        { type: 'CHARGE', unitInstanceId: unitId, destination: { x: unitPos.x + 2, y: unitPos.y } },
        { type: 'END_TURN' },
      ] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Fable auto-committed inside the same request; back to the human
    expect(res.body.data.match.activePlayerId).toBe(HUMAN);
    expect(res.body.data.updatedState.initiative.order.length).toBe(2);
  });

  it('an engine-invalid turn returns 422 with the engine message (not a hang or 500)', async () => {
    const res = await request(app).post(`/matches/${matchId}/turn`).set('Authorization', authHeader)
      .send({ actions: [
        { type: 'MOVE', unitInstanceId: unitId, destination: { x: 0, y: 0 } },
        { type: 'END_TURN' },
      ] });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/already in initiative/i);
  });

  it('a non-participant gets 403, not a state leak', async () => {
    const stranger = jwt.sign({ sub: '99999999-9999-4999-8999-999999999999', username: 'intruder' }, process.env.JWT_ACCESS_SECRET!);
    const res = await request(app).get(`/matches/${matchId}`).set('Authorization', `Bearer ${stranger}`);
    expect(res.status).toBe(403);
  });

  it('completes all 4 round-1 commits without a validation error', async () => {
    for (let i = 0; i < 3; i++) {
      const g = await request(app).get(`/matches/${matchId}`).set('Authorization', authHeader);
      const state = g.body.data.matchState;
      const committed = new Set(state.initiative.order);
      const next = state.units.find((u: Row) =>
        u.ownerPlayerId === HUMAN && u.isAlive && !committed.has(u.instanceId)) as Row & { instanceId: string; position: { x: number; y: number } };
      expect(next).toBeTruthy();
      const res = await request(app).post(`/matches/${matchId}/turn`).set('Authorization', authHeader)
        .send({ actions: [
          { type: 'MOVE', unitInstanceId: next.instanceId, destination: { x: next.position.x + 1, y: next.position.y } },
          { type: 'END_TURN' },
        ] });
      expect(res.status).toBe(200);
    }
    const final = await request(app).get(`/matches/${matchId}`).set('Authorization', authHeader);
    const state = final.body.data.matchState;
    expect(state.initiative.isRound1).toBe(false);
    expect(state.initiative.order.length).toBe(8);
  });

  it('round 2+: acting with the wrong unit is a clean 422', async () => {
    const g = await request(app).get(`/matches/${matchId}`).set('Authorization', authHeader);
    const state = g.body.data.matchState;
    if (state.activePlayerId !== HUMAN) return; // Fable slot first — nothing to assert
    const wrong = state.units.find((u: Row) =>
      u.ownerPlayerId === HUMAN && u.isAlive && u.instanceId !== state.initiative.activeUnitId) as Row & { instanceId: string };
    const res = await request(app).post(`/matches/${matchId}/turn`).set('Authorization', authHeader)
      .send({ actions: [{ type: 'MOVE', unitInstanceId: wrong.instanceId, destination: { x: 4, y: 4 } }, { type: 'END_TURN' }] });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/current initiative unit/i);
  });

  it('forfeit completes the match and further turns are rejected', async () => {
    const res = await request(app).post(`/matches/${matchId}/forfeit`).set('Authorization', authHeader);
    expect(res.status).toBe(200);
    const after = await request(app).post(`/matches/${matchId}/turn`).set('Authorization', authHeader)
      .send({ actions: [{ type: 'END_TURN' }] });
    expect(after.status).toBe(409);
  });
});
