import { query } from '../db/pool.js';
import { Team, UUID } from '../types/index.js';
import { validateUnitAccess } from './unitService.js';

const MAX_TEAMS_PER_USER = 10;
const TEAM_SIZE = 4;

interface TeamRow {
  id: string;
  user_id: string;
  name: string;
  unit_ids: UUID[];
  is_active: boolean;
  created_at: string;
}

function rowToTeam(row: TeamRow): Team {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    unitIds: row.unit_ids as [UUID, UUID, UUID, UUID],
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------
// Custom errors
// ---------------------------------------------------------------

export class TeamValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TeamValidationError';
  }
}

export class TeamNotFoundError extends Error {
  constructor() {
    super('Team not found');
    this.name = 'TeamNotFoundError';
  }
}

// ---------------------------------------------------------------
// Get all teams for a user
// ---------------------------------------------------------------
export async function getUserTeams(userId: string): Promise<Team[]> {
  const result = await query<TeamRow>(
    `SELECT id, user_id, name, unit_ids, is_active, created_at
     FROM teams
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(rowToTeam);
}

// ---------------------------------------------------------------
// Get a single team (with ownership check)
// ---------------------------------------------------------------
export async function getTeam(teamId: string, userId: string): Promise<Team | null> {
  const result = await query<TeamRow>(
    `SELECT id, user_id, name, unit_ids, is_active, created_at
     FROM teams
     WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
    [teamId, userId]
  );
  const row = result.rows[0];
  return row ? rowToTeam(row) : null;
}

// ---------------------------------------------------------------
// Create a team
// ---------------------------------------------------------------
export interface CreateTeamInput {
  name: string;
  unitIds: string[];
  userId: string;
  accountLevel: number;
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const { name, unitIds, userId, accountLevel } = input;

  await validateTeamInput({ name, unitIds, userId, accountLevel });

  const result = await query<TeamRow>(
    `INSERT INTO teams (user_id, name, unit_ids)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, name, unit_ids, is_active, created_at`,
    [userId, name.trim(), JSON.stringify(unitIds)]
  );

  return rowToTeam(result.rows[0]);
}

// ---------------------------------------------------------------
// Update a team
// ---------------------------------------------------------------
export interface UpdateTeamInput {
  teamId: string;
  userId: string;
  accountLevel: number;
  name?: string;
  unitIds?: string[];
}

export async function updateTeam(input: UpdateTeamInput): Promise<Team> {
  const { teamId, userId, accountLevel, name, unitIds } = input;

  const existing = await getTeam(teamId, userId);
  if (!existing) throw new TeamNotFoundError();

  const newName = name?.trim() ?? existing.name;
  const newUnitIds = unitIds ?? existing.unitIds;

  await validateTeamInput({ name: newName, unitIds: newUnitIds, userId, accountLevel });

  const result = await query<TeamRow>(
    `UPDATE teams
     SET name = $1, unit_ids = $2
     WHERE id = $3 AND user_id = $4
     RETURNING id, user_id, name, unit_ids, is_active, created_at`,
    [newName, JSON.stringify(newUnitIds), teamId, userId]
  );

  return rowToTeam(result.rows[0]);
}

// ---------------------------------------------------------------
// Soft-delete a team
// ---------------------------------------------------------------
export async function deleteTeam(teamId: string, userId: string): Promise<void> {
  const result = await query(
    `UPDATE teams SET is_active = FALSE WHERE id = $1 AND user_id = $2`,
    [teamId, userId]
  );
  if (!result.rowCount || result.rowCount === 0) {
    throw new TeamNotFoundError();
  }
}

// ---------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------
async function validateTeamInput(input: {
  name: string;
  unitIds: string[];
  userId: string;
  accountLevel: number;
}): Promise<void> {
  const { name, unitIds, userId, accountLevel } = input;

  if (!name || name.trim().length < 1 || name.trim().length > 40) {
    throw new TeamValidationError('Team name must be between 1 and 40 characters');
  }

  if (!Array.isArray(unitIds) || unitIds.length !== TEAM_SIZE) {
    throw new TeamValidationError(`A team must have exactly ${TEAM_SIZE} units`);
  }

  // Check unit access
  const { valid, invalidIds } = await validateUnitAccess(unitIds, accountLevel);
  if (!valid) {
    throw new TeamValidationError(
      `One or more units are invalid or not yet unlocked: ${invalidIds.join(', ')}`
    );
  }

  // Check team count limit
  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM teams WHERE user_id = $1 AND is_active = TRUE',
    [userId]
  );
  const count = parseInt(countResult.rows[0].count, 10);
  if (count >= MAX_TEAMS_PER_USER) {
    throw new TeamValidationError(`You can have at most ${MAX_TEAMS_PER_USER} teams`);
  }
}
