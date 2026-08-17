/**
 * abilityOverrides.ts — Campaign per-match ability adjustments.
 *
 * Campaign encounters may override ability cooldowns (e.g. L6 double-special).
 * EVERY consumer of an ability map for a campaign match must apply the same
 * overrides — the turn executor AND any client-side dry-run/preview — or the
 * two disagree on legality and the dry-run throws where the real turn succeeds
 * (COMBAT_AUDIT.md F2). This helper is the single implementation; never
 * hand-roll the merge.
 *
 * Generic over the ability shape so both the engine's AbilityDefinition and
 * the mobile client's AbilityDef can use it.
 */
export function applyCooldownOverrides<T extends { cooldownTurns: number }>(
  map: Map<string, T>,
  overrides?: Record<string, number> | null,
): Map<string, T> {
  if (!overrides || Object.keys(overrides).length === 0) return map;
  const out = new Map(map);
  for (const [slug, cd] of Object.entries(overrides)) {
    const def = out.get(slug);
    if (def) out.set(slug, { ...def, cooldownTurns: cd });
  }
  return out;
}

/**
 * [A6] Merge campaign-scoped ability definitions into a match's ability map.
 * Same contract as applyCooldownOverrides: EVERY consumer for a campaign
 * match (executor, sim, client dry-run) applies the same merge or they
 * disagree on legality. Never mutates the shared base map. A campaign slug
 * that collides with an engine slug REPLACES it for this match only.
 */
export function applyCampaignAbilities<T>(
  map: Map<string, T>,
  defs?: Record<string, T> | null,
): Map<string, T> {
  if (!defs || Object.keys(defs).length === 0) return map;
  const out = new Map(map);
  for (const [slug, def] of Object.entries(defs)) out.set(slug, def);
  return out;
}
