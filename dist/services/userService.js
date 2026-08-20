"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountDeletionAuthError = exports.UsernameConflictError = void 0;
exports.getMe = getMe;
exports.getPublicProfile = getPublicProfile;
exports.updateUsername = updateUsername;
exports.deleteAccount = deleteAccount;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const pool_js_1 = require("../db/pool.js");
const matchService = __importStar(require("./matchService.js"));
// ---------------------------------------------------------------
// Get current user's full profile (private — for /users/me)
// ---------------------------------------------------------------
async function getMe(userId) {
    const result = await (0, pool_js_1.query)(`SELECT id, username, email, elo, account_xp, account_level, created_at, last_active_at
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`, [userId]);
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
// ---------------------------------------------------------------
// Delete account (soft-delete + anonymize)
// ---------------------------------------------------------------
class AccountDeletionAuthError extends Error {
    constructor() {
        super('Password is incorrect');
        this.name = 'AccountDeletionAuthError';
    }
}
exports.AccountDeletionAuthError = AccountDeletionAuthError;
/**
 * Permanently deletes the user's account after re-authenticating with their
 * password. Because `matches` reference users with RESTRICT, the row is
 * retained but all PII is anonymized and `deleted_at` is set — the account can
 * never be logged into again, disappears from the app, and frees its original
 * username/email for reuse. Active matches are forfeited (opponents get the
 * win) and all derived data (teams, queue entries, push tokens, leaderboard
 * snapshots, reset codes) is removed.
 */
async function deleteAccount(userId, password) {
    const result = await (0, pool_js_1.query)('SELECT password_hash, deleted_at FROM users WHERE id = $1', [userId]);
    const row = result.rows[0];
    // Treat missing / already-deleted as an auth failure — never leak state.
    if (!row || row.deleted_at)
        throw new AccountDeletionAuthError();
    const passwordMatch = await bcryptjs_1.default.compare(password, row.password_hash);
    if (!passwordMatch)
        throw new AccountDeletionAuthError();
    // Forfeit active matches first — each runs in its own transaction and awards
    // the opponent the win. Ignore races where a match already ended.
    const active = await (0, pool_js_1.query)("SELECT id FROM matches WHERE (player_one_id = $1 OR player_two_id = $1) AND status = 'active'", [userId]);
    for (const m of active.rows) {
        try {
            await matchService.forfeitMatch(m.id, userId);
        }
        catch {
            // Match ended between the SELECT and the forfeit — nothing to do.
        }
    }
    // Anonymize + soft-delete atomically. token_version bump revokes refresh
    // tokens; the 15-minute access token is left to expire (getMe already
    // rejects deleted accounts, so the app logs out on its next call).
    await (0, pool_js_1.withTransaction)(async (client) => {
        const anonSuffix = userId.replace(/-/g, '').slice(0, 12);
        const anonUsername = `deleted_${anonSuffix}`;
        const anonEmail = `deleted+${userId}@deleted.invalid`;
        const deadHash = await bcryptjs_1.default.hash(crypto_1.default.randomUUID(), 12);
        await client.query(`UPDATE users
         SET username = $2, email = $3, password_hash = $4,
             deleted_at = NOW(), token_version = token_version + 1,
             last_active_at = NOW()
       WHERE id = $1`, [userId, anonUsername, anonEmail, deadHash]);
        await client.query('UPDATE teams SET is_active = FALSE WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM matchmaking_queue WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM push_tokens WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM leaderboard_snapshots WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM password_reset_codes WHERE user_id = $1', [userId]);
    });
}
//# sourceMappingURL=userService.js.map