/**
 * specialCampaignScaling.test.ts — [A3] every damage special scales above the
 * anchor (owner-approved 2026-08-31: "the +30% rule sounds right, but it will
 * need to vary and everything will need to be tested").
 */
import { describe, it, expect } from 'vitest';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import {
  applyCampaignAbilityTuning, CAMPAIGN_SPECIAL_DAMAGE, DRAIN_CAMPAIGN_HEAL,
  FFH_CAMPAIGN_DAMAGE, CAMPAIGN_TUNING_MIN_LEVEL,
} from '../src/game/abilityOverrides.js';

const dmgOf = (a: { effects: readonly { type: string; value?: number }[] }): number | undefined =>
  a.effects.find((e) => e.type === 'damage' || e.type === 'lifesteal')?.value;

describe('campaign special scaling (A3)', () => {
  const base = buildAbilityMap();
  const tuned = applyCampaignAbilityTuning(buildAbilityMap(), CAMPAIGN_TUNING_MIN_LEVEL);

  it('every listed special carries its tuned value at L6', () => {
    for (const [slug, to] of Object.entries(CAMPAIGN_SPECIAL_DAMAGE)) {
      expect(dmgOf(tuned.get(slug)!), slug).toBe(to);
    }
  });

  it('every tuned value is a real increase in the +20% to +35% family', () => {
    for (const [slug, to] of Object.entries(CAMPAIGN_SPECIAL_DAMAGE)) {
      const from = dmgOf(base.get(slug)!)!;
      const pct = (to - from) / from;
      expect(pct, `${slug} ${from}->${to}`).toBeGreaterThanOrEqual(0.19);
      expect(pct, `${slug} ${from}->${to}`).toBeLessThanOrEqual(0.36);
    }
  });

  it('descriptions are rebuilt from the numbers — the picker cannot lie', () => {
    for (const [slug, to] of Object.entries(CAMPAIGN_SPECIAL_DAMAGE)) {
      const a = tuned.get(slug)!;
      expect(a.description, slug).toContain(String(to));
      const from = dmgOf(base.get(slug)!)!;
      // The OLD damage number must be gone as a standalone token unless it
      // legitimately appears elsewhere (ranges, durations) — check the exact
      // "Deals/for/Drains N" position moved instead of a blanket absence.
      expect(a.description, slug).not.toMatch(new RegExp(`(Deals|for|Drains) ${from} `));
    }
    expect(tuned.get('drain')!.description).toContain(String(DRAIN_CAMPAIGN_HEAL));
  });

  it('the anchor holds — L5 is byte-identical to arena', () => {
    const l5 = applyCampaignAbilityTuning(buildAbilityMap(), 5);
    for (const slug of Object.keys(CAMPAIGN_SPECIAL_DAMAGE)) {
      expect(dmgOf(l5.get(slug)!), slug).toBe(dmgOf(base.get(slug)!));
      expect(l5.get(slug)!.description, slug).toBe(base.get(slug)!.description);
    }
  });

  it('executes and named exceptions still take their own paths', () => {
    // assassinate scales by WINDOW, not value; ffh by its dedicated constant.
    const assn = tuned.get('assassinate')!;
    expect(dmgOf(assn)).toBe(9999);
    expect(assn.effects.some((e) => (e as { healthThresholdPercent?: number }).healthThresholdPercent === 0.25)).toBe(true);
    expect(dmgOf(tuned.get('ffh')!)).toBe(FFH_CAMPAIGN_DAMAGE);
    expect('ffh' in CAMPAIGN_SPECIAL_DAMAGE).toBe(false);
    expect('assassinate' in CAMPAIGN_SPECIAL_DAMAGE).toBe(false);
  });

  it('status-only specials are untouched — heals are a separate question', () => {
    for (const slug of ['heal', 'ward', 'purify', 'second_wind', 'fear', 'freeze', 'blizzard']) {
      expect(tuned.get(slug)!.description, slug).toBe(base.get(slug)!.description);
      expect(tuned.get(slug)!.effects, slug).toEqual(base.get(slug)!.effects);
    }
  });

  it('covers EVERY damage special — a new one cannot ship unscaled silently', () => {
    for (const [slug, a] of base) {
      if (!(a as { isSpecial?: boolean }).isSpecial) continue;
      const hasPlainDamage = a.effects.some((e) =>
        (e.type === 'damage' || e.type === 'lifesteal')
        && (e as { healthThreshold?: number }).healthThreshold === undefined);
      if (!hasPlainDamage) continue;
      const covered = slug in CAMPAIGN_SPECIAL_DAMAGE || slug === 'ffh';
      expect(covered, `${slug} deals damage but has no campaign rung`).toBe(true);
    }
  });
});
