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

// ═══════════════════════════════════════════════════════════════════════════
// [Gate 1, owner-signed 2026-08-24] CAMPAIGN ABILITY TUNING — the exceptions
// table CAMPAIGN_GROWTH's flat curve cannot reach.
//
// CAMPAIGN_GROWTH lifts BASIC attacks only, deliberately: touching specials
// would break the arena anchor's contract. But two specials were measured to
// fail specifically ABOVE the anchor, and neither is fixable by a basics
// rung. They are adjusted here, campaign-only, from L6 up — arena is
// untouched by construction.
//
// ⚠ OWNER REQUIREMENT: "it needs to list that scaling where the player
// chooses it." Descriptions are therefore REBUILT from the same constants
// that change the numbers — never retyped — so the special picker, the
// rulebook and the executor cannot disagree. Never hard-code a tuned number
// into UI copy.
//
// Adding an entry: state the MEASUREMENT that justifies it. This table is
// where balance debt accumulates silently if entries arrive on vibes.
// ═══════════════════════════════════════════════════════════════════════════

/** The level at which campaign tuning begins — the anchor + 1. */
export const CAMPAIGN_TUNING_MIN_LEVEL = 6;

/** ffh (Fire From Heaven): 14 -> 18 damage above the anchor.
 *  MEASURED: at hpScale 1.95 the sorcerer holding ffh won 46% where
 *  flame_jet won 94% and ignite 99% (classValue run 2). An ally-hitting ring
 *  anti-scales because higher scale means FEWER, FATTER enemies — the exact
 *  case a ring is worst against — and the owner reports the same in play:
 *  "the ai brain is too good at playing around aoe". */
export const FFH_CAMPAIGN_DAMAGE = 18;

/** assassinate (Kill Shot): gains a 25%-of-max-health execute floor above
 *  the anchor. MEASURED/derived: a flat 22 is 44% of an arena pool but 29%
 *  at hpScale 1.5 — executes anti-scale with the difficulty dial itself. */
export const ASSASSINATE_CAMPAIGN_PERCENT = 0.25;

type TunableEffect = {
  type: string; value?: number;
  healthThreshold?: number; healthThresholdPercent?: number;
};
type TunableAbility = { slug: string; description: string; effects: readonly TunableEffect[] | TunableEffect[] };

/**
 * Apply the campaign exceptions to an ability map for a party at `level`.
 * Below CAMPAIGN_TUNING_MIN_LEVEL this returns the map untouched, so the
 * anchor holds by construction.
 *
 * Same contract as the other two helpers in this file: EVERY consumer of a
 * campaign ability map must apply it — executor, sim, and the client's
 * dry-run — or they disagree about what an ability does.
 */
export function applyCampaignAbilityTuning<T extends TunableAbility>(
  map: Map<string, T>,
  level: number,
): Map<string, T> {
  if (level < CAMPAIGN_TUNING_MIN_LEVEL) return map;
  const out = new Map(map);

  const ffh = out.get('ffh');
  if (ffh) {
    out.set('ffh', {
      ...ffh,
      // Description REBUILT from the constant (owner requirement).
      description: `Deals ${FFH_CAMPAIGN_DAMAGE} unblockable damage in a ring around any tile within 5 steps, allies included. The centre tile is spared.`,
      effects: ffh.effects.map((e) =>
        e.type === 'damage' ? { ...e, value: FFH_CAMPAIGN_DAMAGE } : e),
    } as T);
  }

  const assn = out.get('assassinate');
  if (assn) {
    const flat = assn.effects.find((e) => e.healthThreshold !== undefined)?.healthThreshold ?? 22;
    out.set('assassinate', {
      ...assn,
      description: `Instantly kills an adjacent enemy at or below ${flat} health, or ${Math.round(ASSASSINATE_CAMPAIGN_PERCENT * 100)}% of its maximum health — whichever is higher. Fails if the target is above that.`,
      effects: assn.effects.map((e) =>
        e.healthThreshold !== undefined
          ? { ...e, healthThresholdPercent: ASSASSINATE_CAMPAIGN_PERCENT } : e),
    } as T);
  }

  return out;
}

/**
 * The player-facing note for an ability that CHANGES above the anchor.
 *
 * Specials are chosen at L2/L3 — below CAMPAIGN_TUNING_MIN_LEVEL — so at the
 * moment of choice the tuned numbers are not live yet. Showing only today's
 * value would hide the upgrade; showing only the tuned value would be a lie
 * about the next four levels. So the picker shows the current description
 * plus this forward-looking line.
 *
 * Owner requirement (2026-08-24): "it needs to list that scaling where the
 * player chooses it." Built from the same constants as the tuning itself, so
 * copy cannot drift from behaviour.
 *
 * Returns null when the ability is untuned, or when the level is already at
 * or past the threshold (the description itself is then already correct).
 */
export function campaignAbilityOutlook<T extends TunableAbility>(
  base: Map<string, T>,
  slug: string,
  level: number,
): string | null {
  if (level >= CAMPAIGN_TUNING_MIN_LEVEL) return null;
  const before = base.get(slug);
  if (!before) return null;
  const after = applyCampaignAbilityTuning(base, CAMPAIGN_TUNING_MIN_LEVEL).get(slug);
  if (!after || after.description === before.description) return null;
  return `At level ${CAMPAIGN_TUNING_MIN_LEVEL}: ${after.description}`;
}
