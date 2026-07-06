"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderboard = getLeaderboard;
exports.refreshLeaderboardSnapshot = refreshLeaderboardSnapshot;
exports.isUserInTopN = isUserInTopN;
const pool_js_1 = require("../db/pool.js");
// ---------------------------------------------------------------
// Get the most recent daily snapshot (top 10)
// Falls back to live query if no snapshot exists yet.
// ---------------------------------------------------------------
async function getLeaderboard() {
    // Try latest snapshot first
    const snapshotResult = await (0, pool_js_1.query)(`SELECT rank, user_id, username, elo, win_count, match_count, snapshotted_at
     FROM leaderboard_snapshots
     WHERE snapshotted_at = (SELECT MAX(snapshotted_at) FROM leaderboard_snapshots)
     ORDER BY rank ASC
     LIMIT 10`);
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
    const liveResult = await (0, pool_js_1.query)(`SELECT u.id, u.username, u.elo,
            COUNT(CASE WHEN (m.winner_id = u.id) THEN 1 END)::int AS win_count,
            COUNT(m.id)::int AS match_count
     FROM users u
     LEFT JOIN matches m ON (m.player_one_id = u.id OR m.player_two_id = u.id)
       AND m.status = 'completed'
     GROUP BY u.id
     ORDER BY u.elo DESC
     LIMIT 10`);
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
async function refreshLeaderboardSnapshot() {
    const now = new Date().toISOString();
    const result = await (0, pool_js_1.query)(`SELECT u.id, u.username, u.elo,
            COUNT(CASE WHEN (m.winner_id = u.id) THEN 1 END)::int AS win_count,
            COUNT(m.id)::int AS match_count
     FROM users u
     LEFT JOIN matches m ON (m.player_one_id = u.id OR m.player_two_id = u.id)
       AND m.status = 'completed'
     GROUP BY u.id
     ORDER BY u.elo DESC
     LIMIT 10`);
    if (result.rows.length === 0)
        return;
    const values = result.rows.map((r, i) => `('${now}', ${i + 1}, '${r.id}', '${r.username.replace(/'/g, "''")}', ${r.elo}, ${r.win_count}, ${r.match_count})`).join(', ');
    await (0, pool_js_1.query)(`INSERT INTO leaderboard_snapshots (snapshotted_at, rank, user_id, username, elo, win_count, match_count)
     VALUES ${values}`);
}
// ---------------------------------------------------------------
// Check if a user is in the current top 10 (for achievements)
// ---------------------------------------------------------------
async function isUserInTopN(userId, n) {
    const board = await getLeaderboard();
    return board.slice(0, n).some((e) => e.userId === userId);
}
//# sourceMappingURL=leaderboardService.js.map