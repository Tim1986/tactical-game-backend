"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeError = exports.ChallengeAccessError = exports.ChallengeNotFoundError = void 0;
exports.issueChallenge = issueChallenge;
exports.acceptChallenge = acceptChallenge;
exports.declineChallenge = declineChallenge;
exports.getChallenges = getChallenges;
const uuid_1 = require("uuid");
const pool_js_1 = require("../db/pool.js");
const matchService_js_1 = require("./matchService.js");
const notificationService_js_1 = require("./notificationService.js");
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../utils/logger.js");
class ChallengeNotFoundError extends Error {
    constructor() { super('Challenge not found'); this.name = 'ChallengeNotFoundError'; }
}
exports.ChallengeNotFoundError = ChallengeNotFoundError;
class ChallengeAccessError extends Error {
    constructor() { super('You are not part of this challenge'); this.name = 'ChallengeAccessError'; }
}
exports.ChallengeAccessError = ChallengeAccessError;
class ChallengeError extends Error {
    constructor(message) { super(message); this.name = 'ChallengeError'; }
}
exports.ChallengeError = ChallengeError;
// Issue a challenge to an opponent by their username
async function issueChallenge(challengerId, challengerTeamId, opponentUsername) {
    if (!opponentUsername?.trim())
        throw new ChallengeError('Opponent username is required');
    // Look up opponent by username
    const opponentResult = await (0, pool_js_1.query)('SELECT id, username FROM users WHERE username = $1', [opponentUsername.trim()]);
    const opponent = opponentResult.rows[0];
    if (!opponent)
        throw new ChallengeError('Player "' + opponentUsername + '" not found');
    if (opponent.id === challengerId)
        throw new ChallengeError('You cannot challenge yourself');
    // Verify challenger owns the team
    const teamResult = await (0, pool_js_1.query)('SELECT id FROM teams WHERE id = $1 AND user_id = $2 AND is_active = TRUE', [challengerTeamId, challengerId]);
    if (!teamResult.rows[0])
        throw new ChallengeError('Team not found');
    // Check for existing pending challenge between these players
    const existing = await (0, pool_js_1.query)('SELECT id FROM challenges WHERE challenger_id = $1 AND opponent_id = $2 AND status = $3', [challengerId, opponent.id, 'pending']);
    if (existing.rows[0])
        throw new ChallengeError('You already have a pending challenge with this player');
    const challengerResult = await (0, pool_js_1.query)('SELECT username FROM users WHERE id = $1', [challengerId]);
    const challengerUsername = challengerResult.rows[0]?.username ?? 'Someone';
    const challengeId = (0, uuid_1.v4)();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48-hour expiry
    await (0, pool_js_1.query)('INSERT INTO challenges (id, challenger_id, challenger_username, opponent_id, opponent_username, challenger_team_id, status, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [challengeId, challengerId, challengerUsername, opponent.id, opponent.username, challengerTeamId, 'pending', expiresAt.toISOString()]);
    // Notify opponent
    setImmediate(() => {
        void (0, notificationService_js_1.notifyUser)(opponent.id, 'CHALLENGE_RECEIVED', {
            challengeId,
            challengerUsername,
        });
    });
    logger_js_1.logger.info({ challengeId, challengerId, opponentId: opponent.id }, 'Challenge issued');
    return { challengeId, opponentUsername: opponent.username, status: 'pending' };
}
// Accept a challenge — opponent picks their team and the match is created
async function acceptChallenge(challengeId, acceptingUserId, acceptingTeamId) {
    return (0, pool_js_1.withTransaction)(async (client) => {
        const result = await client.query('SELECT * FROM challenges WHERE id = $1 FOR UPDATE', [challengeId]);
        const challenge = result.rows[0];
        if (!challenge)
            throw new ChallengeNotFoundError();
        if (challenge.opponent_id !== acceptingUserId)
            throw new ChallengeAccessError();
        if (challenge.status !== 'pending')
            throw new ChallengeError('This challenge is no longer pending');
        if (new Date(challenge.expires_at) < new Date()) {
            await client.query('UPDATE challenges SET status = $1 WHERE id = $2', ['expired', challengeId]);
            throw new ChallengeError('This challenge has expired');
        }
        // Verify accepting player owns the team
        const teamResult = await client.query('SELECT id FROM teams WHERE id = $1 AND user_id = $2 AND is_active = TRUE', [acceptingTeamId, acceptingUserId]);
        if (!teamResult.rows[0])
            throw new ChallengeError('Team not found');
        const { matchId } = await (0, matchService_js_1.createMatch)(challenge.challenger_id, challenge.opponent_id, challenge.challenger_team_id, acceptingTeamId, index_js_1.config.game.turnDeadlineHours);
        await client.query('UPDATE challenges SET status = $1, match_id = $2 WHERE id = $3', ['accepted', matchId, challengeId]);
        // Notify challenger their challenge was accepted
        setImmediate(() => {
            void (0, notificationService_js_1.notifyUser)(challenge.challenger_id, 'CHALLENGE_ACCEPTED', {
                matchId,
                opponentUsername: challenge.opponent_username,
            });
        });
        logger_js_1.logger.info({ challengeId, matchId }, 'Challenge accepted');
        return { matchId };
    });
}
// Decline a challenge
async function declineChallenge(challengeId, decliningUserId) {
    const result = await (0, pool_js_1.query)('SELECT * FROM challenges WHERE id = $1', [challengeId]);
    const challenge = result.rows[0];
    if (!challenge)
        throw new ChallengeNotFoundError();
    if (challenge.opponent_id !== decliningUserId)
        throw new ChallengeAccessError();
    if (challenge.status !== 'pending')
        throw new ChallengeError('This challenge is no longer pending');
    await (0, pool_js_1.query)('UPDATE challenges SET status = $1 WHERE id = $2', ['declined', challengeId]);
    logger_js_1.logger.info({ challengeId }, 'Challenge declined');
}
// Get all pending challenges for a user (both sent and received)
async function getChallenges(userId) {
    // Expire old challenges first
    await (0, pool_js_1.query)('UPDATE challenges SET status = $1 WHERE status = $2 AND expires_at < NOW()', ['expired', 'pending']);
    const received = await (0, pool_js_1.query)('SELECT * FROM challenges WHERE opponent_id = $1 AND status = $2 ORDER BY created_at DESC', [userId, 'pending']);
    const sent = await (0, pool_js_1.query)('SELECT * FROM challenges WHERE challenger_id = $1 AND status IN ($2, $3) ORDER BY created_at DESC LIMIT 10', [userId, 'pending', 'accepted']);
    return { received: received.rows, sent: sent.rows };
}
//# sourceMappingURL=challengeService.js.map