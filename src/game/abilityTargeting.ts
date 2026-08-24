/**
 * abilityTargeting — who an ability is ALLOWED to be aimed at.
 *
 * One definition, in the engine, because this question is asked in three
 * places that must agree: the server's turn validation, the API's derived
 * `canTargetAlly` field, and the client's targeting UI. It used to be written
 * out three times (turnProcessor didn't ask at all, unitService and the mobile
 * gameDataCache each had their own copy), which is how the 2026-08-23 bug
 * survived: the UI happily tinted an ALLY as a valid target for a harmful
 * single-target ability, and the engine accepted the cast, because nothing on
 * either side checked ownership.
 */

/** Ally-targetable despite effects this derivation cannot read as beneficial. */
export const ALLY_TARGETABLE_SPECIAL_SLUGS = new Set(['ward', 'rescue']);

// Ward's shield and Ring of Frost's freeze are both apply_status, so the status
// slug has to be checked too — not just the effect type.
const BENEFICIAL_EFFECTS = new Set(['heal', 'remove_status', 'grant_max_health']);
const BENEFICIAL_STATUSES = new Set(['shielded']);

/** An ability is beneficial when EVERY effect it carries is beneficial. */
export function isBeneficialAbility(
  targetingType: string,
  effects: ReadonlyArray<{ type: string; statusSlug?: string }>,
): boolean {
  if (targetingType === 'self' || !Array.isArray(effects) || effects.length === 0) return false;
  return effects.every((e) =>
    BENEFICIAL_EFFECTS.has(e.type) ||
    (e.type === 'apply_status' && !!e.statusSlug && BENEFICIAL_STATUSES.has(e.statusSlug)));
}

/**
 * May this ability be aimed at one of the caster's OWN units?
 *
 * Prefers an explicit `canTargetAlly` when the definition carries one (campaign
 * abilities set it by hand), otherwise derives it. Only meaningful for
 * single-target aiming: AREA and LINE abilities hit whatever is caught in them
 * regardless (ABL-9/ABL-10 — friendly fire is a deliberate rule, and several
 * puzzles are built on it), and `self` abilities target only the caster.
 */
export function canAimAtAlly(ability: {
  targetingType: string;
  canTargetAlly?: boolean;
  slug?: string;
  effects: ReadonlyArray<{ type: string; statusSlug?: string }>;
}): boolean {
  if (typeof ability.canTargetAlly === 'boolean') return ability.canTargetAlly;
  if (ability.slug && ALLY_TARGETABLE_SPECIAL_SLUGS.has(ability.slug)) return true;
  return isBeneficialAbility(ability.targetingType, ability.effects);
}
