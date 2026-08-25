import { describe, it, expect } from 'vitest';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import { applyCampaignAbilityTuning } from '../src/game/abilityOverrides.js';

/** Gate 1's engine edits must be INERT in arena. Arena units carry no
 *  basicDamageBonus and no healthThresholdPercent, so both new code paths
 *  must reduce to their pre-change behaviour exactly. */
describe('Gate 1 engine edits are inert outside campaign', () => {
  it('assassinate keeps its flat 22 threshold with no percent set', () => {
    const m = buildAbilityMap();
    const e = m.get('assassinate')!.effects.find((x: { healthThreshold?: number }) => x.healthThreshold !== undefined) as { healthThreshold: number; healthThresholdPercent?: number };
    expect(e.healthThreshold).toBe(22);
    expect(e.healthThresholdPercent).toBeUndefined();
    // max(22, round(0 * anything)) === 22
    expect(Math.max(e.healthThreshold, Math.round((e.healthThresholdPercent ?? 0) * 999))).toBe(22);
  });
  it('tuning at arena levels returns the identical map object', () => {
    const m = buildAbilityMap();
    expect(applyCampaignAbilityTuning(m, 5)).toBe(m);
  });
});
