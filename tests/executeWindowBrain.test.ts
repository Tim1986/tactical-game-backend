import { describe, it, expect } from 'vitest';
import { executeWindow } from '../src/ai/aiBrain';
import type { UnitInstance } from '../src/types/matchState';

const target = (maxHealth: number) => ({ maxHealth } as UnitInstance);

describe('executeWindow — brain must mirror the engine', () => {
  it('takes the flat threshold when no percent is present (arena assassinate)', () => {
    expect(executeWindow({ healthThreshold: 22 }, target(60))).toBe(22);
  });

  it('takes the PERCENT when it is higher — the campaign case the brain used to miss', () => {
    // The Adjutant at e11 hard: 100 base x 3.20 scale = 320 max HP.
    // Engine executes at or below 25% = 80. The brain used to think 22.
    expect(executeWindow({ healthThreshold: 22, healthThresholdPercent: 0.25 }, target(320))).toBe(80);
  });

  it('still takes the flat threshold when the percent is smaller (small enemies)', () => {
    // 25% of 60 = 15, below the flat 22 — the flat floor must win, or the
    // campaign tuning would make assassinate WORSE against weak targets.
    expect(executeWindow({ healthThreshold: 22, healthThresholdPercent: 0.25 }, target(60))).toBe(22);
  });

  it('handles a percent-only effect', () => {
    expect(executeWindow({ healthThresholdPercent: 0.25 }, target(320))).toBe(80);
  });
});
