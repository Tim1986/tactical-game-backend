"use strict";
/**
 * defaultData.ts — Sim harness unit/ability data derived from gameData.ts.
 *
 * Values come from src/config/gameData.ts — do NOT edit numbers here.
 * Slugs match the real in-game slugs (strike, bolt, eldritch, etc.).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNIT_DEFS = exports.UNIT_DEFS_SIM = exports.DEFAULT_UNITS = exports.DEFAULT_ABILITIES = void 0;
exports.buildAbilityMap = buildAbilityMap;
const gameData_js_1 = require("../config/gameData.js");
// ---------------------------------------------------------------------------
// Build DEFAULT_ABILITIES (real slugs, values from gameData)
// ---------------------------------------------------------------------------
exports.DEFAULT_ABILITIES = gameData_js_1.ABILITY_DEFS.map((a) => ({
    id: a.slug,
    slug: a.slug,
    name: a.name,
    description: '',
    targetingType: a.targeting_type,
    range: a.range,
    areaRadius: a.area_radius,
    cooldownTurns: a.cooldown_turns,
    isSpecial: a.is_special,
    isUnblockable: a.is_unblockable,
    excludeAllies: a.exclude_allies ?? false,
    effects: a.effects,
}));
function buildAbilityMap(abilities = exports.DEFAULT_ABILITIES) {
    return new Map(abilities.map((a) => [a.slug, a]));
}
// ---------------------------------------------------------------------------
// Build DEFAULT_UNITS (real ability slugs, stats from gameData)
// ---------------------------------------------------------------------------
exports.DEFAULT_UNITS = Object.fromEntries(gameData_js_1.UNIT_DEFS.map((u) => [
    u.slug,
    {
        slug: u.slug,
        maxHealth: u.max_health,
        armorClass: u.armor_class,
        movementRange: u.movement_range,
        abilities: [...u.abilities],
        passives: [...(u.passives ?? [])],
        specialOptions: [...(u.special_options ?? [])],
        passiveOptions: [...(u.passive_options ?? [])],
    },
]));
exports.UNIT_DEFS = exports.DEFAULT_UNITS;
// Alias for simHarness compatibility
exports.UNIT_DEFS_SIM = exports.DEFAULT_UNITS;
//# sourceMappingURL=defaultData.js.map