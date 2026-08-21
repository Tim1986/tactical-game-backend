/**
 * buildBatterySampling.test.ts — the two sampler invariants, as regression tests.
 *
 * Both encode bugs that shipped and silently corrupted campaign balance
 * verdicts for weeks (found 2026-08-21, see REBALANCE_2026-08.md):
 *
 *  1. Parties must be FOUR DISTINCT CLASSES. The sampler used the arena's
 *     "max 2 per class" rule, so 57% of drawn parties could not exist in a
 *     campaign — and the illegal duplicate-class comps are the strongest in
 *     the game (AC_REWORK pass 8), so they dragged every distribution.
 *  2. A cell may only hand out boons the player could ALREADY have earned.
 *     The sampler applied the campaign's whole boon set to every encounter,
 *     worth ~30 points on an L1 cell (`startShielded: 'all'`).
 *
 * These are cheap, content-driven checks: they run over every registered
 * campaign, so a new campaign gets covered for free.
 */
import { describe, it, expect } from 'vitest';
import { sampleBuild, boonChoicesBefore } from '../src/ai/buildBattery.js';
import { makeRng } from '../src/ai/simHarness.js';
import { CAMPAIGNS } from '../src/campaigns/index.js';
import { CampaignNode } from '../src/campaigns/types.js';

const campaigns = Object.entries(CAMPAIGNS);

describe('sampled parties are legal campaign parties', () => {
  it('has campaigns registered', () => expect(campaigns.length).toBeGreaterThan(0));

  it.each(campaigns)('%s: every sampled party is 4 distinct classes', (slug, campaign) => {
    const encounters = Object.keys(campaign.encounters);
    const rng = makeRng(20260821);
    for (let i = 0; i < 400; i++) {
      const enc = encounters[i % encounters.length];
      const b = sampleBuild(rng, campaign, campaign.encounters[enc].level, enc);
      expect(b.slugs).toHaveLength(4);
      expect(new Set(b.slugs).size, `${slug}/${enc}: duplicate class in ${b.slugs.join('+')}`).toBe(4);
    }
  });
});

describe('sampled boons are only ones the player could have earned', () => {
  /** Encounters in story order, by walking the node graph from startNode. */
  const encounterOrder = (campaign: (typeof CAMPAIGNS)[string]): string[] => {
    const out: string[] = [];
    const seen = new Set<string>();
    let id: string | undefined = campaign.startNode;
    while (id && !seen.has(id)) {
      seen.add(id);
      const n: CampaignNode | undefined = campaign.nodes[id];
      if (!n) break;
      if (n.kind === 'encounter') out.push(n.encounter);
      // Follow the first branch: forks reconverge, so any path visits the same
      // encounters in the same order.
      id = n.kind === 'end' ? undefined : n.kind === 'choice' ? n.choices[0]?.next : n.next;
    }
    return out;
  };

  it.each(campaigns)('%s: boon count never decreases along the story', (slug, campaign) => {
    const order = encounterOrder(campaign);
    expect(order.length, `${slug}: walked no encounters`).toBeGreaterThan(0);
    let prev = -1;
    for (const enc of order) {
      const n = boonChoicesBefore(campaign, enc).length;
      expect(n, `${slug}/${enc}: boon count went backwards (${prev} -> ${n})`).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });

  it.each(campaigns)('%s: the first encounter carries no boons at all', (slug, campaign) => {
    const first = encounterOrder(campaign)[0];
    expect(boonChoicesBefore(campaign, first), `${slug}/${first} starts with boons`).toEqual([]);
  });

  it.each(campaigns)('%s: sampled boonKeys stay within what is reachable', (slug, campaign) => {
    const rng = makeRng(7);
    for (const enc of Object.keys(campaign.encounters)) {
      const reachable = boonChoicesBefore(campaign, enc);
      const legal = new Set(reachable.flat());
      const b = sampleBuild(rng, campaign, campaign.encounters[enc].level, enc);
      expect(b.boonKeys).toHaveLength(reachable.length); // exactly one per passed fork
      for (const k of b.boonKeys) {
        expect(legal.has(k), `${slug}/${enc}: unearned boon "${k}"`).toBe(true);
        expect(campaign.boons?.[k], `${slug}/${enc}: boon "${k}" is not defined`).toBeTruthy();
      }
    }
  });

  it('catches the exact unlitbeacon e1 case that exposed the bug', () => {
    // e1 is the tutorial fight, long before either fork. The old sampler gave
    // it keepers_oilskins + battlefield_arms and read 88% instead of 43%.
    expect(boonChoicesBefore(CAMPAIGNS['unlitbeacon'], 'e1')).toEqual([]);
  });
});
