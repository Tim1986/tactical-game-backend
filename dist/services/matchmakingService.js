"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeError = exports.TeamNotFoundError = exports.ActiveMatchExistsError = exports.NotInQueueError = exports.AlreadyInQueueError = void 0;
exports.enterQueue = enterQueue;
exports.leaveQueue = leaveQueue;
exports.getQueueStatus = getQueueStatus;
exports.sendChallenge = sendChallenge;
exports.runMatchmakingJob = runMatchmakingJob;
exports.runDeadlineEnforcer = runDeadlineEnforcer;
const pool_js_1 = require("../db/pool.js");
const matchService_js_1 = require("./matchService.js");
const notificationService_js_1 = require("./notificationService.js");
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../utils/logger.js");
class AlreadyInQueueError extends Error {
    constructor() { super('You are already in the matchmaking queue'); this.name = 'AlreadyInQueueError'; }
}
exports.AlreadyInQueueError = AlreadyInQueueError;
class NotInQueueError extends Error {
    constructor() { super('You are not in the matchmaking queue'); this.name = 'NotInQueueError'; }
}
exports.NotInQueueError = NotInQueueError;
class ActiveMatchExistsError extends Error {
    constructor() { super('You already have an active match'); this.name = 'ActiveMatchExistsError'; }
}
exports.ActiveMatchExistsError = ActiveMatchExistsError;
class TeamNotFoundError extends Error {
    constructor() { super('Team not found'); this.name = 'TeamNotFoundError'; }
}
exports.TeamNotFoundError = TeamNotFoundError;
class ChallengeError extends Error {
    constructor(message) { super(message); this.name = 'ChallengeError'; }
}
exports.ChallengeError = ChallengeError;
async function enterQueue(userId, teamId) {
    const teamResult = await (0, pool_js_1.query)('SELECT id FROM teams WHERE id = $1 AND user_id = $2 AND is_active = TRUE', [teamId, userId]);
    if (!teamResult.rows[0])
        throw new TeamNotFoundError();
    // Multiple simultaneous async games are allowed — no active-match restriction
    const userResult = await (0, pool_js_1.query)('SELECT elo FROM users WHERE id = $1', [userId]);
    const elo = userResult.rows[0]?.elo ?? 1200;
    try {
        await (0, pool_js_1.query)('INSERT INTO matchmaking_queue (user_id, team_id, elo, elo_search_range) VALUES ($1, $2, $3, $4)', [userId, teamId, elo, index_js_1.config.game.matchmakingInitialRange]);
    }
    catch (err) {
        if (err instanceof Error && 'code' in err && err.code === '23505')
            throw new AlreadyInQueueError();
        throw err;
    }
    const posResult = await (0, pool_js_1.query)('SELECT COUNT(*) as count FROM matchmaking_queue WHERE elo BETWEEN $1 AND $2', [elo - 200, elo + 200]);
    const position = parseInt(posResult.rows[0].count, 10);
    logger_js_1.logger.info({ userId, teamId, elo }, 'Player entered matchmaking queue');
    return { position };
}
async function leaveQueue(userId) {
    const result = await (0, pool_js_1.query)('DELETE FROM matchmaking_queue WHERE user_id = $1', [userId]);
    if (!result.rowCount || result.rowCount === 0)
        throw new NotInQueueError();
    logger_js_1.logger.info({ userId }, 'Player left matchmaking queue');
}
async function getQueueStatus(userId) {
    const result = await (0, pool_js_1.query)('SELECT * FROM matchmaking_queue WHERE user_id = $1', [userId]);
    const entry = result.rows[0];
    if (!entry)
        return { inQueue: false };
    const waitSeconds = Math.floor((Date.now() - new Date(entry.entered_at).getTime()) / 1000);
    return { inQueue: true, enteredAt: entry.entered_at, elo: entry.elo, searchRange: entry.elo_search_range, waitSeconds };
}
async function sendChallenge(challengerId, challengerTeamId, opponentId) {
    if (challengerId === opponentId)
        throw new ChallengeError('You cannot challenge yourself');
    const teamResult = await (0, pool_js_1.query)('SELECT id FROM teams WHERE id = $1 AND user_id = $2 AND is_active = TRUE', [challengerTeamId, challengerId]);
    if (!teamResult.rows[0])
        throw new TeamNotFoundError();
    const opponentResult = await (0, pool_js_1.query)('SELECT id, username FROM users WHERE id = $1', [opponentId]);
    if (!opponentResult.rows[0])
        throw new ChallengeError('Opponent not found');
    const challengerResult = await (0, pool_js_1.query)('SELECT username FROM users WHERE id = $1', [challengerId]);
    const { matchId } = await (0, matchService_js_1.createMatch)(challengerId, opponentId, challengerTeamId, challengerTeamId, index_js_1.config.game.turnDeadlineHours);
    await (0, notificationService_js_1.notifyUser)(opponentId, 'CHALLENGE_RECEIVED', { challengeId: matchId, challengerUsername: challengerResult.rows[0]?.username ?? 'Someone' });
    logger_js_1.logger.info({ challengerId, opponentId, matchId }, 'Direct challenge created');
}
async function runMatchmakingJob() {
    logger_js_1.logger.debug('Running matchmaking job');
    await (0, pool_js_1.withTransaction)(async (client) => {
        const queueResult = await client.query('SELECT * FROM matchmaking_queue ORDER BY entered_at ASC FOR UPDATE SKIP LOCKED');
        const entries = queueResult.rows;
        if (entries.length < 2) {
            logger_js_1.logger.debug({ queueSize: entries.length }, 'Not enough players to match');
            return;
        }
        const matched = new Set();
        let matchesCreated = 0;
        for (let i = 0; i < entries.length; i++) {
            const p1 = entries[i];
            if (matched.has(p1.user_id))
                continue;
            for (let j = i + 1; j < entries.length; j++) {
                const p2 = entries[j];
                if (matched.has(p2.user_id))
                    continue;
                const p1Min = p1.elo - p1.elo_search_range;
                const p1Max = p1.elo + p1.elo_search_range;
                const p2Min = p2.elo - p2.elo_search_range;
                const p2Max = p2.elo + p2.elo_search_range;
                if (p1Min <= p2Max && p2Min <= p1Max) {
                    try {
                        const { matchId } = await (0, matchService_js_1.createMatch)(p1.user_id, p2.user_id, p1.team_id, p2.team_id, index_js_1.config.game.turnDeadlineHours);
                        await client.query('DELETE FROM matchmaking_queue WHERE user_id = ANY($1)', [[p1.user_id, p2.user_id]]);
                        matched.add(p1.user_id);
                        matched.add(p2.user_id);
                        matchesCreated++;
                        logger_js_1.logger.info({ matchId, p1: p1.user_id, p2: p2.user_id }, 'Match created by matchmaking');
                        setImmediate(() => { void (0, notificationService_js_1.notifyMatchPlayers)(p1.user_id, p2.user_id, 'MATCH_FOUND', { matchId }); });
                        break;
                    }
                    catch (err) {
                        logger_js_1.logger.error({ err, p1: p1.user_id, p2: p2.user_id }, 'Failed to create match during matchmaking');
                    }
                }
            }
        }
        const unmatchedIds = entries.map((e) => e.user_id).filter((id) => !matched.has(id));
        if (unmatchedIds.length > 0) {
            await client.query('UPDATE matchmaking_queue SET elo_search_range = elo_search_range + $1 WHERE user_id = ANY($2)', [index_js_1.config.game.matchmakingRangeIncrement, unmatchedIds]);
        }
        if (matchesCreated > 0)
            logger_js_1.logger.info({ matchesCreated }, 'Matchmaking job complete');
    });
}
async function runDeadlineEnforcer() {
    logger_js_1.logger.debug('Running deadline enforcer');
    const expiredMatches = await (0, pool_js_1.query)('SELECT id, active_player_id, player_one_id, player_two_id FROM matches WHERE status = $1 AND turn_deadline IS NOT NULL AND turn_deadline < NOW()', ['active']);
    for (const match of expiredMatches.rows) {
        const winnerId = match.active_player_id === match.player_one_id ? match.player_two_id : match.player_one_id;
        try {
            await (0, pool_js_1.query)('UPDATE matches SET status = $1, winner_id = $2, completed_at = NOW() WHERE id = $3', ['completed', winnerId, match.id]);
            logger_js_1.logger.info({ matchId: match.id, winnerId }, 'Match forfeited due to turn deadline');
            await (0, notificationService_js_1.notifyUser)(winnerId, 'MATCH_COMPLETED', { matchId: match.id, won: 'true' });
        }
        catch (err) {
            logger_js_1.logger.error({ err, matchId: match.id }, 'Failed to enforce deadline for match');
        }
    }
}
//# sourceMappingURL=matchmakingService.js.map