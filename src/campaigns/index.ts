/**
 * campaigns/index.ts — Registry of installed campaigns.
 * Synced to mobile/engine/campaigns by sync-engine.js.
 */
import { CampaignDefinition } from './types.js';
import { lanternCampaign } from './lantern.js';

export const CAMPAIGNS: Record<string, CampaignDefinition> = {
  [lanternCampaign.slug]: lanternCampaign,
};
