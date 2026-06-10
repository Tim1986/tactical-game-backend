import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../db/pool.js';
import { config } from '../config/index.js';
import { TokenPair, User } from '../types/index.js';

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------

export function issueTokenPair(user: Pick<User, 'id' | 'username'> & { tokenVersion: number }): TokenPair {
  const accessToken = jwt.sign(
    { sub: user.id, username: user.username },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry }
  );

  const refreshToken = jwt.sign(
    { sub: user.id, tokenVersion: user.tokenVersion },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
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

  const result = await query<{
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

  const row = result.rows[0];
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
// Login
// ---------------------------------------------------------------

export interface LoginInput {
  usernameOrEmail: string;
  password: string;
}

export async function login(input: LoginInput): Promise<RegisterResult> {
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

  // Deliberate: same error for wrong username or wrong password
  // so we don't leak which one exists.
  if (!row) {
    throw new AuthError('Invalid credentials');
  }

  const passwordMatch = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatch) {
    throw new AuthError('Invalid credentials');
  }

  // Update last_active_at
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

  // token_version mismatch means user logged out all sessions
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

// ---------------------------------------------------------------
// Logout single device (client just discards tokens — no server action needed
// for access tokens since they expire quickly; this is a no-op server-side
// unless we add a token denylist, which is optional at MVP scale).
// ---------------------------------------------------------------
export async function logout(_userId: string): Promise<void> {
  // Access tokens are short-lived (15m) so no server-side action needed.
  // The client must discard both tokens on logout.
  // If you need immediate revocation, implement a Redis token denylist.
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
    // Deactivate any existing entry for this exact token
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
// Custom error classes (caught in routes to return correct status)
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
