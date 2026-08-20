"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBeneficialAbility = isBeneficialAbility;
exports.getUnlockedUnits = getUnlockedUnits;
exports.getUnitBySlug = getUnitBySlug;
exports.getUnitById = getUnitById;
exports.validateUnitAccess = validateUnitAccess;
const pool_js_1 = require("../db/pool.js");
const abilityShape_js_1 = require("../config/abilityShape.js");
function rowToUnit(row) {
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        maxHealth: row.max_health,
        armorClass: row.armor_class,
        movementRange: row.movement_range,
        abilities: row.abilities,
        passives: row.passives,
        specialOptions: row.special_options ?? [],
        passiveOptions: row.passive_options ?? [],
        unlockLevel: row.unlock_level,
        assetKey: row.asset_key,
        isActive: row.is_active,
    };
}
// Abilities whose effects are still meant to target an ally rather than an
// enemy but that this derivation can't see — kept as a safety net.
const ALLY_TARGETABLE_SPECIAL_SLUGS = new Set(['ward', 'rescue']);
// An ability is ally-targetable when EVERY effect it has is beneficial.
//
// This used to require every effect to be a `heal`, which quietly excluded
// Purify: its three remove_status effects failed the test, so despite a
// description reading "yourself or an ally within 3 tiles" the client refused
// to accept an ally as a target and a frozen teammate could never be cleansed.
// Effect type alone is not enough for apply_status — the same effect delivers
// Ward's shield and Ring of Frost's freeze — so the status slug is checked too.
const BENEFICIAL_EFFECTS = new Set(['heal', 'remove_status', 'grant_max_health']);
const BENEFICIAL_STATUSES = new Set(['shielded']);
function isBeneficialAbility(targetingType, effects) {
    if (targetingType === 'self' || !Array.isArray(effects) || effects.length === 0)
        return false;
    return effects.every((e) => BENEFICIAL_EFFECTS.has(e.type) ||
        (e.type === 'apply_status' && !!e.statusSlug && BENEFICIAL_STATUSES.has(e.statusSlug)));
}
function rowToAbility(row) {
    const effects = row.effects;
    const isHealOnly = isBeneficialAbility(row.targeting_type, effects);
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        targetingType: row.targeting_type,
        range: row.range,
        areaRadius: row.area_radius,
        cooldownTurns: row.cooldown_turns,
        isUnblockable: row.is_unblockable,
        excludeAllies: row.exclude_allies,
        effects: row.effects,
        isSpecial: row.is_special,
        canTargetAlly: isHealOnly || ALLY_TARGETABLE_SPECIAL_SLUGS.has(row.slug),
        // areaShape has no DB column and this query omits is_multi_hit, so without
        // this the client renders ring previews as full squares and multi-hit
        // attacks as a single grouped log line. See config/abilityShape.ts.
        ...(0, abilityShape_js_1.abilityShape)(row.slug),
    };
}
// ---------------------------------------------------------------
// Get all units unlocked for a given player account level
// ---------------------------------------------------------------
async function getUnlockedUnits(accountLevel) {
    const unitResult = await (0, pool_js_1.query)(`SELECT id, slug, name, max_health, armor_class, movement_range, abilities, passives, special_options, passive_options,
            unlock_level, asset_key, is_active
     FROM unit_definitions
     WHERE is_active = TRUE
     ORDER BY unlock_level ASC, name ASC`, []);
    const units = unitResult.rows.map((row) => rowToUnit(row));
    // Collect all ability slugs referenced by these units — includes every
    // special option (not just the default-baked abilities array), since a
    // player's chosen special ends up as the unit instance's abilities[1] and
    // the client needs the full AbilityDefinition for whichever one they pick.
    const allAbilitySlugs = [...new Set(units.flatMap((u) => [...u.abilities, ...u.specialOptions]))];
    if (allAbilitySlugs.length === 0) {
        return { units, abilities: [] };
    }
    // Fetch full ability definitions for client display
    const abilityResult = await (0, pool_js_1.query)(`SELECT id, slug, name, description, targeting_type, range, area_radius,
            cooldown_turns, is_special, is_unblockable, exclude_allies, effects
     FROM ability_definitions
     WHERE slug = ANY($1)`, [allAbilitySlugs]);
    const abilities = abilityResult.rows.map((row) => rowToAbility(row));
    return { units, abilities };
}
// ---------------------------------------------------------------
// Get a single unit by slug (used by match engine)
// ---------------------------------------------------------------
async function getUnitBySlug(slug) {
    const result = await (0, pool_js_1.query)(`SELECT id, slug, name, max_health, armor_class, movement_range, abilities, passives, special_options, passive_options,
            unlock_level, asset_key, is_active
     FROM unit_definitions
     WHERE slug = $1 AND is_active = TRUE`, [slug]);
    const row = result.rows[0];
    return row ? rowToUnit(row) : null;
}
// ---------------------------------------------------------------
// Get a single unit by ID
// ---------------------------------------------------------------
async function getUnitById(id) {
    const result = await (0, pool_js_1.query)(`SELECT id, slug, name, max_health, armor_class, movement_range, abilities, passives, special_options, passive_options,
            unlock_level, asset_key, is_active
     FROM unit_definitions
     WHERE id = $1 AND is_active = TRUE`, [id]);
    const row = result.rows[0];
    return row ? rowToUnit(row) : null;
}
// ---------------------------------------------------------------
// Validate that an array of unit IDs are all valid and accessible
// at the given account level. Returns the unit definitions if valid.
// ---------------------------------------------------------------
async function validateUnitAccess(unitIds, accountLevel) {
    const result = await (0, pool_js_1.query)(`SELECT id, slug, name, max_health, armor_class, movement_range, abilities, passives, special_options, passive_options,
            unlock_level, asset_key, is_active
     FROM unit_definitions
     WHERE id = ANY($1) AND is_active = TRUE`, [unitIds]);
    const foundUnits = result.rows.map((row) => rowToUnit(row));
    const foundIds = new Set(foundUnits.map((u) => u.id));
    const invalidIds = unitIds.filter((id) => !foundIds.has(id));
    if (invalidIds.length > 0) {
        return { valid: false, units: foundUnits, invalidIds };
    }
    return { valid: true, units: foundUnits, invalidIds: [] };
}
//# sourceMappingURL=unitService.js.map