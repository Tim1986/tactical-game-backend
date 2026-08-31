import { describe, it, expect } from 'vitest';
import { buildEncounterState } from '../src/campaigns/runtime.js';
import { CAMPAIGNS } from '../src/campaigns/index.js';
import type { CampaignDifficulty } from '../src/campaigns/types.js';

/**
 * Difficulty-scoped waves (types.ts WaveSpec.difficulties) — the second
 * per-tier dial, added 2026-08-24 for Unlit Beacon e6, whose escape objective
 * is hpScale-inert. The contract under test: a scoped wave EXISTS on its
 * listed difficulties and has NO runtime footprint on the others.
 */
describe('difficulty-scoped waves', () => {
  const pendingWaveCount = (difficulty: CampaignDifficulty): number => {
    const st = buildEncounterState(
      CAMPAIGNS['unlitbeacon'], 'e6',
      ['fighter', 'rogue', 'cleric', 'wizard'], [undefined, undefined, undefined, undefined],
      5, difficulty, 'p1', 'p2',
    );
    // buildEncounterState returns { state, unitNames, ... } — the pending
    // waves live on the STATE.
    const state = (st as unknown as { state: { encounterProgress?: { waves: unknown[] } } }).state;
    return state.encounterProgress?.waves.length ?? 0;
  };

  it('e6 doses extra waves by tier: medium +1, hard +1, nightmare +3', () => {
    // [TUNE-POST 2026-08-31] The dosing changed twice in the balance pass:
    // medium gained one wisp (owner: "feels too easy for medium", and the
    // encounter is hpScale-inert so the wisp IS the medium lever), and hard
    // dropped to one after the 4-exit narrowing + press stacked it into a
    // 3% wall. The LADDER of pressure is the invariant, not the exact dose.
    const easy = pendingWaveCount('easy');
    expect(pendingWaveCount('medium')).toBe(easy + 1);
    expect(pendingWaveCount('hard')).toBe(easy + 1);
    expect(pendingWaveCount('nightmare')).toBe(easy + 3);
  });

  it('unscoped waves are untouched on every difficulty', () => {
    // e6's original round-4 wave has no difficulties field — it must appear
    // everywhere, so even easy has at least one pending wave.
    expect(pendingWaveCount('easy')).toBeGreaterThanOrEqual(1);
  });
});
