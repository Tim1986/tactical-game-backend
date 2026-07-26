import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query, withTransaction } from '../db/pool.js';
import { PublicUser, User } from '../types/index.js';
import * as matchService from './matchService.js';

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
     WHERE id = $1 AND deleted_at IS NULL`,
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

// ---------------------------------------------------------------
// Delete account (soft-delete + anonymize)
// ---------------------------------------------------------------
export class AccountDeletionAuthError extends Error {
  constructor() {
    super('Password is incorrect');
    this.name = 'AccountDeletionAuthError';
  }
}

/**
 * Permanently deletes the user's account after re-authenticating with their
 * password. Because `matches` reference users with RESTRICT, the row is
 * retained but all PII is anonymized and `deleted_at` is set — the account can
 * never be logged into again, disappears from the app, and frees its original
 * username/email for reuse. Active matches are forfeited (opponents get the
 * win) and all derived data (teams, queue entries, push tokens, leaderboard
 * snapshots, reset codes) is removed.
 */
export async function deleteAccount(userId: string, password: string): Promise<void> {
  const result = await query<{ password_hash: string; deleted_at: string | null }>(
    'SELECT password_hash, deleted_at FROM users WHERE id = $1',
    [userId]
  );
  const row = result.rows[0];
  // Treat missing / already-deleted as an auth failure — never leak state.
  if (!row || row.deleted_at) throw new AccountDeletionAuthError();

  const passwordMatch = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatch) throw new AccountDeletionAuthError();

  // Forfeit active matches first — each runs in its own transaction and awards
  // the opponent the win. Ignore races where a match already ended.
  const active = await query<{ id: string }>(
    "SELECT id FROM matches WHERE (player_one_id = $1 OR player_two_id = $1) AND status = 'active'",
    [userId]
  );
  for (const m of active.rows) {
    try {
      await matchService.forfeitMatch(m.id, userId);
    } catch {
      // Match ended between the SELECT and the forfeit — nothing to do.
    }
  }

  // Anonymize + soft-delete atomically. token_version bump revokes refresh
  // tokens; the 15-minute access token is left to expire (getMe already
  // rejects deleted accounts, so the app logs out on its next call).
  await withTransaction(async (client) => {
    const anonSuffix = userId.replace(/-/g, '').slice(0, 12);
    const anonUsername = `deleted_${anonSuffix}`;
    const anonEmail = `deleted+${userId}@deleted.invalid`;
    const deadHash = await bcrypt.hash(crypto.randomUUID(), 12);

    await client.query(
      `UPDATE users
         SET username = $2, email = $3, password_hash = $4,
             deleted_at = NOW(), token_version = token_version + 1,
             last_active_at = NOW()
       WHERE id = $1`,
      [userId, anonUsername, anonEmail, deadHash]
    );
    await client.query('UPDATE teams SET is_active = FALSE WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM matchmaking_queue WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM push_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM leaderboard_snapshots WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM password_reset_codes WHERE user_id = $1', [userId]);
  });
}
