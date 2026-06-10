import { query } from '../db/pool.js';
import { UnitDefinition, AbilityDefinition } from '../types/index.js';

interface UnitRow {
  id: string;
  slug: string;
  name: string;
  max_health: number;
  movement_range: number;
  abilities: string[];
  passives: string[];
  unlock_level: number;
  asset_key: string;
  is_active: boolean;
}

interface AbilityRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  targeting_type: string;
  range: number;
  area_radius: number;
  cooldown_turns: number;
  effects: unknown[];
}

function rowToUnit(row: UnitRow): UnitDefinition {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    maxHealth: row.max_health,
    movementRange: row.movement_range,
    abilities: row.abilities,
    passives: row.passives,
    unlockLevel: row.unlock_level,
    assetKey: row.asset_key,
    isActive: row.is_active,
  };
}

function rowToAbility(row: AbilityRow): AbilityDefinition {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    targetingType: row.targeting_type as AbilityDefinition['targetingType'],
    range: row.range,
    areaRadius: row.area_radius,
    cooldownTurns: row.cooldown_turns,
    effects: row.effects as AbilityDefinition['effects'],
  };
}

// ---------------------------------------------------------------
// Get all units unlocked for a given player account level
// ---------------------------------------------------------------
export async function getUnlockedUnits(
  accountLevel: number
): Promise<{ units: UnitDefinition[]; abilities: AbilityDefinition[] }> {
  const unitResult = await query<UnitRow>(
    `SELECT id, slug, name, max_health, movement_range, abilities, passives,
            unlock_level, asset_key, is_active
     FROM unit_definitions
     WHERE is_active = TRUE AND unlock_level <= $1
     ORDER BY unlock_level ASC, name ASC`,
    [accountLevel]
  );

  const units = unitResult.rows.map((row: UnitRow) => rowToUnit(row));

  // Collect all ability slugs referenced by these units
  const allAbilitySlugs = [...new Set(units.flatMap((u) => u.abilities))];

  if (allAbilitySlugs.length === 0) {
    return { units, abilities: [] };
  }

  // Fetch full ability definitions for client display
  const abilityResult = await query<AbilityRow>(
    `SELECT id, slug, name, description, targeting_type, range, area_radius,
            cooldown_turns, effects
     FROM ability_definitions
     WHERE slug = ANY($1)`,
    [allAbilitySlugs]
  );

  const abilities = abilityResult.rows.map((row: AbilityRow) => rowToAbility(row));

  return { units, abilities };
}

// ---------------------------------------------------------------
// Get a single unit by slug (used by match engine)
// ---------------------------------------------------------------
export async function getUnitBySlug(slug: string): Promise<UnitDefinition | null> {
  const result = await query<UnitRow>(
    `SELECT id, slug, name, max_health, movement_range, abilities, passives,
            unlock_level, asset_key, is_active
     FROM unit_definitions
     WHERE slug = $1 AND is_active = TRUE`,
    [slug]
  );

  const row = result.rows[0];
  return row ? rowToUnit(row) : null;
}

// ---------------------------------------------------------------
// Get a single unit by ID
// ---------------------------------------------------------------
export async function getUnitById(id: string): Promise<UnitDefinition | null> {
  const result = await query<UnitRow>(
    `SELECT id, slug, name, max_health, movement_range, abilities, passives,
            unlock_level, asset_key, is_active
     FROM unit_definitions
     WHERE id = $1 AND is_active = TRUE`,
    [id]
  );

  const row = result.rows[0];
  return row ? rowToUnit(row) : null;
}

// ---------------------------------------------------------------
// Validate that an array of unit IDs are all valid and accessible
// at the given account level. Returns the unit definitions if valid.
// ---------------------------------------------------------------
export async function validateUnitAccess(
  unitIds: string[],
  accountLevel: number
): Promise<{ valid: boolean; units: UnitDefinition[]; invalidIds: string[] }> {
  const result = await query<UnitRow>(
    `SELECT id, slug, name, max_health, movement_range, abilities, passives,
            unlock_level, asset_key, is_active
     FROM unit_definitions
     WHERE id = ANY($1) AND is_active = TRUE`,
    [unitIds]
  );

  const foundUnits = result.rows.map((row: UnitRow) => rowToUnit(row));
  const foundIds = new Set(foundUnits.map((u: UnitDefinition) => u.id));
  const invalidIds = unitIds.filter((id: string) => !foundIds.has(id));

  // Check unlock levels
  const lockedUnits = foundUnits.filter((u: UnitDefinition) => u.unlockLevel > accountLevel);

  if (invalidIds.length > 0 || lockedUnits.length > 0) {
    return {
      valid: false,
      units: foundUnits,
      invalidIds: [...invalidIds, ...lockedUnits.map((u: UnitDefinition) => u.id)],
    };
  }

  return { valid: true, units: foundUnits, invalidIds: [] };
}
