import { CampaignUnitChoice, DeepGiftSlug } from '../campaigns/runtime.js';
import { CampaignDifficulty } from '../campaigns/types.js';
export declare const REPRESENTATIVE_PARTIES: Record<string, string[]>;
/**
 * [E0.4] Which Deep Gift each chassis takes by default in the sim.
 *
 * This is the sim's model of a COMPETENT player's pick — it decides what the
 * back half of a campaign is balanced against, so a bad policy means balancing
 * against a strawman. Derived from giftHarness.ts measurements (per-party mean
 * win-rate delta per gift); re-derive by re-running the harness whenever
 * DEEP_GIFTS values change. Classes absent here fall back to 'damage'.
 */
export declare const DEFAULT_GIFT_BY_CLASS: Record<string, DeepGiftSlug>;
/**
 * Per-unit choices matching the live level-up schedule (specials front-loaded):
 * L2 = main + first companion get specials; L3 = remaining two get specials
 * (all four specialed by fight 2); L4 = main + first companion get passives;
 * L5 = remaining two get passives. Defaults to each class's first option;
 * passiveOverrides (from --passives) replaces the passive picks for comparisons.
 */
export declare function choicesForLevel(partySlugs: string[], level: number, passiveOverrides?: (string | undefined)[], 
/** [E0.4] Per-unit gift override. A DeepGiftSlug forces that gift; 'none'
 *  forces NO gift even at L7+ (the harness baseline); undefined uses the
 *  measured default policy below. */
giftOverrides?: (DeepGiftSlug | 'none' | undefined)[]): CampaignUnitChoice[];
export interface CampaignCellResult {
    encounter: string;
    difficulty: CampaignDifficulty;
    party: string;
    level: number;
    games: number;
    playerWins: number;
    winRate: number;
    draws: number;
    avgTurns: number;
    inBand: boolean;
    validationErrors: number;
    /** [A8] How matches ended: "W:<reason>" / "L:<reason>" / "DRAW" → count.
     *  The mechanism check — an escort cell whose losses aren't mostly
     *  "Your charge has fallen" isn't testing the escort. */
    reasons: Record<string, number>;
    /** [A8] Draw share > 10% flags a stall (kiting/mutual-standoff signature). */
    drawFlag: boolean;
}
export declare function simEncounterCell(campaignSlug: string, encounterId: string, difficulty: CampaignDifficulty, partyName: string, partySlugs: string[], options?: {
    games?: number;
    level?: number;
    seed?: number;
    passives?: (string | undefined)[];
    /** [E0.4] Per-unit Deep Gift override; 'none' = giftless baseline. */
    gifts?: (DeepGiftSlug | 'none' | undefined)[];
    /** [E2.0] Fully-specified per-unit build, bypassing choicesForLevel
     *  entirely. The build-sampling battery uses this to fight arbitrary
     *  legal loadouts rather than the three default ones. */
    choicesOverride?: CampaignUnitChoice[];
    /** [E2.0] Boon keys the run has earned (i.e. which fork options were
     *  taken). Applied to the party by buildEncounterState. */
    boonKeys?: string[];
    /** [E2 balancing] Probe a specific enemy-HP multiplier without editing
     *  content — the calibration walk's lever. */
    hpScale?: number;
}): CampaignCellResult;
//# sourceMappingURL=campaignSim.d.ts.map