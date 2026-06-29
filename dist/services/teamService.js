"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamNotFoundError = exports.TeamValidationError = void 0;
exports.getUserTeams = getUserTeams;
exports.getTeam = getTeam;
exports.createTeam = createTeam;
exports.updateTeam = updateTeam;
exports.deleteTeam = deleteTeam;
const pool_js_1 = require("../db/pool.js");
const unitService_js_1 = require("./unitService.js");
const MAX_TEAMS_PER_USER = 10;
const TEAM_SIZE = 4;
function rowToTeam(row) {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        unitIds: row.unit_ids,
        placement: row.placement ?? [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }],
        isActive: row.is_active,
        createdAt: row.created_at,
    };
}
// ---------------------------------------------------------------
// Custom errors
// ---------------------------------------------------------------
class TeamValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TeamValidationError';
    }
}
exports.TeamValidationError = TeamValidationError;
class TeamNotFoundError extends Error {
    constructor() {
        super('Team not found');
        this.name = 'TeamNotFoundError';
    }
}
exports.TeamNotFoundError = TeamNotFoundError;
// ---------------------------------------------------------------
// Get all teams for a user
// ---------------------------------------------------------------
async function getUserTeams(userId) {
    const result = await (0, pool_js_1.query)(`SELECT id, user_id, name, unit_ids, placement, is_active, created_at
     FROM teams
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC`, [userId]);
    return result.rows.map(rowToTeam);
}
// ---------------------------------------------------------------
// Get a single team (with ownership check)
// ---------------------------------------------------------------
async function getTeam(teamId, userId) {
    const result = await (0, pool_js_1.query)(`SELECT id, user_id, name, unit_ids, placement, is_active, created_at
     FROM teams
     WHERE id = $1 AND user_id = $2 AND is_active = TRUE`, [teamId, userId]);
    const row = result.rows[0];
    return row ? rowToTeam(row) : null;
}
async function createTeam(input) {
    const { name, unitIds, userId, accountLevel, placement } = input;
    await validateTeamInput({ name, unitIds, userId, accountLevel });
    const result = await (0, pool_js_1.query)(`INSERT INTO teams (user_id, name, unit_ids, placement)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, name, unit_ids, placement, is_active, created_at`, [userId, name.trim(), JSON.stringify(unitIds), JSON.stringify(placement || [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }])]);
    return rowToTeam(result.rows[0]);
}
async function updateTeam(input) {
    const { teamId, userId, accountLevel, name, unitIds, placement } = input;
    const existing = await getTeam(teamId, userId);
    if (!existing)
        throw new TeamNotFoundError();
    const newName = name?.trim() ?? existing.name;
    const newUnitIds = unitIds ?? existing.unitIds;
    const newPlacement = placement ?? existing.placement ?? [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }];
    await validateTeamInput({ name: newName, unitIds: newUnitIds, userId, accountLevel });
    const result = await (0, pool_js_1.query)(`UPDATE teams
     SET name = $1, unit_ids = $2, placement = $3
     WHERE id = $4 AND user_id = $5
     RETURNING id, user_id, name, unit_ids, placement, is_active, created_at`, [newName, JSON.stringify(newUnitIds), JSON.stringify(newPlacement), teamId, userId]);
    return rowToTeam(result.rows[0]);
}
// ---------------------------------------------------------------
// Soft-delete a team
// ---------------------------------------------------------------
async function deleteTeam(teamId, userId) {
    const result = await (0, pool_js_1.query)(`UPDATE teams SET is_active = FALSE WHERE id = $1 AND user_id = $2`, [teamId, userId]);
    if (!result.rowCount || result.rowCount === 0) {
        throw new TeamNotFoundError();
    }
}
// ---------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------
async function validateTeamInput(input) {
    const { name, unitIds, userId, accountLevel } = input;
    if (!name || name.trim().length < 1 || name.trim().length > 40) {
        throw new TeamValidationError('Team name must be between 1 and 40 characters');
    }
    if (!Array.isArray(unitIds) || unitIds.length !== TEAM_SIZE) {
        throw new TeamValidationError(`A team must have exactly ${TEAM_SIZE} units`);
    }
    // Check unit access
    const { valid, invalidIds } = await (0, unitService_js_1.validateUnitAccess)(unitIds, accountLevel);
    if (!valid) {
        throw new TeamValidationError(`One or more units are invalid or not yet unlocked: ${invalidIds.join(', ')}`);
    }
    // Check team count limit
    const countResult = await (0, pool_js_1.query)('SELECT COUNT(*) as count FROM teams WHERE user_id = $1 AND is_active = TRUE', [userId]);
    const count = parseInt(countResult.rows[0].count, 10);
    if (count >= MAX_TEAMS_PER_USER) {
        throw new TeamValidationError(`You can have at most ${MAX_TEAMS_PER_USER} teams`);
    }
}
//# sourceMappingURL=teamService.js.map