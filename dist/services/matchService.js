"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnValidationError = exports.SeqMismatchError = exports.NotYourTurnError = exports.MatchNotActiveError = exports.MatchAccessError = exports.MatchNotFoundError = exports.FABLE_PLAYER_ID = void 0;
exports.createPveMatch = createPveMatch;
exports.createMatch = createMatch;
exports.getMatch = getMatch;
exports.getMatchWithPlayers = getMatchWithPlayers;
exports.getUserMatches = getUserMatches;
exports.submitTurn = submitTurn;
exports.submitRodAction = submitRodAction;
exports.submitRodEndTurn = submitRodEndTurn;
exports.forfeitMatch = forfeitMatch;
exports.getTurnHistory = getTurnHistory;
const pool_js_1 = require("../db/pool.js");
// area_shape / self_status have no DB columns — overlay them from gameData or
// rings resolve as full squares and orthogonal AoEs hit diagonals. See abilityShape.ts.
const abilityShape_js_1 = require("../config/abilityShape.js");
const turnProcessor_js_1 = require("../game/turnProcessor.js");
Object.defineProperty(exports, "TurnValidationError", { enumerable: true, get: function () { return turnProcessor_js_1.TurnValidationError; } });
const initialState_js_1 = require("../game/initialState.js");
Object.defineProperty(exports, "FABLE_PLAYER_ID", { enumerable: true, get: function () { return initialState_js_1.FABLE_PLAYER_ID; } });
const fableTeams_js_1 = require("../config/fableTeams.js");
const eloService_js_1 = require("./eloService.js");
const logger_js_1 = require("../utils/logger.js");
const notificationService_js_1 = require("./notificationService.js");
const achievementService_js_1 = require("./achievementService.js");
const aiBrain_js_1 = require("../ai/aiBrain.js");
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
class NotYourTurnError extends Error {
    constructor() { super('It is not your turn'); this.name = 'NotYourTurnError'; }
}
exports.NotYourTurnError = NotYourTurnError;
class SeqMismatchError extends Error {
    constructor(expected, got) { super(`Expected seq ${expected}, got ${got}`); this.name = 'SeqMismatchError'; }
}
exports.SeqMismatchError = SeqMismatchError;
const fableBrain = new aiBrain_js_1.OptimalBrain();
async function createPveMatch(humanPlayerId, humanTeamId, fableTeamId, difficulty = 'hard') {
    // `fableTeamId` is either one of the player's own teams (the original
    // behaviour) or one of Fable's rosters — a concrete roster id, or the
    // 'fable-random' sentinel meaning "roll one". Resolving here rather than in
    // the route means every caller gets the same treatment, and the id stored in
    // `player_two_team` is always a real team row.
    const resolvedFableTeamId = (0, fableTeams_js_1.isFableTeamId)(fableTeamId)
        ? (0, fableTeams_js_1.resolveFableTeam)(fableTeamId).id
        : fableTeamId;
    const [humanResult, fableResult] = await Promise.all([
        loadTeamUnitsWithPlacement(humanTeamId),
        loadTeamUnitsWithPlacement(resolvedFableTeamId),
    ]);
    // Human always goes first in PvE — simpler UX, no auto-process needed at creation
    const initialState = (0, initialState_js_1.buildInitialState)(humanPlayerId, initialState_js_1.FABLE_PLAYER_ID, humanResult.units, fableResult.units, humanResult.placement, fableResult.placement, humanPlayerId, humanResult.customizations, fableResult.customizations, initialState_js_1.FABLE_HP_SCALE[difficulty]);
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 72);
    const result = await (0, pool_js_1.query)(`INSERT INTO matches (player_one_id, player_two_id, player_one_team, player_two_team, status, active_player_id, turn_number, turn_deadline, match_state, is_pve)
     VALUES ($1, $2, $3, $4, 'active', $5, 1, $6, $7, TRUE) RETURNING id`, [humanPlayerId, initialState_js_1.FABLE_PLAYER_ID, humanTeamId, resolvedFableTeamId, humanPlayerId, deadline.toISOString(), JSON.stringify(initialState)]);
    const matchId = result.rows[0].id;
    logger_js_1.logger.info({ matchId, humanPlayerId }, 'PvE match created');
    return { matchId, state: initialState };
}
// isRanked: only matchmaking (random ladder) matches are ranked and affect ELO.
// Challenge/invite matches are between chosen opponents and are trivially gameable,
// so they default to unranked. Fail-closed: callers must opt in to ranked.
async function createMatch(playerOneId, playerTwoId, playerOneTeamId, playerTwoTeamId, turnDeadlineHours, isRanked = false) {
    const [p1Result, p2Result] = await Promise.all([loadTeamUnitsWithPlacement(playerOneTeamId), loadTeamUnitsWithPlacement(playerTwoTeamId)]);
    const initialState = (0, initialState_js_1.buildInitialState)(playerOneId, playerTwoId, p1Result.units, p2Result.units, p1Result.placement, p2Result.placement, undefined, p1Result.customizations, p2Result.customizations);
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + turnDeadlineHours);
    const result = await (0, pool_js_1.query)('INSERT INTO matches (player_one_id, player_two_id, player_one_team, player_two_team, status, active_player_id, turn_number, turn_deadline, match_state, is_ranked) VALUES ($1, $2, $3, $4, ' + "'active'" + ', $5, 1, $6, $7, $8) RETURNING id', [playerOneId, playerTwoId, playerOneTeamId, playerTwoTeamId, initialState.activePlayerId, deadline.toISOString(), JSON.stringify(initialState), isRanked]);
    const matchId = result.rows[0].id;
    logger_js_1.logger.info({ matchId, playerOneId, playerTwoId, isRanked }, 'Match created');
    return { matchId, state: initialState };
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
        if (!humanResult.matchOver && match.is_pve && humanResult.updatedState.activePlayerId === initialState_js_1.FABLE_PLAYER_ID) {
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
async function submitRodAction(matchId, submittingPlayerId, action, seq) {
    return (0, pool_js_1.withTransaction)(async (client) => {
        const matchResult = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [matchId]);
        const match = matchResult.rows[0];
        if (!match)
            throw new MatchNotFoundError();
        if (match.player_one_id !== submittingPlayerId && match.player_two_id !== submittingPlayerId)
            throw new MatchAccessError();
        if (match.status !== 'active')
            throw new MatchNotActiveError();
        const state = match.match_state;
        // IDOR: only the active player may submit actions
        if (state.activePlayerId !== submittingPlayerId)
            throw new NotYourTurnError();
        const tc = state.turnContext;
        const expectedSeq = (tc?.seq ?? -1) + 1;
        // Idempotent replay: client re-sent an already-applied action
        if (tc && seq === tc.seq) {
            return { events: [], updatedState: state, matchOver: false, winnerId: null };
        }
        if (seq !== expectedSeq)
            throw new SeqMismatchError(expectedSeq, seq);
        const abilityMap = await loadAbilityMap(client);
        const p1 = match.player_one_id;
        const p2 = match.player_two_id;
        const allEvents = [];
        let currentState = state;
        // First action of the turn: open the turn via beginTurn
        if (!tc) {
            const begun = (0, turnProcessor_js_1.beginTurn)(currentState, action, submittingPlayerId, p1, p2);
            allEvents.push(...begun.events);
            if (begun.matchOver) {
                await finalizeMatch(client, match, begun.winnerId);
                return { events: allEvents, updatedState: begun.updatedState, matchOver: true, winnerId: begun.winnerId };
            }
            currentState = begun.updatedState;
        }
        const applied = (0, turnProcessor_js_1.applyAction)(currentState, action, submittingPlayerId, p1, p2, abilityMap);
        allEvents.push(...applied.events);
        // Stamp the seq onto the persisted turnContext
        applied.updatedState.turnContext.seq = seq;
        // Accumulate this call's events (beginTurn's included) onto the turnContext.
        // last_turn_events is only written at end-turn — without carrying these
        // between calls, the opponent's poll would get a turn with no action events
        // and their combat log/replay would silently drop everything the turn did.
        applied.updatedState.turnContext.events = [...(state.turnContext?.events ?? []), ...allEvents];
        if (applied.matchOver) {
            await finalizeMatch(client, match, applied.winnerId);
            return { events: allEvents, updatedState: applied.updatedState, matchOver: true, winnerId: applied.winnerId };
        }
        await client.query('UPDATE matches SET match_state = $1 WHERE id = $2', [JSON.stringify(applied.updatedState), matchId]);
        return { events: allEvents, updatedState: applied.updatedState, matchOver: false, winnerId: null };
    });
}
async function submitRodEndTurn(matchId, submittingPlayerId) {
    return (0, pool_js_1.withTransaction)(async (client) => {
        const matchResult = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [matchId]);
        const match = matchResult.rows[0];
        if (!match)
            throw new MatchNotFoundError();
        if (match.player_one_id !== submittingPlayerId && match.player_two_id !== submittingPlayerId)
            throw new MatchAccessError();
        if (match.status !== 'active')
            throw new MatchNotActiveError();
        const state = match.match_state;
        if (state.activePlayerId !== submittingPlayerId)
            throw new NotYourTurnError();
        if (!state.turnContext)
            throw new turnProcessor_js_1.TurnValidationError('No turn in progress — submit at least one action first');
        const p1 = match.player_one_id;
        const p2 = match.player_two_id;
        const allEvents = [];
        // The per-action events accumulated across this turn's /action calls
        // (endTurn deletes the turnContext, so read them before finalizing).
        // They belong in last_turn_events but NOT in this response's `events` —
        // the acting client already displayed them per-action and splices its own
        // copy in front of this response; returning them again would double them.
        const actionEvents = state.turnContext.events ?? [];
        const finalized = (0, turnProcessor_js_1.endTurn)(state, submittingPlayerId, p1, p2);
        allEvents.push(...finalized.events);
        const fetchMatch = () => client.query('SELECT * FROM matches WHERE id = $1', [matchId]).then(r => r.rows[0]);
        if (finalized.matchOver) {
            await finalizeMatch(client, match, finalized.winnerId);
            return { events: allEvents, updatedState: finalized.updatedState, matchOver: true, winnerId: finalized.winnerId, match: await fetchMatch() };
        }
        // Record turn history (actions not tracked per-ROD-call; log empty list)
        await client.query('INSERT INTO turn_history (match_id, player_id, turn_number, actions, state_snapshot) VALUES ($1, $2, $3, $4, $5)', [matchId, submittingPlayerId, match.turn_number, JSON.stringify([]), JSON.stringify(finalized.updatedState)]);
        let result = finalized;
        let postFableEvents = [];
        // PvE: auto-process Fable turns
        if (match.is_pve && finalized.updatedState.activePlayerId === initialState_js_1.FABLE_PLAYER_ID) {
            const fablePlayerId = p1 === submittingPlayerId ? p2 : p1;
            const abilityMap = await loadAbilityMap(client);
            const fableResult = await runFableTurns(matchId, finalized.updatedState, submittingPlayerId, fablePlayerId, abilityMap, client);
            postFableEvents = fableResult.events;
            result = { ...result, updatedState: fableResult.state, matchOver: fableResult.matchOver, winnerId: fableResult.winnerId };
            if (fableResult.matchOver) {
                await finalizeMatch(client, match, fableResult.winnerId);
                return { events: [...allEvents, ...postFableEvents], updatedState: result.updatedState, matchOver: true, winnerId: result.winnerId, match: await fetchMatch() };
            }
        }
        const newDeadline = new Date();
        newDeadline.setHours(newDeadline.getHours() + 72);
        await client.query('UPDATE matches SET match_state = $1, active_player_id = $2, turn_number = $3, turn_deadline = $4, last_turn_events = $5 WHERE id = $6', [JSON.stringify(result.updatedState), result.updatedState.activePlayerId, result.updatedState.turnNumber, newDeadline.toISOString(), JSON.stringify([...actionEvents, ...allEvents, ...postFableEvents]), matchId]);
        if (!match.is_pve) {
            setImmediate(() => { void (0, notificationService_js_1.notifyUser)(result.updatedState.activePlayerId, 'YOUR_TURN', { matchId }); });
        }
        return { events: [...allEvents, ...postFableEvents], updatedState: result.updatedState, matchOver: false, winnerId: null, match: await fetchMatch() };
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
    // ELO moves only on ranked (matchmaking) matches. PvE and friendly
    // challenge/invite matches never touch the ladder.
    if (winnerId && !match.is_pve && match.is_ranked) {
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
        const compResult = await client.query(
        // teams.unit_ids is JSONB, not uuid[] — `= ANY(t.unit_ids)` is invalid
        // against it and Postgres rejects the whole statement with 42809
        // ("op ANY/ALL (array) requires array on right side"). The savepoint
        // below meant this only ever logged a warning, so every match since this
        // was written has silently written no analytics row. Unnest the JSON
        // array properly instead.
        `SELECT t.id AS team_id, array_agg(u.slug ORDER BY u.slug) AS slugs
       FROM (VALUES ($1::uuid), ($2::uuid)) AS v(team_id)
       JOIN teams t ON t.id = v.team_id
       JOIN LATERAL jsonb_array_elements_text(t.unit_ids) AS uid(id) ON TRUE
       JOIN unit_definitions u ON u.id = uid.id::uuid
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
    // Evaluate achievements for human players only (not Fable).
    //
    // ⚠ The .catch() is load-bearing, not defensive padding. `void promise` with
    // no rejection handler is an UNHANDLED REJECTION, which Node 20 treats as
    // fatal — it exits the process. A cosmetic bug in the achievement path
    // (leaderboard formatting a Date as a string) therefore killed the whole
    // server every time a match completed, and users saw HTTP 502 until Railway
    // restarted it. Nothing about awarding a badge should be able to do that.
    const evaluateSafely = (userId) => {
        (0, achievementService_js_1.evaluateAchievements)(userId).catch((err) => {
            logger_js_1.logger.error({ err, userId }, 'Achievement evaluation failed (non-fatal)');
        });
    };
    setImmediate(() => {
        if (match.player_one_id !== initialState_js_1.FABLE_PLAYER_ID)
            evaluateSafely(match.player_one_id);
        if (match.player_two_id !== initialState_js_1.FABLE_PLAYER_ID)
            evaluateSafely(match.player_two_id);
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
    const result = await (0, pool_js_1.query)('SELECT id, slug, name, description, targeting_type, range, area_radius, cooldown_turns, is_special, is_unblockable, exclude_allies, is_multi_hit, effects FROM ability_definitions');
    const map = new Map();
    for (const row of result.rows) {
        map.set(row.slug, { id: row.id, slug: row.slug, name: row.name, description: row.description, targetingType: row.targeting_type, range: row.range, areaRadius: row.area_radius, cooldownTurns: row.cooldown_turns, isSpecial: row.is_special, isUnblockable: row.is_unblockable, excludeAllies: row.exclude_allies, isMultiHit: row.is_multi_hit, effects: row.effects, ...(0, abilityShape_js_1.abilityShape)(row.slug) });
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
    const result = await client.query('SELECT id, slug, name, description, targeting_type, range, area_radius, cooldown_turns, is_special, is_unblockable, exclude_allies, is_multi_hit, effects FROM ability_definitions');
    const map = new Map();
    for (const row of result.rows) {
        map.set(row.slug, { id: row.id, slug: row.slug, name: row.name, description: row.description, targetingType: row.targeting_type, range: row.range, areaRadius: row.area_radius, cooldownTurns: row.cooldown_turns, isSpecial: row.is_special, isUnblockable: row.is_unblockable, excludeAllies: row.exclude_allies, isMultiHit: row.is_multi_hit, effects: row.effects, ...(0, abilityShape_js_1.abilityShape)(row.slug) });
    }
    return map;
}
async function getUserXp(client, userId) {
    const result = await client.query('SELECT account_xp FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.account_xp ?? 0;
}
//# sourceMappingURL=matchService.js.map