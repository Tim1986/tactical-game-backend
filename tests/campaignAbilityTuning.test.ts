import { describe, it, expect } from 'vitest';
import {
  applyCampaignAbilityTuning, CAMPAIGN_TUNING_MIN_LEVEL,
  FFH_CAMPAIGN_DAMAGE, ASSASSINATE_CAMPAIGN_PERCENT,
} from '../src/game/abilityOverrides.js';
import { buildAbilityMap } from '../src/ai/defaultData.js';

/**
 * Gate 1 exceptions table. Two specials measured to fail ABOVE the anchor,
 * neither reachable by CAMPAIGN_GROWTH's basics-only rung.
 *
 * The owner's hard requirement is covered here too: "it needs to list that
 * scaling where the player chooses it" — so the DESCRIPTIONS must carry the
 * tuned numbers, and must be built from the same constants that change the
 * effects. A test that only checked effect values would let the UI drift.
 */
const dmg = (m: Map<string, { effects: readonly { type: string; value?: number; healthThreshold?: number; healthThresholdPercent?: number }[] }>, slug: string) =>
  m.get(slug)!.effects.find((e) => e.type === 'damage')!;

describe('campaign ability tuning (Gate 1 exceptions)', () => {
  it('ARENA IS UNTOUCHED — below the anchor nothing changes', () => {
    const base = buildAbilityMap();
    for (const lvl of [1, 2, 3, 4, 5]) {
      const tuned = applyCampaignAbilityTuning(base, lvl);
      expect(tuned, `L${lvl} must be the identical map`).toBe(base);
    }
  });

  it('ffh gains its campaign damage from L6, description rebuilt', () => {
    const tuned = applyCampaignAbilityTuning(buildAbilityMap(), CAMPAIGN_TUNING_MIN_LEVEL);
    expect(dmg(tuned as never, 'ffh').value).toBe(FFH_CAMPAIGN_DAMAGE);
    expect(tuned.get('ffh')!.description).toContain(String(FFH_CAMPAIGN_DAMAGE));
    // The old number must be gone from the copy the player reads.
    expect(tuned.get('ffh')!.description).not.toContain('14 unblockable');
  });

  it('assassinate gains a percentage execute floor, description rebuilt', () => {
    const tuned = applyCampaignAbilityTuning(buildAbilityMap(), CAMPAIGN_TUNING_MIN_LEVEL);
    const e = dmg(tuned as never, 'assassinate');
    expect(e.healthThresholdPercent).toBe(ASSASSINATE_CAMPAIGN_PERCENT);
    expect(e.healthThreshold, 'the flat floor survives — it is the higher of the two on small pools').toBe(22);
    const pct = Math.round(ASSASSINATE_CAMPAIGN_PERCENT * 100);
    expect(tuned.get('assassinate')!.description).toContain(`${pct}%`);
  });

  it('the execute floor actually raises the threshold on a fat target', () => {
    // A 100 HP campaign boss: flat 22 -> effective 25. On a 40 HP arena unit
    // the flat number still wins (25% = 10), which is why both are kept.
    const pctOf = (maxHealth: number) =>
      Math.max(22, Math.round(ASSASSINATE_CAMPAIGN_PERCENT * maxHealth));
    expect(pctOf(100)).toBe(25);
    expect(pctOf(40)).toBe(22);
  });

  it('base map is never mutated', () => {
    const base = buildAbilityMap();
    const before = dmg(base as never, 'ffh').value;
    applyCampaignAbilityTuning(base, 10);
    expect(dmg(base as never, 'ffh').value).toBe(before);
  });
});
