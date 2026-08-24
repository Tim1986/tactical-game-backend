import { describe, it, expect } from 'vitest';
import { buildEncounterState } from '../src/campaigns/runtime.js';
import { unlitBeaconCampaign } from '../src/campaigns/unlitbeacon.js';
import { choicesForLevel } from '../src/ai/campaignSim.js';
import type { CampaignDifficulty } from '../src/campaigns/types.js';

/**
 * `roundByDifficulty` (owner call 2026-08-24) — a survive objective's clock is
 * its real difficulty dial, because the encounter is nearly scale-inert.
 * Resolved at BUILD time, so the engine only ever sees a plain number.
 */
const PARTY = ['fighter', 'barbarian', 'rogue', 'cleric'];

const clockFor = (d: CampaignDifficulty) => {
  const { state } = buildEncounterState(
    unlitBeaconCampaign, 'e9', PARTY, choicesForLevel(PARTY, 8), 8, d, 'h', 'e',
  );
  const win = state.objective!.win.find((w) => w.kind === 'round_reached');
  return (win as { round: number }).round;
};

describe('e9 holds for a different number of rounds per difficulty', () => {
  it('resolves the authored per-tier clock', () => {
    expect(clockFor('easy')).toBe(6);
    expect(clockFor('medium')).toBe(7);
    expect(clockFor('hard')).toBe(8);
    expect(clockFor('nightmare')).toBe(8);
  });

  it('leaves the resolved state carrying a plain number, not the map', () => {
    const { state } = buildEncounterState(
      unlitBeaconCampaign, 'e9', PARTY, choicesForLevel(PARTY, 8), 8, 'easy', 'h', 'e',
    );
    const win = state.objective!.win.find((w) => w.kind === 'round_reached')!;
    expect(win).toEqual({ kind: 'round_reached', round: 6 });
  });
});
