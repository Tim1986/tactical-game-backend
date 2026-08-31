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

/**
 * [A3, owner-approved 2026-08-31] EVERY damage special scales above the anchor.
 *
 * Before this, exactly two specials scaled (ffh, assassinate) and the other
 * thirteen fought L6-L10 content at arena numbers — the owner's Flame Jet
 * complaint ("feels pretty bad compared to Ring of Fire") was this gap, not a
 * design intent. Guideline is ffh's own precedent, ~+30%, VARIED by rider:
 *
 *   - pure damage takes the full rung (whirlwind 16→21, dagger_toss 16→21,
 *     flame_jet 16→21, piercing 12→16, longshot 15→20, drain 10→13);
 *   - damage with a strong control rider takes a smaller one — the rider is
 *     the point and does not shrink as HP pools grow (shockwave 9→11,
 *     concussive 7→9, pinning 7→9, cold_snap 9→11, expose 16→20);
 *   - incidental damage barely moves (roar 3→4, ignite 5→6 — their value is
 *     the leap/weaken and the burn stacks, which scale with nothing).
 *
 * ⚠ SYMMETRIC BY CONSTRUCTION. The tuning lives on the ability MAP, so an
 * enemy carrying a shared slug (e9's vanguard casts roar) gets the same
 * number. That is the established ffh behaviour, the fiction agrees, and
 * enemy difficulty has its own dial (hpScale) to trim with.
 *
 * ⚠ Status-only specials (heal, ward, purify, second_wind, fear, freeze,
 * blizzard) are deliberately untouched — whether HEALS should scale is a
 * separate question flagged for the battery, not smuggled in here.
 *
 * ⚠ PROVISIONAL until the battery runs (owner: "it will need to vary and
 * everything will need to be tested"). classValue/choiceReport re-measure the
 * intra-class spread; revise per special from evidence, never globally.
 */
export const CAMPAIGN_SPECIAL_DAMAGE: Readonly<Record<string, number>> = {
  whirlwind: 21, shockwave: 11, roar: 4,
  concussive: 9, shield_bash: 22,
  dagger_toss: 21, expose: 20,
  piercing: 16, pinning: 9, longshot: 20,
  flame_jet: 21, ignite: 6,
  grasp: 12, drain: 13, cold_snap: 11,
};
/** drain heals its caster a fixed amount; keep it ~80% of the stolen value. */
export const DRAIN_CAMPAIGN_HEAL = 10;

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

  // [A3] The general damage-special rung. Applied before the named exceptions
  // so ffh's dedicated constant still wins if both ever list it.
  for (const [slug, to] of Object.entries(CAMPAIGN_SPECIAL_DAMAGE)) {
    const a = out.get(slug);
    if (!a) continue;
    let desc = a.description;
    const effects = a.effects.map((e) => {
      if ((e.type !== 'damage' && e.type !== 'lifesteal') || e.value === undefined) return e;
      if (e.healthThreshold !== undefined || e.healthThresholdPercent !== undefined) return e; // executes scale by window, not value
      // Rebuild the description from the numbers, never hand-edit it — the
      // first standalone occurrence of the old value is the damage number.
      desc = desc.replace(new RegExp(`\\b${e.value}\\b`), String(to));
      const next: TunableEffect & { healValue?: number } = { ...e, value: to };
      if (slug === 'drain' && (e as { healValue?: number }).healValue !== undefined) {
        desc = desc.replace(new RegExp(`\\b${(e as { healValue?: number }).healValue}\\b`), String(DRAIN_CAMPAIGN_HEAL));
        next.healValue = DRAIN_CAMPAIGN_HEAL;
      }
      return next;
    });
    out.set(slug, { ...a, description: desc, effects } as T);
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
