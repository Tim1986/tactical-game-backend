/**
 * Challenge invite flow tests.
 *
 * Tests the invite route integration against a fake in-memory DB,
 * following the same pattern as httpMatchFlow.test.ts.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.DATABASE_URL = 'postgres://fake/fake';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-long-enough-for-hs256';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-long-enough-for-hs256';
process.env.RATE_LIMIT_API_MAX = '100000';
process.env.RATE_LIMIT_AUTH_MAX = '100000';

// ── In-memory store ──────────────────────────────────────────────────────────
const CHALLENGER_ID = '11111111-1111-4111-8111-111111111111';
const CLAIMER_ID    = '22222222-2222-4222-8222-222222222222';
const TEAM_ID       = 'aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLAIMER_TEAM  = 'bbbb0000-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const users: Record<string, { id: string; username: string; elo: number; deleted_at: null }> = {
  [CHALLENGER_ID]: { id: CHALLENGER_ID, username: 'challenger', elo: 1200, deleted_at: null },
  [CLAIMER_ID]:    { id: CLAIMER_ID,    username: 'claimer',    elo: 1200, deleted_at: null },
};
const teams: Record<string, { id: string; user_id: string; is_active: boolean }> = {
  [TEAM_ID]:      { id: TEAM_ID,      user_id: CHALLENGER_ID, is_active: true },
  [CLAIMER_TEAM]: { id: CLAIMER_TEAM, user_id: CLAIMER_ID,    is_active: true },
};
const invites: Record<string, { id: string; token: string; challenger_id: string; challenger_team_id: string; status: string; claimed_by: string | null; match_id: string | null; expires_at: string; created_at: string }> = {};

const UNIT_DEF_ID = 'cccc0000-cccc-4ccc-8ccc-cccccccccccc';
const ABILITY_ID  = 'dddd0000-dddd-4ddd-8ddd-dddddddddddd';

const fakeUnitDef = {
  id: UNIT_DEF_ID, slug: 'fighter', name: 'Fighter',
  max_health: 40, armor_class: 14, movement_range: 3,
  abilities: ['melee_strike'], passives: [], special_options: [], passive_options: [],
  unlock_level: 1, asset_key: 'fighter', is_active: true,
};

const fakeAbility = {
  id: ABILITY_ID, slug: 'melee_strike', name: 'Melee Strike', description: 'Strike',
  targeting_type: 'single', range: 1, area_radius: 0, cooldown_turns: 0,
  is_special: false, is_unblockable: false, exclude_allies: true, is_multi_hit: false,
  effects: [{ type: 'damage', formula: '1d8+3' }],
};

const teamData: Record<string, { unit_ids: string[]; placement: { q: number; r: number }[]; unit_customizations: unknown[] }> = {
  [TEAM_ID]:      { unit_ids: [UNIT_DEF_ID], placement: [{ q: 0, r: 0 }], unit_customizations: [] },
  [CLAIMER_TEAM]: { unit_ids: [UNIT_DEF_ID], placement: [{ q: 1, r: 0 }], unit_customizations: [] },
};

let matchCounter = 0;

function fakeQuery(text: string, params: unknown[] = []) {
  const t = text.trim().toUpperCase();

  // Token uniqueness check (INSERT on conflict)
  if (t.startsWith('INSERT INTO CHALLENGE_INVITES')) {
    const token = params[0] as string;
    const challengerId = params[1] as string;
    const teamId = params[2] as string;
    const id = `invite-${token}`;
    invites[token] = { id, token, challenger_id: challengerId, challenger_team_id: teamId, status: 'open', claimed_by: null, match_id: null, expires_at: new Date(Date.now() + 72 * 3600000).toISOString(), created_at: new Date().toISOString() };
    return { rows: [], rowCount: 1 };
  }
  if (t.startsWith('SELECT CI.*, U.USERNAME AS CHALLENGER_USERNAME') || t.startsWith('SELECT CI.*, U.USERNAME')) {
    const token = params[0] as string;
    const inv = invites[token];
    if (!inv) return { rows: [], rowCount: 0 };
    const challenger = users[inv.challenger_id];
    return { rows: [{ ...inv, challenger_username: challenger?.username ?? 'unknown' }], rowCount: 1 };
  }
  if (t.startsWith('UPDATE CHALLENGE_INVITES SET STATUS =') && t.includes('CLAIMED_BY')) {
    const [claimerId, matchId, id] = params as string[];
    const inv = Object.values(invites).find(i => i.id === id);
    if (inv) { inv.status = 'claimed'; inv.claimed_by = claimerId; inv.match_id = matchId; }
    return { rows: [], rowCount: 1 };
  }
  if (t.startsWith('UPDATE CHALLENGE_INVITES SET STATUS = ') && t.includes('EXPIRED')) {
    return { rows: [], rowCount: 0 };
  }
  if (t.startsWith('SELECT * FROM CHALLENGE_INVITES WHERE CHALLENGER_ID')) {
    const uid = params[0] as string;
    const rows = Object.values(invites).filter(i => i.challenger_id === uid && (i.status === 'open' || i.status === 'claimed'));
    return { rows, rowCount: rows.length };
  }
  if (t.startsWith('SELECT ID FROM TEAMS WHERE ID =')) {
    const id = params[0] as string;
    const userId = params[1] as string;
    const team = teams[id];
    if (team && team.user_id === userId && team.is_active) return { rows: [{ id }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }
  if (t.startsWith('SELECT * FROM USERS WHERE ID =') || t.startsWith('SELECT ID, USERNAME')) {
    const id = params[0] as string;
    const user = users[id];
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }
  if (t.includes('INSERT INTO MATCHES')) {
    matchCounter++;
    return { rows: [{ id: `match-${matchCounter}` }], rowCount: 1 };
  }
  if (t.startsWith('INSERT INTO MATCH_STATES') || t.startsWith('INSERT INTO INITIAL_STATES')) {
    return { rows: [], rowCount: 1 };
  }
  if (t.startsWith('SELECT * FROM CHALLENGES') || t.startsWith('UPDATE CHALLENGES')) {
    return { rows: [], rowCount: 0 };
  }
  if (t.startsWith('SELECT UNIT_IDS, PLACEMENT, UNIT_CUSTOMIZATIONS FROM TEAMS')) {
    const id = params[0] as string;
    const td = teamData[id];
    if (!td) return { rows: [], rowCount: 0 };
    return { rows: [td], rowCount: 1 };
  }
  if (t.startsWith('SELECT ID, SLUG, NAME, MAX_HEALTH') && t.includes('UNIT_DEFINITIONS')) {
    return { rows: [fakeUnitDef], rowCount: 1 };
  }
  if (t.startsWith('SELECT ID, SLUG, NAME, DESCRIPTION, TARGETING_TYPE') && t.includes('ABILITY_DEFINITIONS')) {
    return { rows: [fakeAbility], rowCount: 1 };
  }
  if (t.startsWith('SELECT UNIT_IDS') || t.startsWith('SELECT U.ID, U.SLUG') || t.startsWith('SELECT TEAMS')) {
    return { rows: [], rowCount: 0 };
  }
  // Expiry updates
  if (t.startsWith('UPDATE')) return { rows: [], rowCount: 0 };
  if (t.startsWith('SELECT')) return { rows: [], rowCount: 0 };
  return { rows: [], rowCount: 0 };
}

vi.mock('../src/db/pool.js', () => ({
  query: vi.fn(async (text: string, params?: unknown[]) => fakeQuery(text, params)),
  withTransaction: vi.fn(async (fn: (client: unknown) => unknown) =>
    fn({ query: async (text: string, params?: unknown[]) => fakeQuery(text, params), release: () => {} })),
  pool: { query: vi.fn(), connect: vi.fn() },
}));

function makeToken(userId: string, username: string) {
  return jwt.sign({ sub: userId, username }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' });
}

let app: import('express').Application;
let challengerAuth: string;
let claimerAuth: string;

describe('Challenge invite flow', () => {
  beforeAll(async () => {
    const { createApp } = await import('../src/app.js');
    app = createApp();
    challengerAuth = `Bearer ${makeToken(CHALLENGER_ID, 'challenger')}`;
    claimerAuth = `Bearer ${makeToken(CLAIMER_ID, 'claimer')}`;
  });
  it('creates an invite and returns token + shareUrl', async () => {
    const res = await request(app)
      .post('/challenges/invite')
      .set('Authorization', challengerAuth)
      .send({ teamId: TEAM_ID });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.shareUrl).toContain('/l/i/');
  });

  it('GET invite info returns challenger username and open status', async () => {
    const createRes = await request(app)
      .post('/challenges/invite')
      .set('Authorization', challengerAuth)
      .send({ teamId: TEAM_ID });
    const { token } = createRes.body.data;

    const infoRes = await request(app)
      .get(`/challenges/invite/${token}`)
      .set('Authorization', claimerAuth);
    expect(infoRes.status).toBe(200);
    expect(infoRes.body.data.status).toBe('open');
    expect(infoRes.body.data.challengerUsername).toBe('challenger');
  });

  it('happy path: claimer claims invite and gets matchId', async () => {
    const createRes = await request(app)
      .post('/challenges/invite')
      .set('Authorization', challengerAuth)
      .send({ teamId: TEAM_ID });
    const { token } = createRes.body.data;

    const claimRes = await request(app)
      .post(`/challenges/invite/${token}/claim`)
      .set('Authorization', claimerAuth)
      .send({ teamId: CLAIMER_TEAM });
    expect(claimRes.status).toBe(200);
    expect(claimRes.body.data.matchId).toBeTruthy();
  });

  it('self-claim returns 409', async () => {
    const createRes = await request(app)
      .post('/challenges/invite')
      .set('Authorization', challengerAuth)
      .send({ teamId: TEAM_ID });
    const { token } = createRes.body.data;

    const res = await request(app)
      .post(`/challenges/invite/${token}/claim`)
      .set('Authorization', challengerAuth)
      .send({ teamId: TEAM_ID });
    expect(res.status).toBe(409);
  });

  it('already-claimed invite returns 409 for a second claimer', async () => {
    const createRes = await request(app)
      .post('/challenges/invite')
      .set('Authorization', challengerAuth)
      .send({ teamId: TEAM_ID });
    const { token } = createRes.body.data;

    // First claim
    await request(app)
      .post(`/challenges/invite/${token}/claim`)
      .set('Authorization', claimerAuth)
      .send({ teamId: CLAIMER_TEAM });

    // Second claim attempt (same claimer — already-claimed error)
    const res2 = await request(app)
      .post(`/challenges/invite/${token}/claim`)
      .set('Authorization', claimerAuth)
      .send({ teamId: CLAIMER_TEAM });
    expect(res2.status).toBe(409);
  });

  it('sentInvites appears in GET /challenges', async () => {
    await request(app)
      .post('/challenges/invite')
      .set('Authorization', challengerAuth)
      .send({ teamId: TEAM_ID });

    const res = await request(app)
      .get('/challenges')
      .set('Authorization', challengerAuth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.sentInvites)).toBe(true);
  });
});
