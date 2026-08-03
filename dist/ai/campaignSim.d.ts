import { CampaignDifficulty } from '../campaigns/types.js';
export declare const REPRESENTATIVE_PARTIES: Record<string, string[]>;
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
}
export declare function simEncounterCell(campaignSlug: string, encounterId: string, difficulty: CampaignDifficulty, partyName: string, partySlugs: string[], options?: {
    games?: number;
    level?: number;
    seed?: number;
    passives?: (string | undefined)[];
}): CampaignCellResult;
//# sourceMappingURL=campaignSim.d.ts.map