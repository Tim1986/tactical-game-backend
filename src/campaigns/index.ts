/**
 * campaigns/index.ts — Registry of installed campaigns.
 * Synced to mobile/engine/campaigns by sync-engine.js.
 */
import { CampaignDefinition } from './types.js';
import { lanternCampaign } from './lantern.js';
import { goblinopolisCampaign } from './goblinopolis.js';
import { moonberryCampaign } from './moonberry.js';
import { sealedDeepCampaign } from './sealeddeep.js';

export const CAMPAIGNS: Record<string, CampaignDefinition> = {
  [lanternCampaign.slug]: lanternCampaign,
  [goblinopolisCampaign.slug]: goblinopolisCampaign,
  [moonberryCampaign.slug]: moonberryCampaign,
  [sealedDeepCampaign.slug]: sealedDeepCampaign,
};
