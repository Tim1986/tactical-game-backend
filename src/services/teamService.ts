import { query } from '../db/pool.js';
import { Team, UnitCustomization, UUID } from '../types/index.js';
import { validateUnitAccess } from './unitService.js';

const MAX_TEAMS_PER_USER = 10;
const TEAM_SIZE = 4;
const MAX_DUPLICATES_PER_CLASS = 2;

interface TeamRow {
  id: string;
  user_id: string;
  name: string;
  unit_ids: UUID[];
  placement: Array<{ x: number; y: number }>;
  unit_customizations: UnitCustomization[];
  is_active: boolean;
  created_at: string;
}

function rowToTeam(row: TeamRow): Team {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    unitIds: row.unit_ids as [UUID, UUID, UUID, UUID],
    placement: row.placement ?? [{x:1,y:1},{x:1,y:3},{x:1,y:5},{x:1,y:7}],
    unitCustomizations: row.unit_customizations ?? [],
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
    `SELECT id, user_id, name, unit_ids, placement, unit_customizations, is_active, created_at
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
    `SELECT id, user_id, name, unit_ids, placement, unit_customizations, is_active, created_at
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
  placement?: Array<{ x: number; y: number }>;
  unitCustomizations?: UnitCustomization[];
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const { name, unitIds, userId, accountLevel, placement, unitCustomizations } = input;

  const units = await validateTeamInput({ name, unitIds, userId, accountLevel });
  const customizations = resolveCustomizations(unitIds, unitCustomizations ?? [], units);

  const result = await query<TeamRow>(
    `INSERT INTO teams (user_id, name, unit_ids, placement, unit_customizations)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, name, unit_ids, placement, unit_customizations, is_active, created_at`,
    [userId, name.trim(), JSON.stringify(unitIds),
     JSON.stringify(placement || [{x:1,y:1},{x:1,y:3},{x:1,y:5},{x:1,y:7}]),
     JSON.stringify(customizations)]
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
  placement?: Array<{ x: number; y: number }>;
  unitCustomizations?: UnitCustomization[];
}

export async function updateTeam(input: UpdateTeamInput): Promise<Team> {
  const { teamId, userId, accountLevel, name, unitIds, placement, unitCustomizations } = input;

  const existing = await getTeam(teamId, userId);
  if (!existing) throw new TeamNotFoundError();

  const newName = name?.trim() ?? existing.name;
  const newUnitIds = unitIds ?? existing.unitIds;
  const newPlacement = placement ?? existing.placement ?? [{x:1,y:1},{x:1,y:3},{x:1,y:5},{x:1,y:7}];

  const units = await validateTeamInput({ name: newName, unitIds: newUnitIds, userId, accountLevel });
  const newCustomizations = resolveCustomizations(
    newUnitIds,
    unitCustomizations ?? existing.unitCustomizations ?? [],
    units
  );

  const result = await query<TeamRow>(
    `UPDATE teams
     SET name = $1, unit_ids = $2, placement = $3, unit_customizations = $4
     WHERE id = $5 AND user_id = $6
     RETURNING id, user_id, name, unit_ids, placement, unit_customizations, is_active, created_at`,
    [newName, JSON.stringify(newUnitIds), JSON.stringify(newPlacement),
     JSON.stringify(newCustomizations), teamId, userId]
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
// Resolve customizations: fill defaults for any slots missing choices.
// specialSlug defaults to the first entry in the unit's special_options.
// passiveSlug defaults to null (no passive chosen) until options exist.
// ---------------------------------------------------------------
function resolveCustomizations(
  unitIds: string[],
  provided: UnitCustomization[],
  units: import('../types/index.js').UnitDefinition[],
): UnitCustomization[] {
  const unitMap = new Map(units.map((u) => [u.id, u]));
  return unitIds.map((id, i) => {
    const def = unitMap.get(id);
    const given = provided[i];
    const defaultSpecial = def?.specialOptions[0] ?? def?.abilities.find(() => true) ?? '';
    const specialSlug = given?.specialSlug && def?.specialOptions.includes(given.specialSlug)
      ? given.specialSlug
      : defaultSpecial;
    const passiveSlug = given?.passiveSlug && def?.passiveOptions.some((p) => p.slug === given.passiveSlug)
      ? given.passiveSlug
      : null;
    return { specialSlug, passiveSlug };
  });
}

// ---------------------------------------------------------------
// Validation helper — returns resolved unit definitions for reuse
// ---------------------------------------------------------------
async function validateTeamInput(input: {
  name: string;
  unitIds: string[];
  userId: string;
  accountLevel: number;
}): Promise<import('../types/index.js').UnitDefinition[]> {
  const { name, unitIds, userId, accountLevel } = input;

  if (!name || name.trim().length < 1 || name.trim().length > 40) {
    throw new TeamValidationError('Team name must be between 1 and 40 characters');
  }

  if (!Array.isArray(unitIds) || unitIds.length !== TEAM_SIZE) {
    throw new TeamValidationError(`A team must have exactly ${TEAM_SIZE} units`);
  }

  // Check unit access
  const { valid, invalidIds, units } = await validateUnitAccess(unitIds, accountLevel);
  if (!valid) {
    throw new TeamValidationError(
      `One or more units are invalid or not yet unlocked: ${invalidIds.join(', ')}`
    );
  }

  // Check class duplicate cap
  const slugCounts: Record<string, number> = {};
  for (const u of units) {
    slugCounts[u.slug] = (slugCounts[u.slug] ?? 0) + 1;
    if (slugCounts[u.slug] > MAX_DUPLICATES_PER_CLASS) {
      throw new TeamValidationError(
        `A team can have at most ${MAX_DUPLICATES_PER_CLASS} of the same class (too many: ${u.slug})`
      );
    }
  }

  // Check team count limit (only relevant for creates — checked here for both)
  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM teams WHERE user_id = $1 AND is_active = TRUE',
    [userId]
  );
  const count = parseInt(countResult.rows[0].count, 10);
  if (count >= MAX_TEAMS_PER_USER) {
    throw new TeamValidationError(`You can have at most ${MAX_TEAMS_PER_USER} teams`);
  }

  return units;
}
