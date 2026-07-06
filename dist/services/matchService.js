"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnValidationError = exports.MatchNotActiveError = exports.MatchAccessError = exports.MatchNotFoundError = exports.FABLE_PLAYER_ID = void 0;
exports.createPveMatch = createPveMatch;
exports.createMatch = createMatch;
exports.getMatch = getMatch;
exports.getMatchWithPlayers = getMatchWithPlayers;
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
const achievementService_js_1 = require("./achievementService.js");
const aiBrain_js_1 = require("../ai/aiBrain.js");
exports.FABLE_PLAYER_ID = '00000000-0000-0000-0000-000000000001';
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
const fableBrain = new aiBrain_js_1.OptimalBrain();
async function createPveMatch(humanPlayerId, humanTeamId, fableTeamId) {
    const [humanResult, fableResult] = await Promise.all([
        loadTeamUnitsWithPlacement(humanTeamId),
        loadTeamUnitsWithPlacement(fableTeamId),
    ]);
    // Human always goes first in PvE — simpler UX, no auto-process needed at creation
    const initialState = buildInitialState(humanPlayerId, exports.FABLE_PLAYER_ID, humanResult.units, fableResult.units, humanResult.placement, fableResult.placement, humanPlayerId, humanResult.customizations, fableResult.customizations);
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 72);
    const result = await (0, pool_js_1.query)(`INSERT INTO matches (player_one_id, player_two_id, player_one_team, player_two_team, status, active_player_id, turn_number, turn_deadline, match_state, is_pve)
     VALUES ($1, $2, $3, $4, 'active', $5, 1, $6, $7, TRUE) RETURNING id`, [humanPlayerId, exports.FABLE_PLAYER_ID, humanTeamId, fableTeamId, humanPlayerId, deadline.toISOString(), JSON.stringify(initialState)]);
    const matchId = result.rows[0].id;
    logger_js_1.logger.info({ matchId, humanPlayerId }, 'PvE match created');
    return { matchId, state: initialState };
}
async function createMatch(playerOneId, playerTwoId, playerOneTeamId, playerTwoTeamId, turnDeadlineHours) {
    const [p1Result, p2Result] = await Promise.all([loadTeamUnitsWithPlacement(playerOneTeamId), loadTeamUnitsWithPlacement(playerTwoTeamId)]);
    const initialState = buildInitialState(playerOneId, playerTwoId, p1Result.units, p2Result.units, p1Result.placement, p2Result.placement, undefined, p1Result.customizations, p2Result.customizations);
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + turnDeadlineHours);
    const result = await (0, pool_js_1.query)('INSERT INTO matches (player_one_id, player_two_id, player_one_team, player_two_team, status, active_player_id, turn_number, turn_deadline, match_state) VALUES ($1, $2, $3, $4, ' + "'active'" + ', $5, 1, $6, $7) RETURNING id', [playerOneId, playerTwoId, playerOneTeamId, playerTwoTeamId, initialState.activePlayerId, deadline.toISOString(), JSON.stringify(initialState)]);
    const matchId = result.rows[0].id;
    logger_js_1.logger.info({ matchId, playerOneId, playerTwoId }, 'Match created');
    return { matchId, state: initialState };
}
function buildInitialState(playerOneId, playerTwoId, p1Units, p2Units, p1Placement, p2Placement, forceFirstPlayerId, p1Customizations, p2Customizations) {
    // 8×8 diamond board (corners excluded): P1 zone x=0-2, P2 zone x=5-7
    const p1Fallback = [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }];
    // Mirror P2 placement: team is saved as if they were P1 (left side), so flip x: newX = 7 - x
    const p2Fallback = [{ x: 6, y: 0 }, { x: 6, y: 2 }, { x: 6, y: 4 }, { x: 6, y: 6 }];
    const p1Positions = p1Placement.length >= p1Units.length ? p1Placement : p1Fallback;
    const p2Raw = p2Placement.length >= p2Units.length ? p2Placement : p2Fallback;
    // Mirror P2's saved positions to the right side of the board
    const p2Positions = p2Raw.map(pos => ({ x: 7 - pos.x, y: pos.y }));
    const units = [
        ...p1Units.map((def, i) => buildUnitInstance(def, playerOneId, p1Positions[i], p1Customizations?.[i])),
        ...p2Units.map((def, i) => buildUnitInstance(def, playerTwoId, p2Positions[i], p2Customizations?.[i])),
    ];
    const round1FirstPlayerId = forceFirstPlayerId ?? (Math.random() < 0.5 ? playerOneId : playerTwoId);
    const initiative = { order: [], slot: 0, round1FirstPlayerId, activeUnitId: null, isRound1: true };
    return { board: { width: matchState_js_1.BOARD_WIDTH, height: matchState_js_1.BOARD_HEIGHT }, units, turnNumber: 1, roundNumber: 1, activePlayerId: round1FirstPlayerId, phase: 'action', initiative };
}
function buildUnitInstance(def, ownerId, position, customization) {
    // Apply chosen special: replace the default special slot with the player's pick.
    const basicSlug = def.abilities.find((s) => !def.specialOptions.includes(s)) ?? def.abilities[0];
    const specialSlug = customization?.specialSlug ?? def.specialOptions[0] ?? def.abilities[1];
    const abilities = basicSlug && specialSlug ? [basicSlug, specialSlug] : def.abilities;
    // Apply chosen passive: either a stat boost, or a behavioral flag appended
    // to the instance's `passives` array (e.g. 'immovable' — read generically
    // by abilityExecutor.ts's hasPassive() checks, unrelated to this switch).
    const passive = customization?.passiveSlug
        ? def.passiveOptions.find((p) => p.slug === customization.passiveSlug)
        : undefined;
    const maxHealth = def.maxHealth + (passive?.stat === 'maxHealth' ? (passive.value ?? 0) : 0);
    const armorClass = (def.armorClass ?? 10) + (passive?.stat === 'armorClass' ? (passive.value ?? 0) : 0);
    const movementRange = def.movementRange + (passive?.stat === 'movementRange' ? (passive.value ?? 0) : 0);
    const passives = passive?.passiveFlag ? [...def.passives, passive.passiveFlag] : def.passives;
    const cooldowns = {};
    for (const slug of abilities)
        cooldowns[slug] = 0;
    return {
        instanceId: (0, uuid_1.v4)(), definitionSlug: def.slug, ownerPlayerId: ownerId,
        position, currentHealth: maxHealth, maxHealth,
        armorClass, movementRange,
        abilities, passives,
        isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
        cooldowns, statusEffects: [], fortuneMeter: 0,
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
async function getMatchWithPlayers(matchId, requestingUserId) {
    const result = await (0, pool_js_1.query)(`SELECT m.*, u1.username AS p1_username, u2.username AS p2_username
     FROM matches m
     JOIN users u1 ON u1.id = m.player_one_id
     JOIN users u2 ON u2.id = m.player_two_id
     WHERE m.id = $1`, [matchId]);
    const row = result.rows[0];
    if (!row)
        throw new MatchNotFoundError();
    if (row.player_one_id !== requestingUserId && row.player_two_id !== requestingUserId)
        throw new MatchAccessError();
    return { match: row, playerOneUsername: row.p1_username, playerTwoUsername: row.p2_username };
}
async function getUserMatches(userId) {
    const result = await (0, pool_js_1.query)(`SELECT m.*, u1.username AS player_one_username, u2.username AS player_two_username
     FROM matches m
     JOIN users u1 ON u1.id = m.player_one_id
     JOIN users u2 ON u2.id = m.player_two_id
     WHERE m.player_one_id = $1 OR m.player_two_id = $1
     ORDER BY m.created_at DESC LIMIT 20`, [userId]);
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
        const humanResult = (0, turnProcessor_js_1.processTurn)(match.match_state, actions, submittingPlayerId, match.player_one_id, match.player_two_id, abilityMap);
        await client.query('INSERT INTO turn_history (match_id, player_id, turn_number, actions, state_snapshot) VALUES ($1, $2, $3, $4, $5)', [matchId, submittingPlayerId, match.turn_number, JSON.stringify(actions), JSON.stringify(humanResult.updatedState)]);
        // For PvE: auto-process Fable's turns within the same transaction
        let result = humanResult;
        let allEvents = [...humanResult.events];
        if (!humanResult.matchOver && match.is_pve && humanResult.updatedState.activePlayerId === exports.FABLE_PLAYER_ID) {
            const fablePlayerId = match.player_one_id === submittingPlayerId ? match.player_two_id : match.player_one_id;
            const fableResult = await runFableTurns(matchId, humanResult.updatedState, submittingPlayerId, fablePlayerId, abilityMap, client);
            allEvents = [...allEvents, ...fableResult.events];
            result = { ...result, updatedState: fableResult.state, matchOver: fableResult.matchOver, winnerId: fableResult.winnerId, events: allEvents };
        }
        if (result.matchOver) {
            await finalizeMatch(client, match, result.winnerId);
        }
        else {
            const newDeadline = new Date();
            newDeadline.setHours(newDeadline.getHours() + 72);
            await client.query('UPDATE matches SET match_state = $1, active_player_id = $2, turn_number = $3, turn_deadline = $4, last_turn_events = $5 WHERE id = $6', [JSON.stringify(result.updatedState), result.updatedState.activePlayerId, result.updatedState.turnNumber, newDeadline.toISOString(), JSON.stringify(allEvents), matchId]);
            // Notify the next player (skip notification for Fable in PvE)
            if (!match.is_pve) {
                setImmediate(() => {
                    void (0, notificationService_js_1.notifyUser)(result.updatedState.activePlayerId, 'YOUR_TURN', { matchId });
                });
            }
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
    if (winnerId && !match.is_pve) {
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
    logger_js_1.logger.info({ matchId: match.id, winnerId, isPve: match.is_pve }, 'Match completed');
    // Write analytics row — use a savepoint so a failure here doesn't abort the outer transaction
    try {
        await client.query('SAVEPOINT analytics');
        const compResult = await client.query(`SELECT t.id AS team_id, array_agg(u.slug ORDER BY u.slug) AS slugs
       FROM (VALUES ($1::uuid), ($2::uuid)) AS v(team_id)
       JOIN teams t ON t.id = v.team_id
       JOIN unit_definitions u ON u.id = ANY(t.unit_ids)
       GROUP BY t.id`, [match.player_one_team, match.player_two_team]);
        const compMap = new Map(compResult.rows.map((r) => [r.team_id, r.slugs]));
        const p1Comp = compMap.get(match.player_one_team) ?? [];
        const p2Comp = compMap.get(match.player_two_team) ?? [];
        const winnerComp = winnerId === match.player_one_id ? p1Comp : winnerId === match.player_two_id ? p2Comp : null;
        const loserComp = winnerId === match.player_one_id ? p2Comp : winnerId === match.player_two_id ? p1Comp : null;
        const durationSeconds = match.created_at
            ? Math.round((Date.now() - new Date(match.created_at).getTime()) / 1000)
            : null;
        await client.query(`INSERT INTO match_analytics
         (match_id, winner_id, loser_id, p1_id, p2_id, p1_comp, p2_comp, winner_comp, loser_comp, turn_count, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [match.id, winnerId, loserId, match.player_one_id, match.player_two_id,
            p1Comp, p2Comp, winnerComp, loserComp, match.turn_number, durationSeconds]);
        await client.query('RELEASE SAVEPOINT analytics');
    }
    catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT analytics').catch(() => { });
        logger_js_1.logger.warn({ matchId: match.id, err }, 'Failed to write match analytics');
    }
    // Evaluate achievements for human players only (not Fable)
    setImmediate(() => {
        if (match.player_one_id !== exports.FABLE_PLAYER_ID)
            void (0, achievementService_js_1.evaluateAchievements)(match.player_one_id);
        if (match.player_two_id !== exports.FABLE_PLAYER_ID)
            void (0, achievementService_js_1.evaluateAchievements)(match.player_two_id);
    });
}
async function getTurnHistory(matchId, requestingUserId) {
    await getMatch(matchId, requestingUserId);
    const result = await (0, pool_js_1.query)('SELECT player_id, turn_number, actions, submitted_at FROM turn_history WHERE match_id = $1 ORDER BY turn_number ASC', [matchId]);
    return result.rows;
}
async function loadTeamUnitsWithPlacement(teamId) {
    const teamResult = await (0, pool_js_1.query)('SELECT unit_ids, placement, unit_customizations FROM teams WHERE id = $1', [teamId]);
    const team = teamResult.rows[0];
    if (!team)
        throw new Error('Team not found: ' + teamId);
    const unitResult = await (0, pool_js_1.query)('SELECT id, slug, name, max_health, armor_class, movement_range, abilities, passives, special_options, passive_options, unlock_level, asset_key, is_active FROM unit_definitions WHERE id = ANY($1)', [team.unit_ids]);
    const unitMap = new Map(unitResult.rows.map((r) => [r.id, r]));
    const units = team.unit_ids.map((id) => {
        const row = unitMap.get(id);
        return { id: row.id, slug: row.slug, name: row.name, maxHealth: row.max_health, armorClass: row.armor_class, movementRange: row.movement_range, abilities: row.abilities, passives: row.passives, specialOptions: row.special_options ?? [], passiveOptions: row.passive_options ?? [], unlockLevel: row.unlock_level, assetKey: row.asset_key, isActive: row.is_active };
    });
    return { units, placement: team.placement ?? [], customizations: team.unit_customizations ?? [] };
}
async function loadAbilityMapDirect() {
    const result = await (0, pool_js_1.query)('SELECT id, slug, name, description, targeting_type, range, area_radius, cooldown_turns, is_special, is_unblockable, exclude_allies, effects FROM ability_definitions');
    const map = new Map();
    for (const row of result.rows) {
        map.set(row.slug, { id: row.id, slug: row.slug, name: row.name, description: row.description, targetingType: row.targeting_type, range: row.range, areaRadius: row.area_radius, cooldownTurns: row.cooldown_turns, isSpecial: row.is_special, isUnblockable: row.is_unblockable, excludeAllies: row.exclude_allies, effects: row.effects });
    }
    return map;
}
async function runFableTurns(matchId, state, humanPlayerId, fablePlayerId, abilityMap, client) {
    const allEvents = [];
    let currentState = state;
    let iterations = 0;
    while (currentState.activePlayerId === fablePlayerId && iterations < 20) {
        iterations++;
        const fableActions = fableBrain.selectActions(currentState, fablePlayerId, abilityMap);
        const turnResult = (0, turnProcessor_js_1.processTurn)(currentState, fableActions, fablePlayerId, humanPlayerId, fablePlayerId, abilityMap);
        if (client) {
            await client.query('INSERT INTO turn_history (match_id, player_id, turn_number, actions, state_snapshot) VALUES ($1, $2, $3, $4, $5)', [matchId, fablePlayerId, currentState.turnNumber, JSON.stringify(fableActions), JSON.stringify(turnResult.updatedState)]);
        }
        allEvents.push(...turnResult.events);
        currentState = turnResult.updatedState;
        if (turnResult.matchOver) {
            return { state: currentState, events: allEvents, matchOver: true, winnerId: turnResult.winnerId };
        }
    }
    return { state: currentState, events: allEvents, matchOver: false, winnerId: null };
}
async function loadAbilityMap(client) {
    const result = await client.query('SELECT id, slug, name, description, targeting_type, range, area_radius, cooldown_turns, is_special, is_unblockable, exclude_allies, effects FROM ability_definitions');
    const map = new Map();
    for (const row of result.rows) {
        map.set(row.slug, { id: row.id, slug: row.slug, name: row.name, description: row.description, targetingType: row.targeting_type, range: row.range, areaRadius: row.area_radius, cooldownTurns: row.cooldown_turns, isSpecial: row.is_special, isUnblockable: row.is_unblockable, excludeAllies: row.exclude_allies, effects: row.effects });
    }
    return map;
}
async function getUserXp(client, userId) {
    const result = await client.query('SELECT account_xp FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.account_xp ?? 0;
}
//# sourceMappingURL=matchService.js.map