/**
 * campaigns/index.ts — Registry of installed campaigns.
 * Synced to mobile/engine/campaigns by sync-engine.js.
 */
import { CampaignDefinition } from './types.js';
import { lanternCampaign } from './lantern.js';
import { goblinopolisCampaign } from './goblinopolis.js';
import { moonberryCampaign } from './moonberry.js';
import { sealedDeepCampaign } from './sealeddeep.js';

// ⚠ unlitbeacon ("The Unlit Beacon") is intentionally NOT registered yet.
// Its content bugs are fixed and it SMOKES CLEAN, but every hpScaleOverride is
// still a placeholder — the 200-game battery has not run (see
// CAMPAIGN3_BALANCE_NOTES.md). This list is what the Campaign tab renders, so
// registering it ships a playable, unbalanced campaign. Add the import and the
// entry below as the LAST step of the balance pass, not before.
export const CAMPAIGNS: Record<string, CampaignDefinition> = {
  [lanternCampaign.slug]: lanternCampaign,
  [goblinopolisCampaign.slug]: goblinopolisCampaign,
  [moonberryCampaign.slug]: moonberryCampaign,
  [sealedDeepCampaign.slug]: sealedDeepCampaign,
};
