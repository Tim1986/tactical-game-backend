"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsernameConflictError = void 0;
exports.getMe = getMe;
exports.getPublicProfile = getPublicProfile;
exports.updateUsername = updateUsername;
const pool_js_1 = require("../db/pool.js");
// ---------------------------------------------------------------
// Get current user's full profile (private — for /users/me)
// ---------------------------------------------------------------
async function getMe(userId) {
    const result = await (0, pool_js_1.query)(`SELECT id, username, email, elo, account_xp, account_level, created_at, last_active_at
     FROM users
     WHERE id = $1`, [userId]);
    const row = result.rows[0];
    if (!row)
        return null;
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
async function getPublicProfile(userId) {
    const result = await (0, pool_js_1.query)('SELECT id, username, elo, account_level FROM users WHERE id = $1', [userId]);
    const row = result.rows[0];
    if (!row)
        return null;
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
class UsernameConflictError extends Error {
    constructor() {
        super('Username is already taken');
        this.name = 'UsernameConflictError';
    }
}
exports.UsernameConflictError = UsernameConflictError;
async function updateUsername(userId, newUsername) {
    try {
        await (0, pool_js_1.query)('UPDATE users SET username = $1, last_active_at = NOW() WHERE id = $2', [newUsername, userId]);
    }
    catch (err) {
        // Postgres unique violation code
        if (err instanceof Error && 'code' in err && err.code === '23505') {
            throw new UsernameConflictError();
        }
        throw err;
    }
}
//# sourceMappingURL=userService.js.map