import { UnitDefinition, AbilityDefinition } from '../types/index.js';
export declare function getUnlockedUnits(accountLevel: number): Promise<{
    units: UnitDefinition[];
    abilities: AbilityDefinition[];
}>;
export declare function getUnitBySlug(slug: string): Promise<UnitDefinition | null>;
export declare function getUnitById(id: string): Promise<UnitDefinition | null>;
export declare function validateUnitAccess(unitIds: string[], accountLevel: number): Promise<{
    valid: boolean;
    units: UnitDefinition[];
    invalidIds: string[];
}>;
//# sourceMappingURL=unitService.d.ts.map