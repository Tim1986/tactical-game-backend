"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.abilityShape = abilityShape;
/**
 * abilityShape.ts — the mechanical shape fields that live ONLY in gameData.ts.
 *
 * `ability_definitions` is a materialized copy of gameData.ts (see db/seed.ts),
 * but it was never given columns for `area_shape` or `self_status`. Every code
 * path that rebuilt an AbilityDefinition from a DB row therefore produced one
 * with `areaShape: undefined`, and `isInAoe` silently fell back to chebyshev.
 *
 * The effect on live matches was severe and invisible:
 *   - Ring of Fire / Ring of Frost / Leaping Slam HIT THEIR OWN CENTRE. The
 *     calm eye — the entire point of the ring redesign — did not exist.
 *   - Whirlwind / Ground Slam hit all 8 neighbours instead of the 4 cardinal
 *     ones they are specified for.
 * Offline play was correct (it runs off gameData directly), so the two modes
 * disagreed about the rules.
 *
 * Rather than add columns that can drift out of sync with gameData.ts on every
 * balance change, overlay these fields straight from gameData — it is already
 * the source the seed writes FROM, so it cannot disagree with itself.
 *
 * `is_multi_hit` DOES have a column and is selected correctly by matchService,
 * but it is included here anyway so callers that omit it (unitService's client
 * payload) still get the right answer.
 */
const gameData_js_1 = require("./gameData.js");
const SHAPE_BY_SLUG = new Map(gameData_js_1.ABILITY_DEFS.map((raw) => {
    const a = raw;
    return [a.slug, {
            areaShape: a.area_shape ?? 'chebyshev',
            selfStatus: a.self_status,
            isMultiHit: a.is_multi_hit ?? false,
        }];
}));
/**
 * Engine-authoritative shape fields for a slug. Spread over any AbilityDefinition
 * built from a database row. Unknown slugs return the neutral defaults so a
 * DB-only ability (there are none today) still resolves sanely.
 */
function abilityShape(slug) {
    return SHAPE_BY_SLUG.get(slug) ?? { areaShape: 'chebyshev', selfStatus: undefined, isMultiHit: false };
}
//# sourceMappingURL=abilityShape.js.map