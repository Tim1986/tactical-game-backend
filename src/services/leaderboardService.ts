import { query } from '../db/pool.js';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  elo: number;
  winCount: number;
  matchCount: number;
  snapshotDate: string; // ISO date of snapshot
}

// ---------------------------------------------------------------
// Get the most recent daily snapshot (top 10)
// Falls back to live query if no snapshot exists yet.
// ---------------------------------------------------------------
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // Try latest snapshot first
  const snapshotResult = await query<{
    rank: number; user_id: string; username: string; elo: number;
    win_count: number; match_count: number; snapshotted_at: string;
  }>(
    `SELECT rank, user_id, username, elo, win_count, match_count, snapshotted_at
     FROM leaderboard_snapshots
     WHERE snapshotted_at = (SELECT MAX(snapshotted_at) FROM leaderboard_snapshots)
     ORDER BY rank ASC
     LIMIT 10`
  );

  if (snapshotResult.rows.length > 0) {
    return snapshotResult.rows.map((r) => ({
      rank: r.rank,
      userId: r.user_id,
      username: r.username,
      elo: r.elo,
      winCount: r.win_count,
      matchCount: r.match_count,
      snapshotDate: r.snapshotted_at.split('T')[0],
    }));
  }

  // No snapshot yet — fall back to live query
  const liveResult = await query<{
    id: string; username: string; elo: number; win_count: number; match_count: number;
  }>(
    `SELECT u.id, u.username, u.elo,
            COUNT(CASE WHEN (m.winner_id = u.id) THEN 1 END)::int AS win_count,
            COUNT(m.id)::int AS match_count
     FROM users u
     LEFT JOIN matches m ON (m.player_one_id = u.id OR m.player_two_id = u.id)
       AND m.status = 'completed'
     GROUP BY u.id
     ORDER BY u.elo DESC
     LIMIT 10`
  );

  return liveResult.rows.map((r, i) => ({
    rank: i + 1,
    userId: r.id,
    username: r.username,
    elo: r.elo,
    winCount: r.win_count,
    matchCount: r.match_count,
    snapshotDate: new Date().toISOString().split('T')[0],
  }));
}

// ---------------------------------------------------------------
// Refresh snapshot — called by daily cron job
// ---------------------------------------------------------------
export async function refreshLeaderboardSnapshot(): Promise<void> {
  const now = new Date().toISOString();

  const result = await query<{
    id: string; username: string; elo: number; win_count: number; match_count: number;
  }>(
    `SELECT u.id, u.username, u.elo,
            COUNT(CASE WHEN (m.winner_id = u.id) THEN 1 END)::int AS win_count,
            COUNT(m.id)::int AS match_count
     FROM users u
     LEFT JOIN matches m ON (m.player_one_id = u.id OR m.player_two_id = u.id)
       AND m.status = 'completed'
     GROUP BY u.id
     ORDER BY u.elo DESC
     LIMIT 10`
  );

  if (result.rows.length === 0) return;

  const values = result.rows.map((r, i) =>
    `('${now}', ${i + 1}, '${r.id}', '${r.username.replace(/'/g, "''")}', ${r.elo}, ${r.win_count}, ${r.match_count})`
  ).join(', ');

  await query(
    `INSERT INTO leaderboard_snapshots (snapshotted_at, rank, user_id, username, elo, win_count, match_count)
     VALUES ${values}`
  );
}

// ---------------------------------------------------------------
// Check if a user is in the current top 10 (for achievements)
// ---------------------------------------------------------------
export async function isUserInTopN(userId: string, n: number): Promise<boolean> {
  const board = await getLeaderboard();
  return board.slice(0, n).some((e) => e.userId === userId);
}
