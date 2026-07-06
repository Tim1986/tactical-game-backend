/**
 * defaultData.ts — Sim harness unit/ability data derived from gameData.ts.
 *
 * Values come from src/config/gameData.ts — do NOT edit numbers here.
 * Slugs match the real in-game slugs (strike, bolt, eldritch, etc.).
 */
import { AbilityDefinition, UnitDefinition } from './types.js';
export declare const DEFAULT_ABILITIES: AbilityDefinition[];
export declare function buildAbilityMap(abilities?: AbilityDefinition[]): Map<string, AbilityDefinition>;
export declare const DEFAULT_UNITS: Record<string, UnitDefinition>;
export declare const UNIT_DEFS_SIM: Record<string, UnitDefinition>;
export { DEFAULT_UNITS as UNIT_DEFS };
//# sourceMappingURL=defaultData.d.ts.map