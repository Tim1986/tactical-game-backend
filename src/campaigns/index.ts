/**
 * campaigns/index.ts — Registry of installed campaigns.
 * Synced to mobile/engine/campaigns by sync-engine.js.
 */
import { CampaignDefinition } from './types.js';
import { lanternCampaign } from './lantern.js';
import { goblinopolisCampaign } from './goblinopolis.js';
import { moonberryCampaign } from './moonberry.js';
import { sealedDeepCampaign } from './sealeddeep.js';
import { unlitBeaconCampaign } from './unlitbeacon.js';

export const CAMPAIGNS: Record<string, CampaignDefinition> = {
  [lanternCampaign.slug]: lanternCampaign,
  [goblinopolisCampaign.slug]: goblinopolisCampaign,
  [moonberryCampaign.slug]: moonberryCampaign,
  [sealedDeepCampaign.slug]: sealedDeepCampaign,
  [unlitBeaconCampaign.slug]: unlitBeaconCampaign,
};

/**
 * Campaigns the CLIENT offers on the shelf.
 *
 * ⚠ SEPARATE FROM `CAMPAIGNS` ON PURPOSE. The registry above must stay
 * COMPLETE — the balance harnesses (buildBattery, campaignSim, calibrate)
 * enumerate it, and the remaining Stage-2 walks for the other four campaigns
 * are impossible if they vanish from it. Hiding a campaign is a SHELF
 * decision, not a registry decision.
 *
 * Owner call 2026-08-25: only The Unlit Beacon is balanced end to end
 * (certified on two independent 150-build batteries). The other four are
 * pre-curve — their L6+ rows were tuned against a party without
 * CAMPAIGN_GROWTH and read as far too easy — so they are hidden until their
 * §4 walks certify. Re-add each slug HERE as it passes, not before.
 */
export const SHELF_CAMPAIGN_SLUGS: readonly string[] = [
  unlitBeaconCampaign.slug,
];

/** Campaigns to show on the shelf, in registry order. */
export const shelfCampaigns = (): CampaignDefinition[] =>
  SHELF_CAMPAIGN_SLUGS.map((slug) => CAMPAIGNS[slug]).filter(Boolean);

/** True if a slug is currently offered. In-progress runs of a HIDDEN campaign
 *  still resolve through `CAMPAIGNS`, so an existing save is never bricked —
 *  it simply cannot be started fresh. */
export const isShelfCampaign = (slug: string): boolean =>
  SHELF_CAMPAIGN_SLUGS.includes(slug);
