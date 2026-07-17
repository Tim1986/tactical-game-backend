/**
 * loadoutMatrix.ts — Full-matrix balance sims over the specials × passives
 * comp space (3 specials × 3 passives = 9 loadouts per class).
 *
 * The brain is loadout-transparent (specials/passives are baked into unit
 * instances at match build), so this is purely a driver over runSim's
 * p1Customizations/p2Customizations plumbing.
 *
 * Modes:
 *   duel      — intra-class round-robin: 4×C(Li) vs 4×C(Lj) for all loadout
 *               pairs of one class. Ranks loadouts within a class.
 *   reference — 4×C(L) vs a fixed classic party (default loadouts) for each
 *               of C's 9 loadouts. Measures loadout strength in a realistic
 *               cross-class matchup.
 *
 * Usage:
 *   npx tsx src/ai/loadoutMatrix.ts --mode duel      --class rogue  [--games 50]
 *   npx tsx src/ai/loadoutMatrix.ts --mode reference --class rogue  [--games 100]
 *   npx tsx src/ai/loadoutMatrix.ts --mode duel      --all          [--games 50]
 *   npx tsx src/ai/loadoutMatrix.ts --mode reference --all          [--games 100]
 */
import { UnitCustomization } from '../types/index.js';
export interface Loadout extends UnitCustomization {
    /** Short human label, e.g. "assassinate+swift". */
    label: string;
}
export declare function loadoutsFor(classSlug: string): Loadout[];
/** Default loadout = first special option + first passive option (matches teamService defaults). */
export declare function defaultLoadout(classSlug: string): Loadout;
export declare const ALL_CLASSES: string[];
/** Classic reference party used by `reference` mode (default loadouts). */
export declare const REFERENCE_PARTY: string[];
export interface LoadoutScore {
    loadout: Loadout;
    games: number;
    wins: number;
    winRate: number;
    /** Wilson 95% CI on winRate. */
    ci: [number, number];
    /** Fraction of appearances that spent the special before game end. */
    specialUsage: number;
    validationErrors: number;
}
export interface DuelMatrixResult {
    classSlug: string;
    gamesPerPair: number;
    loadouts: Loadout[];
    /** cell[i][j] = win rate of loadout i vs loadout j (i row, j col); NaN on diagonal. */
    cell: number[][];
    scores: LoadoutScore[];
    totalValidationErrors: number;
}
export declare function runDuelMatrix(classSlug: string, gamesPerPair?: number, log?: (line: string) => void): DuelMatrixResult;
export declare function escortsFor(classSlug: string): string[];
export declare function runEscortMatrix(classSlug: string, gamesPerPair?: number, log?: (line: string) => void): DuelMatrixResult;
export interface ReferenceResult {
    classSlug: string;
    gamesPerLoadout: number;
    scores: LoadoutScore[];
    totalValidationErrors: number;
}
export declare function runReferenceMatrix(classSlug: string, gamesPerLoadout?: number, log?: (line: string) => void): ReferenceResult;
export declare function printScores(title: string, scores: LoadoutScore[]): void;
export declare function printDuelCells(r: DuelMatrixResult): void;
//# sourceMappingURL=loadoutMatrix.d.ts.map