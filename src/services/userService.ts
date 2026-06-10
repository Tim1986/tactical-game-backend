import { query } from '../db/pool.js';
import { PublicUser, User } from '../types/index.js';

// ---------------------------------------------------------------
// Get current user's full profile (private — for /users/me)
// ---------------------------------------------------------------
export async function getMe(userId: string): Promise<(Omit<User, 'passwordHash'> & { passwordHash?: never }) | null> {
  const result = await query<{
    id: string;
    username: string;
    email: string;
    elo: number;
    account_xp: number;
    account_level: number;
    created_at: string;
    last_active_at: string;
  }>(
    `SELECT id, username, email, elo, account_xp, account_level, created_at, last_active_at
     FROM users
     WHERE id = $1`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    elo: row.elo,
    accountXp: row.account_xp,
    accountLevel: row.account_level,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at,
  };
}

// ---------------------------------------------------------------
// Get public profile (for /users/:id/profile)
// ---------------------------------------------------------------
export async function getPublicProfile(userId: string): Promise<PublicUser | null> {
  const result = await query<{
    id: string;
    username: string;
    elo: number;
    account_level: number;
  }>(
    'SELECT id, username, elo, account_level FROM users WHERE id = $1',
    [userId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    elo: row.elo,
    accountLevel: row.account_level,
  };
}

// ---------------------------------------------------------------
// Update username (the only updateable field at MVP)
// ---------------------------------------------------------------
export class UsernameConflictError extends Error {
  constructor() {
    super('Username is already taken');
    this.name = 'UsernameConflictError';
  }
}

export async function updateUsername(userId: string, newUsername: string): Promise<void> {
  try {
    await query(
      'UPDATE users SET username = $1, last_active_at = NOW() WHERE id = $2',
      [newUsername, userId]
    );
  } catch (err: unknown) {
    // Postgres unique violation code
    if (err instanceof Error && 'code' in err && (err as { code?: string }).code === '23505') {
      throw new UsernameConflictError();
    }
    throw err;
  }
}
