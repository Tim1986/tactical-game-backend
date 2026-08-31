/**
 * balancePanels.ts — FIXED, versioned build panels for campaign balance.
 *
 * The whole point is calibratability: the owner turns sim numbers into human
 * difficulty ("60% here = harder end of medium"), and that mapping only holds
 * if the measuring stick never changes. These panels are the stick. Change a
 * panel and every number measured with it goes stale — bump PANEL_VERSION and
 * say so in the run artifacts.
 *
 * Two tiers, two questions:
 *   NORMIE  — "is medium manageable for a sensible non-optimizer?" First-listed
 *             options everywhere, intuitive comps, story-driven boon picks.
 *   SEEDS   — starting points for buildSearch's ascent (NOT an answer by
 *             themselves). Curated for coverage: every class appears, every
 *             archetype from referenceParties.json is represented.
 */
import type { CampaignUnitChoice, DeepGiftSlug } from '../campaigns/runtime.js';
import type { CampaignDefinition } from '../campaigns/types.js';
import { boonChoicesBefore } from './buildBattery.js';

export const PANEL_VERSION = 1;

export interface UnitBuild { slug: string; special: string; passive: string; gift: DeepGiftSlug }
export interface Build { name: string; units: UnitBuild[]; boons: string[] }

export const U = (slug: string, special: string, passive: string, gift: DeepGiftSlug): UnitBuild =>
  ({ slug, special, passive, gift });

/** Level-gate a full build exactly as choicesForLevel gates defaults:
 *  main + first companion at L2/L4/L7, the rest at L3/L5/L8. */
export function choicesAt(level: number, units: UnitBuild[]): CampaignUnitChoice[] {
  return units.map((u, i) => {
    const early = i <= 1;
    return {
      specialSlug: level >= (early ? 2 : 3) ? u.special : undefined,
      passiveSlug: level >= (early ? 4 : 5) ? u.passive : undefined,
      deepGiftSlug: level >= (early ? 7 : 8) ? u.gift : undefined,
    };
  });
}

/** The boons this build has AT this encounter — only forks the player has
 *  already passed count. Passing a build's full boon list to an early
 *  encounter is the exact +30pt inflation bug buildBattery fixed 2026-08-21;
 *  every tool routes through here so it cannot recur. */
export function boonsFor(campaign: CampaignDefinition, encounterId: string, chosen: string[]): string[] {
  const forks = boonChoicesBefore(campaign, encounterId);
  return chosen.filter((k) => forks.some((f) => f.includes(k)));
}

/** NORMIE panel — what a reasonable player who reads nothing twice builds.
 *  First-listed special+passive per class, gift = the obvious flavor pick,
 *  boons = the first-listed / most story-appealing option at each fork.
 *  Boon slots are per-campaign, so normie boons are resolved at run time:
 *  "take the FIRST option at every fork". */
export const NORMIE_COMPS: { name: string; slugs: string[] }[] = [
  { name: 'N1 F/Rng/Cl/Wz', slugs: ['fighter', 'ranger', 'cleric', 'wizard'] },
  { name: 'N2 F/B/Rng/Cl',  slugs: ['fighter', 'barbarian', 'ranger', 'cleric'] },
  { name: 'N3 F/B/Rog/Rng', slugs: ['fighter', 'barbarian', 'rogue', 'ranger'] },
  { name: 'N4 F/Cl/Wz/So',  slugs: ['fighter', 'cleric', 'wizard', 'sorcerer'] },
  { name: 'N5 B/Rog/Wl/Cl', slugs: ['barbarian', 'rogue', 'warlock', 'cleric'] },
  { name: 'N6 Rng/Wz/So/Wl', slugs: ['ranger', 'wizard', 'sorcerer', 'warlock'] },
];

/** ARCHETYPE SEEDS for buildSearch — informed picks, all 8 classes covered.
 *  These are starting points; the ascent owns the final answer. */
export const ARCHETYPE_SEEDS: Build[] = [
  { name: 'ice-wall',   boons: [], units: [U('fighter', 'concussive', 'undying', 'armor'), U('wizard', 'blizzard', 'stalwart', 'damage'), U('ranger', 'pinning', 'opportunist', 'damage'), U('cleric', 'heal', 'undying', 'armor')] },
  { name: 'classic+',   boons: [], units: [U('fighter', 'concussive', 'undying', 'armor'), U('barbarian', 'whirlwind', 'thorns', 'armor'), U('ranger', 'pinning', 'opportunist', 'damage'), U('cleric', 'heal', 'undying', 'armor')] },
  { name: 'bruisers+',  boons: [], units: [U('fighter', 'concussive', 'undying', 'armor'), U('fighter', 'shield_bash', 'thorns', 'armor'), U('barbarian', 'whirlwind', 'thorns', 'armor'), U('cleric', 'heal', 'warded', 'armor')] },
  { name: 'spellstorm', boons: [], units: [U('sorcerer', 'ignite', 'undying', 'damage'), U('sorcerer', 'flame_jet', 'opportunist', 'damage'), U('warlock', 'drain', 'siphon', 'armor'), U('cleric', 'heal', 'warded', 'armor')] },
  { name: 'grasp-spin', boons: [], units: [U('warlock', 'grasp', 'stalwart', 'armor'), U('barbarian', 'whirlwind', 'thorns', 'armor'), U('barbarian', 'shockwave', 'thorns', 'armor'), U('cleric', 'heal', 'warded', 'armor')] },
  { name: 'blade-rush', boons: [], units: [U('rogue', 'expose', 'opportunist', 'damage'), U('rogue', 'assassinate', 'swift', 'damage'), U('sorcerer', 'ignite', 'undying', 'damage'), U('cleric', 'heal', 'undying', 'armor')] },
  { name: 'wardens',    boons: [], units: [U('cleric', 'purify', 'stalwart', 'armor'), U('wizard', 'freeze', 'stalwart', 'damage'), U('fighter', 'shield_bash', 'undying', 'armor'), U('ranger', 'longshot', 'thorns', 'damage')] },
  { name: 'skirmish',   boons: [], units: [U('ranger', 'pinning', 'opportunist', 'damage'), U('rogue', 'dagger_toss', 'swift', 'movement'), U('wizard', 'cold_snap', 'opportunist', 'damage'), U('cleric', 'heal', 'undying', 'armor')] },
];
