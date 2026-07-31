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
