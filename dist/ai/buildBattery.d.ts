import { CampaignUnitChoice } from '../campaigns/runtime.js';
import { CampaignDifficulty, CampaignDefinition } from '../campaigns/types.js';
export interface SampledBuild {
    slugs: string[];
    choices: CampaignUnitChoice[];
    boonKeys: string[];
    label: string;
}
/** Draw one legal build: comp (max 2/class), then a loadout per unit, then the
 *  fork state. Level gates which parts exist, matching choicesForLevel. */
export declare function sampleBuild(rng: () => number, campaign: CampaignDefinition, level: number): SampledBuild;
export interface CellRow {
    campaign: string;
    encounter: string;
    difficulty: CampaignDifficulty;
    level: number;
    builds: {
        label: string;
        winRate: number;
    }[];
}
//# sourceMappingURL=buildBattery.d.ts.map