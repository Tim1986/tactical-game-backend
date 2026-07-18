import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../db/pool.js';
import { config } from '../config/index.js';
import { TokenPair, User, Team } from '../types/index.js';
import { getUnitBySlug } from './unitService.js';

const BCRYPT_ROUNDS = 12;
const DEFAULT_TEAM_UNIT_SLUGS = ['fighter', 'barbarian', 'ranger', 'rogue'] as const;

// ---------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------

export function issueTokenPair(user: Pick<User, 'id' | 'username'> & { tokenVersion: number }): TokenPair {
  const accessToken = jwt.sign(
    { sub: user.id, username: user.username },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { sub: user.id, tokenVersion: user.tokenVersion },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string): { sub: string; tokenVersion: number } {
  const payload = jwt.verify(token, config.jwt.refreshSecret) as {
    sub: string;
    tokenVersion: number;
  };
  return payload;
}

// ---------------------------------------------------------------
// Register
// ---------------------------------------------------------------

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  user: Pick<User, 'id' | 'username' | 'email' | 'elo' | 'accountLevel'>;
  tokens: TokenPair;
  team: Team;
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const { username, email, password } = input;

  // Check for existing username/email
  const existing = await query<{ id: string }>(
    'SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1',
    [username, email]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new ConflictError('Username or email is already taken');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Resolve default team unit slugs to IDs before opening the transaction
  // (pure read against a static table, doesn't need to be transactional)
  const defaultUnits = await Promise.all(
    DEFAULT_TEAM_UNIT_SLUGS.map((slug) => getUnitBySlug(slug))
  );
  const missingIndex = defaultUnits.findIndex((u) => !u);
  if (missingIndex !== -1) {
    throw new Error(
      `Default team unit slug not found in unit_definitions: ${DEFAULT_TEAM_UNIT_SLUGS[missingIndex]}`
    );
  }
  const defaultUnitIds = defaultUnits.map((u) => u!.id);

  const { userRow, teamRow } = await withTransaction(async (client) => {
    const userResult = await client.query<{
      id: string;
      username: string;
      email: string;
      elo: number;
      account_level: number;
      token_version: number;
    }>(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, elo, account_level, token_version`,
      [username, email, passwordHash]
    );

    const insertedUser = userResult.rows[0];

    const teamResult = await client.query<{
      id: string;
      user_id: string;
      name: string;
      unit_ids: string[];
      placement: Array<{ x: number; y: number }>;
      unit_customizations: import('../types/index.js').UnitCustomization[];
      is_active: boolean;
      created_at: string;
    }>(
      `INSERT INTO teams (user_id, name, unit_ids)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, name, unit_ids, placement, is_active, created_at`,
      [insertedUser.id, 'Default Team', JSON.stringify(defaultUnitIds)]
    );

    return { userRow: insertedUser, teamRow: teamResult.rows[0] };
  });

  const tokens = issueTokenPair({
    id: userRow.id,
    username: userRow.username,
    tokenVersion: userRow.token_version,
  });

  const team: Team = {
    id: teamRow.id,
    userId: teamRow.user_id,
    name: teamRow.name,
    unitIds: teamRow.unit_ids as [string, string, string, string],
    placement: teamRow.placement,
    unitCustomizations: teamRow.unit_customizations ?? [],
    isActive: teamRow.is_active,
    createdAt: teamRow.created_at,
  };

  return {
    user: {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      elo: userRow.elo,
      accountLevel: userRow.account_level,
    },
    tokens,
    team,
  };
}

// ---------------------------------------------------------------
// Login
// ---------------------------------------------------------------

export interface LoginInput {
  usernameOrEmail: string;
  password: string;
}

export interface LoginResult {
  user: Pick<User, 'id' | 'username' | 'email' | 'elo' | 'accountLevel'>;
  tokens: TokenPair;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const { usernameOrEmail, password } = input;

  const result = await query<{
    id: string;
    username: string;
    email: string;
    password_hash: string;
    elo: number;
    account_level: number;
    token_version: number;
  }>(
    `SELECT id, username, email, password_hash, elo, account_level, token_version
     FROM users
     WHERE username = $1 OR email = $1
     LIMIT 1`,
    [usernameOrEmail]
  );

  const row = result.rows[0];

  if (!row) {
    throw new AuthError('Invalid credentials');
  }

  const passwordMatch = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatch) {
    throw new AuthError('Invalid credentials');
  }

  await query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [row.id]);

  const tokens = issueTokenPair({ id: row.id, username: row.username, tokenVersion: row.token_version });

  return {
    user: {
      id: row.id,
      username: row.username,
      email: row.email,
      elo: row.elo,
      accountLevel: row.account_level,
    },
    tokens,
  };
}

// ---------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------

export async function refresh(token: string): Promise<TokenPair> {
  let payload: { sub: string; tokenVersion: number };

  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AuthError('Invalid or expired refresh token');
  }

  const result = await query<{
    id: string;
    username: string;
    token_version: number;
  }>(
    'SELECT id, username, token_version FROM users WHERE id = $1',
    [payload.sub]
  );

  const user = result.rows[0];
  if (!user) {
    throw new AuthError('User not found');
  }

  if (user.token_version !== payload.tokenVersion) {
    throw new AuthError('Token has been revoked');
  }

  return issueTokenPair({ id: user.id, username: user.username, tokenVersion: user.token_version });
}

// ---------------------------------------------------------------
// Logout (invalidate all refresh tokens for this user)
// ---------------------------------------------------------------

export async function logoutAll(userId: string): Promise<void> {
  await query(
    'UPDATE users SET token_version = token_version + 1 WHERE id = $1',
    [userId]
  );
}

export async function logout(_userId: string): Promise<void> {
  // Access tokens are short-lived (15m) so no server-side action needed.
  // The client must discard both tokens on logout.
}

// ---------------------------------------------------------------
// Register/save push token
// ---------------------------------------------------------------

export async function savePushToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android'
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO push_tokens (user_id, token, platform, is_active, updated_at)
       VALUES ($1, $2, $3, TRUE, NOW())
       ON CONFLICT (token) DO UPDATE SET
         user_id    = EXCLUDED.user_id,
         platform   = EXCLUDED.platform,
         is_active  = TRUE,
         updated_at = NOW()`,
      [userId, token, platform]
    );
  });
}

// ---------------------------------------------------------------
// Dev login (development only — upserts the claude_test account)
// ---------------------------------------------------------------

export async function devLogin(): Promise<LoginResult> {
  const username = 'claude_test';
  const email = 'claude@dungeon.local';

  const fetchExisting = async (): Promise<LoginResult | null> => {
    const existing = await query<{ id: string; username: string; email: string; elo: number; account_level: number; token_version: number }>(
      'SELECT id, username, email, elo, account_level, token_version FROM users WHERE username = $1',
      [username],
    );
    const row = existing.rows[0];
    if (!row) return null;
    await query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [row.id]);
    return {
      user: { id: row.id, username: row.username, email: row.email, elo: row.elo, accountLevel: row.account_level },
      tokens: issueTokenPair({ id: row.id, username: row.username, tokenVersion: row.token_version }),
    };
  };

  const found = await fetchExisting();
  if (found) return found;

  // First time: register the account (also creates a default team). Two
  // concurrent dev-logins can race past the SELECT — the loser of the
  // unique-constraint race just reads the winner's row.
  try {
    const result = await register({ username, email, password: Math.random().toString(36) + Math.random().toString(36) });
    return { user: result.user, tokens: result.tokens };
  } catch {
    const raced = await fetchExisting();
    if (raced) return raced;
    throw new AuthError('Dev login failed');
  }
}

// ---------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
