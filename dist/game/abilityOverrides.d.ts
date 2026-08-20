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
export declare function applyCooldownOverrides<T extends {
    cooldownTurns: number;
}>(map: Map<string, T>, overrides?: Record<string, number> | null): Map<string, T>;
/**
 * [A6] Merge campaign-scoped ability definitions into a match's ability map.
 * Same contract as applyCooldownOverrides: EVERY consumer for a campaign
 * match (executor, sim, client dry-run) applies the same merge or they
 * disagree on legality. Never mutates the shared base map. A campaign slug
 * that collides with an engine slug REPLACES it for this match only.
 */
export declare function applyCampaignAbilities<T>(map: Map<string, T>, defs?: Record<string, T> | null): Map<string, T>;
//# sourceMappingURL=abilityOverrides.d.ts.map