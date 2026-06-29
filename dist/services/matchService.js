"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnValidationError = exports.MatchNotActiveError = exports.MatchAccessError = exports.MatchNotFoundError = void 0;
exports.createMatch = createMatch;
exports.getMatch = getMatch;
exports.getUserMatches = getUserMatches;
exports.submitTurn = submitTurn;
exports.forfeitMatch = forfeitMatch;
exports.getTurnHistory = getTurnHistory;
const uuid_1 = require("uuid");
const pool_js_1 = require("../db/pool.js");
const matchState_js_1 = require("../types/matchState.js");
const turnProcessor_js_1 = require("../game/turnProcessor.js");
Object.defineProperty(exports, "TurnValidationError", { enumerable: true, get: function () { return turnProcessor_js_1.TurnValidationError; } });
const eloService_js_1 = require("./eloService.js");
const logger_js_1 = require("../utils/logger.js");
const notificationService_js_1 = require("./notificationService.js");
class MatchNotFoundError extends Error {
    constructor() { super('Match not found'); this.name = 'MatchNotFoundError'; }
}
exports.MatchNotFoundError = MatchNotFoundError;
class MatchAccessError extends Error {
    constructor() { super('You are not a participant in this match'); this.name = 'MatchAccessError'; }
}
exports.MatchAccessError = MatchAccessError;
class MatchNotActiveError extends Error {
    constructor() { super('This match is no longer active'); this.name = 'MatchNotActiveError'; }
}
exports.MatchNotActiveError = MatchNotActiveError;
async function createMatch(playerOneId, playerTwoId, playerOneTeamId, playerTwoTeamId, turnDeadlineHours) {
    const [p1Units, p2Units] = await Promise.all([loadTeamUnits(playerOneTeamId), loadTeamUnits(playerTwoTeamId)]);
    const initialState = buildInitialState(playerOneId, playerTwoId, p1Units, p2Units);
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + turnDeadlineHours);
    const result = await (0, pool_js_1.query)('INSERT INTO matches (player_one_id, player_two_id, player_one_team, player_two_team, status, active_player_id, turn_number, turn_deadline, match_state) VALUES ($1, $2, $3, $4, ' + "'active'" + ', $1, 1, $5, $6) RETURNING id', [playerOneId, playerTwoId, playerOneTeamId, playerTwoTeamId, deadline.toISOString(), JSON.stringify(initialState)]);
    const matchId = result.rows[0].id;
    logger_js_1.logger.info({ matchId, playerOneId, playerTwoId }, 'Match created');
    return { matchId, state: initialState };
}
function buildInitialState(playerOneId, playerTwoId, p1Units, p2Units) {
    const p1StartPositions = [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }];
    const p2StartPositions = [{ x: 6, y: 0 }, { x: 6, y: 2 }, { x: 6, y: 4 }, { x: 6, y: 6 }];
    const units = [
        ...p1Units.map((def, i) => buildUnitInstance(def, playerOneId, p1StartPositions[i])),
        ...p2Units.map((def, i) => buildUnitInstance(def, playerTwoId, p2StartPositions[i])),
    ];
    return { board: { width: matchState_js_1.BOARD_WIDTH, height: matchState_js_1.BOARD_HEIGHT }, units, turnNumber: 1, activePlayerId: playerOneId, phase: 'action' };
}
function buildUnitInstance(def, ownerId, position) {
    const cooldowns = {};
    for (const slug of def.abilities)
        cooldowns[slug] = 0;
    return {
        instanceId: (0, uuid_1.v4)(), definitionSlug: def.slug, ownerPlayerId: ownerId,
        position, currentHealth: def.maxHealth, maxHealth: def.maxHealth,
        isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
        cooldowns, statusEffects: [],
        ...{ movementRange: def.movementRange },
        ...{ abilities: def.abilities },
        ...{ passives: def.passives },
    };
}
async function getMatch(matchId, requestingUserId) {
    const result = await (0, pool_js_1.query)('SELECT * FROM matches WHERE id = $1', [matchId]);
    const match = result.rows[0];
    if (!match)
        throw new MatchNotFoundError();
    if (match.player_one_id !== requestingUserId && match.player_two_id !== requestingUserId)
        throw new MatchAccessError();
    return match;
}
async function getUserMatches(userId) {
    const result = await (0, pool_js_1.query)('SELECT * FROM matches WHERE (player_one_id = $1 OR player_two_id = $1) ORDER BY created_at DESC LIMIT 20', [userId]);
    return result.rows;
}
async function submitTurn(matchId, submittingPlayerId, actions) {
    return (0, pool_js_1.withTransaction)(async (client) => {
        const matchResult = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [matchId]);
        const match = matchResult.rows[0];
        if (!match)
            throw new MatchNotFoundError();
        if (match.player_one_id !== submittingPlayerId && match.player_two_id !== submittingPlayerId)
            throw new MatchAccessError();
        if (match.status !== 'active')
            throw new MatchNotActiveError();
        const abilityMap = await loadAbilityMap(client);
        const result = (0, turnProcessor_js_1.processTurn)(match.match_state, actions, submittingPlayerId, match.player_one_id, match.player_two_id, abilityMap);
        await client.query('INSERT INTO turn_history (match_id, player_id, turn_number, actions, state_snapshot) VALUES ($1, $2, $3, $4, $5)', [matchId, submittingPlayerId, match.turn_number, JSON.stringify(actions), JSON.stringify(result.updatedState)]);
        if (result.matchOver) {
            await finalizeMatch(client, match, result.winnerId);
        }
        else {
            const newDeadline = new Date();
            newDeadline.setHours(newDeadline.getHours() + 72);
            await client.query('UPDATE matches SET match_state = $1, active_player_id = $2, turn_number = $3, turn_deadline = $4 WHERE id = $5', [JSON.stringify(result.updatedState), result.updatedState.activePlayerId, result.updatedState.turnNumber, newDeadline.toISOString(), matchId]);
            // Notify the opponent it's their turn
            setImmediate(() => {
                void (0, notificationService_js_1.notifyUser)(result.updatedState.activePlayerId, 'YOUR_TURN', { matchId });
            });
        }
        const updatedResult = await client.query('SELECT * FROM matches WHERE id = $1', [matchId]);
        return { result, match: updatedResult.rows[0] };
    });
}
async function forfeitMatch(matchId, forfeitingPlayerId) {
    return (0, pool_js_1.withTransaction)(async (client) => {
        const matchResult = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [matchId]);
        const match = matchResult.rows[0];
        if (!match)
            throw new MatchNotFoundError();
        if (match.player_one_id !== forfeitingPlayerId && match.player_two_id !== forfeitingPlayerId)
            throw new MatchAccessError();
        if (match.status !== 'active')
            throw new MatchNotActiveError();
        const winnerId = match.player_one_id === forfeitingPlayerId ? match.player_two_id : match.player_one_id;
        await finalizeMatch(client, match, winnerId);
    });
}
async function finalizeMatch(client, match, winnerId) {
    const loserId = winnerId === match.player_one_id ? match.player_two_id : match.player_one_id;
    let eloDeltaP1 = 0;
    let eloDeltaP2 = 0;
    if (winnerId) {
        const eloResult = await client.query('SELECT id, elo FROM users WHERE id = ANY($1)', [[match.player_one_id, match.player_two_id]]);
        const eloMap = new Map(eloResult.rows.map((r) => [r.id, r.elo]));
        const p1Elo = eloMap.get(match.player_one_id) ?? 1200;
        const p2Elo = eloMap.get(match.player_two_id) ?? 1200;
        const winnerElo = winnerId === match.player_one_id ? p1Elo : p2Elo;
        const loserElo = winnerId === match.player_one_id ? p2Elo : p1Elo;
        const eloCalc = (0, eloService_js_1.calculateElo)(winnerElo, loserElo);
        eloDeltaP1 = winnerId === match.player_one_id ? eloCalc.winnerDelta : eloCalc.loserDelta;
        eloDeltaP2 = winnerId === match.player_two_id ? eloCalc.winnerDelta : eloCalc.loserDelta;
        await client.query('UPDATE users SET elo = elo + $1 WHERE id = $2', [eloDeltaP1, match.player_one_id]);
        await client.query('UPDATE users SET elo = elo + $1 WHERE id = $2', [eloDeltaP2, match.player_two_id]);
        const winnerXp = (0, eloService_js_1.calculateXpGain)(true);
        const loserXp = (0, eloService_js_1.calculateXpGain)(false);
        const winnerCurrentXp = await getUserXp(client, winnerId);
        const loserCurrentXp = await getUserXp(client, loserId);
        await client.query('UPDATE users SET account_xp = account_xp + $1, account_level = $2 WHERE id = $3', [winnerXp, (0, eloService_js_1.calculateLevel)(winnerCurrentXp + winnerXp), winnerId]);
        await client.query('UPDATE users SET account_xp = account_xp + $1, account_level = $2 WHERE id = $3', [loserXp, (0, eloService_js_1.calculateLevel)(loserCurrentXp + loserXp), loserId]);
    }
    await client.query('UPDATE matches SET status = ' + "'completed'" + ', winner_id = $1, elo_delta_p1 = $2, elo_delta_p2 = $3, completed_at = NOW() WHERE id = $4', [winnerId, eloDeltaP1, eloDeltaP2, match.id]);
    logger_js_1.logger.info({ matchId: match.id, winnerId }, 'Match completed');
}
async function getTurnHistory(matchId, requestingUserId) {
    await getMatch(matchId, requestingUserId);
    const result = await (0, pool_js_1.query)('SELECT player_id, turn_number, actions, submitted_at FROM turn_history WHERE match_id = $1 ORDER BY turn_number ASC', [matchId]);
    return result.rows;
}
async function loadTeamUnits(teamId) {
    const teamResult = await (0, pool_js_1.query)('SELECT unit_ids FROM teams WHERE id = $1', [teamId]);
    const team = teamResult.rows[0];
    if (!team)
        throw new Error('Team not found: ' + teamId);
    const unitResult = await (0, pool_js_1.query)('SELECT id, slug, name, max_health, movement_range, abilities, passives, unlock_level, asset_key, is_active FROM unit_definitions WHERE id = ANY($1)', [team.unit_ids]);
    const unitMap = new Map(unitResult.rows.map((r) => [r.id, r]));
    return team.unit_ids.map((id) => {
        const row = unitMap.get(id);
        return { id: row.id, slug: row.slug, name: row.name, maxHealth: row.max_health, movementRange: row.movement_range, abilities: row.abilities, passives: row.passives, unlockLevel: row.unlock_level, assetKey: row.asset_key, isActive: row.is_active };
    });
}
async function loadAbilityMap(client) {
    const result = await client.query('SELECT id, slug, name, description, targeting_type, range, area_radius, cooldown_turns, effects FROM ability_definitions');
    const map = new Map();
    for (const row of result.rows) {
        map.set(row.slug, { id: row.id, slug: row.slug, name: row.name, description: row.description, targetingType: row.targeting_type, range: row.range, areaRadius: row.area_radius, cooldownTurns: row.cooldown_turns, effects: row.effects });
    }
    return map;
}
async function getUserXp(client, userId) {
    const result = await client.query('SELECT account_xp FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.account_xp ?? 0;
}
//# sourceMappingURL=matchService.js.map