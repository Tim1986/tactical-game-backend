import { AbilityDefinition } from '../types/index.js';
export type AbilityShape = Pick<AbilityDefinition, 'areaShape' | 'selfStatus' | 'isMultiHit'>;
/**
 * Engine-authoritative shape fields for a slug. Spread over any AbilityDefinition
 * built from a database row. Unknown slugs return the neutral defaults so a
 * DB-only ability (there are none today) still resolves sanely.
 */
export declare function abilityShape(slug: string): AbilityShape;
//# sourceMappingURL=abilityShape.d.ts.map