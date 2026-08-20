"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.AuthError = void 0;
exports.issueTokenPair = issueTokenPair;
exports.verifyRefreshToken = verifyRefreshToken;
exports.register = register;
exports.login = login;
exports.refresh = refresh;
exports.logoutAll = logoutAll;
exports.logout = logout;
exports.requestPasswordReset = requestPasswordReset;
exports.resetPassword = resetPassword;
exports.savePushToken = savePushToken;
exports.devLogin = devLogin;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const pool_js_1 = require("../db/pool.js");
const index_js_1 = require("../config/index.js");
const unitService_js_1 = require("./unitService.js");
const emailService_js_1 = require("./emailService.js");
const BCRYPT_ROUNDS = 12;
const DEFAULT_TEAM_UNIT_SLUGS = ['fighter', 'barbarian', 'ranger', 'rogue'];
// ---------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------
function issueTokenPair(user) {
    const accessToken = jsonwebtoken_1.default.sign({ sub: user.id, username: user.username }, index_js_1.config.jwt.accessSecret, { expiresIn: index_js_1.config.jwt.accessExpiry });
    const refreshToken = jsonwebtoken_1.default.sign({ sub: user.id, tokenVersion: user.tokenVersion }, index_js_1.config.jwt.refreshSecret, { expiresIn: index_js_1.config.jwt.refreshExpiry });
    return { accessToken, refreshToken };
}
function verifyRefreshToken(token) {
    const payload = jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.refreshSecret);
    return payload;
}
async function register(input) {
    const { username, email, password } = input;
    // Check for existing username/email
    const existing = await (0, pool_js_1.query)('SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1', [username, email]);
    if (existing.rowCount && existing.rowCount > 0) {
        throw new ConflictError('Username or email is already taken');
    }
    const passwordHash = await bcryptjs_1.default.hash(password, BCRYPT_ROUNDS);
    // Resolve default team unit slugs to IDs before opening the transaction
    // (pure read against a static table, doesn't need to be transactional)
    const defaultUnits = await Promise.all(DEFAULT_TEAM_UNIT_SLUGS.map((slug) => (0, unitService_js_1.getUnitBySlug)(slug)));
    const missingIndex = defaultUnits.findIndex((u) => !u);
    if (missingIndex !== -1) {
        throw new Error(`Default team unit slug not found in unit_definitions: ${DEFAULT_TEAM_UNIT_SLUGS[missingIndex]}`);
    }
    const defaultUnitIds = defaultUnits.map((u) => u.id);
    const { userRow, teamRow } = await (0, pool_js_1.withTransaction)(async (client) => {
        const userResult = await client.query(`INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, elo, account_level, token_version`, [username, email, passwordHash]);
        const insertedUser = userResult.rows[0];
        const teamResult = await client.query(`INSERT INTO teams (user_id, name, unit_ids)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, name, unit_ids, placement, is_active, created_at`, [insertedUser.id, 'Default Team', JSON.stringify(defaultUnitIds)]);
        return { userRow: insertedUser, teamRow: teamResult.rows[0] };
    });
    const tokens = issueTokenPair({
        id: userRow.id,
        username: userRow.username,
        tokenVersion: userRow.token_version,
    });
    const team = {
        id: teamRow.id,
        userId: teamRow.user_id,
        name: teamRow.name,
        unitIds: teamRow.unit_ids,
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
async function login(input) {
    const { usernameOrEmail, password } = input;
    const result = await (0, pool_js_1.query)(`SELECT id, username, email, password_hash, elo, account_level, token_version
     FROM users
     WHERE (username = $1 OR email = $1) AND deleted_at IS NULL
     LIMIT 1`, [usernameOrEmail]);
    const row = result.rows[0];
    if (!row) {
        throw new AuthError('Invalid credentials');
    }
    const passwordMatch = await bcryptjs_1.default.compare(password, row.password_hash);
    if (!passwordMatch) {
        throw new AuthError('Invalid credentials');
    }
    await (0, pool_js_1.query)('UPDATE users SET last_active_at = NOW() WHERE id = $1', [row.id]);
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
async function refresh(token) {
    let payload;
    try {
        payload = verifyRefreshToken(token);
    }
    catch {
        throw new AuthError('Invalid or expired refresh token');
    }
    const result = await (0, pool_js_1.query)('SELECT id, username, token_version FROM users WHERE id = $1', [payload.sub]);
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
async function logoutAll(userId) {
    await (0, pool_js_1.query)('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [userId]);
}
async function logout(_userId) {
    // Access tokens are short-lived (15m) so no server-side action needed.
    // The client must discard both tokens on logout.
}
// ---------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;
function generateResetCode() {
    // 6-digit numeric code, cryptographically random, no leading-zero loss
    const buf = crypto_1.default.randomBytes(4);
    return String(buf.readUInt32BE(0) % 1_000_000).padStart(6, '0');
}
/**
 * Start a password reset. ALWAYS resolves without revealing whether the email
 * has an account (prevents enumeration). If the account exists, a 6-digit
 * code is stored (hashed) and emailed.
 */
async function requestPasswordReset(email) {
    const result = await (0, pool_js_1.query)('SELECT id, email FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    const user = result.rows[0];
    if (!user)
        return; // silent — do not leak account existence
    const code = generateResetCode();
    const codeHash = await bcryptjs_1.default.hash(code, BCRYPT_ROUNDS);
    await (0, pool_js_1.query)(`INSERT INTO password_reset_codes (user_id, code_hash, expires_at, attempts)
     VALUES ($1, $2, NOW() + INTERVAL '15 minutes', 0)
     ON CONFLICT (user_id) DO UPDATE
       SET code_hash = EXCLUDED.code_hash,
           expires_at = EXCLUDED.expires_at,
           attempts = 0,
           created_at = NOW()`, [user.id, codeHash]);
    await (0, emailService_js_1.sendPasswordResetEmail)(user.email, code);
}
/**
 * Complete a password reset: verify the emailed code, set the new password,
 * and revoke every existing session (token_version bump).
 */
async function resetPassword(email, code, newPassword) {
    const result = await (0, pool_js_1.query)(`SELECT r.user_id, r.code_hash, r.expires_at, r.attempts
     FROM password_reset_codes r JOIN users u ON u.id = r.user_id
     WHERE u.email = $1`, [email]);
    const row = result.rows[0];
    // Same message for every failure mode — no oracle for attackers.
    const fail = () => new AuthError('Invalid or expired reset code');
    if (!row)
        throw fail();
    if (new Date(row.expires_at).getTime() < Date.now() || row.attempts >= RESET_MAX_ATTEMPTS) {
        await (0, pool_js_1.query)('DELETE FROM password_reset_codes WHERE user_id = $1', [row.user_id]);
        throw fail();
    }
    const ok = await bcryptjs_1.default.compare(code, row.code_hash);
    if (!ok) {
        await (0, pool_js_1.query)('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE user_id = $1', [row.user_id]);
        throw fail();
    }
    const passwordHash = await bcryptjs_1.default.hash(newPassword, BCRYPT_ROUNDS);
    await (0, pool_js_1.withTransaction)(async (client) => {
        await client.query('UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2', [passwordHash, row.user_id]);
        await client.query('DELETE FROM password_reset_codes WHERE user_id = $1', [row.user_id]);
    });
}
// ---------------------------------------------------------------
// Register/save push token
// ---------------------------------------------------------------
async function savePushToken(userId, token, platform) {
    await (0, pool_js_1.withTransaction)(async (client) => {
        await client.query(`INSERT INTO push_tokens (user_id, token, platform, is_active, updated_at)
       VALUES ($1, $2, $3, TRUE, NOW())
       ON CONFLICT (token) DO UPDATE SET
         user_id    = EXCLUDED.user_id,
         platform   = EXCLUDED.platform,
         is_active  = TRUE,
         updated_at = NOW()`, [userId, token, platform]);
    });
}
// ---------------------------------------------------------------
// Dev login (development only — upserts the claude_test account)
// ---------------------------------------------------------------
async function devLogin() {
    const username = 'claude_test';
    const email = 'claude@dungeon.local';
    const fetchExisting = async () => {
        const existing = await (0, pool_js_1.query)('SELECT id, username, email, elo, account_level, token_version FROM users WHERE username = $1', [username]);
        const row = existing.rows[0];
        if (!row)
            return null;
        await (0, pool_js_1.query)('UPDATE users SET last_active_at = NOW() WHERE id = $1', [row.id]);
        return {
            user: { id: row.id, username: row.username, email: row.email, elo: row.elo, accountLevel: row.account_level },
            tokens: issueTokenPair({ id: row.id, username: row.username, tokenVersion: row.token_version }),
        };
    };
    const found = await fetchExisting();
    if (found)
        return found;
    // First time: register the account (also creates a default team). Two
    // concurrent dev-logins can race past the SELECT — the loser of the
    // unique-constraint race just reads the winner's row.
    try {
        const result = await register({ username, email, password: Math.random().toString(36) + Math.random().toString(36) });
        return { user: result.user, tokens: result.tokens };
    }
    catch {
        const raced = await fetchExisting();
        if (raced)
            return raced;
        throw new AuthError('Dev login failed');
    }
}
// ---------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------
class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
//# sourceMappingURL=authService.js.map