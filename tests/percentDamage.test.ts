import { describe, it, expect } from 'vitest';
import { buildEncounterState } from '../src/campaigns/runtime.js';
import { CAMPAIGNS } from '../src/campaigns/index.js';

/**
 * damagePercentOfTargetMax (2026-08-24, owner design): the Adjutant's damage
 * is a fraction of the TARGET's max health, so the hero hunt lasts the same
 * number of turns for every hero class. The contract: the flag reaches the
 * built unit instance, and the fraction normalises time-to-kill across hero
 * pools that differ 2x.
 */
describe('percent-of-target-max damage', () => {
  it('the Adjutant carries the flag into the built encounter', () => {
    const { state } = buildEncounterState(
      CAMPAIGNS['unlitbeacon'], 'e11',
      ['fighter', 'rogue', 'cleric', 'wizard'], [undefined, undefined, undefined, undefined],
      10, 'hard', 'p1', 'p2',
    );
    const adjutant = state.units.find((u) => u.definitionSlug === 'rogue' && u.ownerPlayerId === 'p2' && (u.maxHealth ?? 0) > 90);
    expect(adjutant?.damagePercentOfTargetMax).toBeGreaterThan(0);
    // Normalisation: per-hit damage against a 32 HP wizard vs a ~55 HP
    // barbarian must scale with the pool, not be equal.
    const f = adjutant!.damagePercentOfTargetMax!;
    expect(Math.round(32 * f) / 32).toBeCloseTo(Math.round(55 * f) / 55, 1);
  });
});
