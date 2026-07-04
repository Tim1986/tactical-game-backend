/**
 * defaultData.ts — Sim harness unit/ability data derived from gameData.ts.
 *
 * Values come from src/config/gameData.ts — do NOT edit numbers here.
 * Slugs match the real in-game slugs (strike, bolt, eldritch, etc.).
 */

import { ABILITY_DEFS, UNIT_DEFS } from '../config/gameData.js';
import { AbilityDefinition, UnitDefinition } from './types.js';

// ---------------------------------------------------------------------------
// Build DEFAULT_ABILITIES (real slugs, values from gameData)
// ---------------------------------------------------------------------------

export const DEFAULT_ABILITIES: AbilityDefinition[] = ABILITY_DEFS.map((a) => ({
  id:            a.slug,
  slug:          a.slug,
  name:          a.name,
  description:   '',
  targetingType: a.targeting_type as AbilityDefinition['targetingType'],
  range:         a.range,
  areaRadius:    a.area_radius,
  cooldownTurns: a.cooldown_turns,
  isSpecial:     a.is_special,
  isUnblockable: a.is_unblockable,
  effects:       a.effects as unknown as AbilityDefinition['effects'],
}));

export function buildAbilityMap(
  abilities: AbilityDefinition[] = DEFAULT_ABILITIES,
): Map<string, AbilityDefinition> {
  return new Map(abilities.map((a) => [a.slug, a]));
}

// ---------------------------------------------------------------------------
// Build DEFAULT_UNITS (real ability slugs, stats from gameData)
// ---------------------------------------------------------------------------

export const DEFAULT_UNITS: Record<string, UnitDefinition> = Object.fromEntries(
  UNIT_DEFS.map((u) => [
    u.slug,
    {
      slug:          u.slug,
      maxHealth:     u.max_health,
      armorClass:    u.armor_class,
      movementRange: u.movement_range,
      abilities:     [...u.abilities],
      passives:      [...(u.passives ?? [])],
    } satisfies UnitDefinition,
  ]),
);

// Alias for simHarness compatibility
export const UNIT_DEFS_SIM = DEFAULT_UNITS;
export { DEFAULT_UNITS as UNIT_DEFS };
