/**
 * difficultyOrdering.test.ts — a harder tier must not be EASIER.
 *
 * Found 2026-08-31 chasing the owner's "absurd HP on the baddies" in e9:
 * its medium hpScale is **4.10** while hard is 1.70 and nightmare 2.20. The
 * vanguard has 213 HP on medium and 88 on hard. Medium is, by a wide margin,
 * the hardest way to play that encounter.
 *
 * The history shows how: medium was walked 1.45 -> 2.95 -> 3.20 -> 3.70 -> 4.10
 * across four passes on 2026-08-25, each one chasing that CELL's win-rate band
 * on its own, while hard and nightmare sat untouched. Nothing anywhere compared
 * a tier to the tier above it, so the ladder could invert one nudge at a time
 * without a single check failing.
 *
 * This test is the missing invariant. The seventeen existing inversions are
 * listed explicitly rather than fixed here — they are real difficulty decisions
 * and belong to the owner's rebalance — but the list can only ever shrink: a
 * NEW inversion, or a listed one that gets fixed, both fail.
 */
import { describe, it, expect } from 'vitest';
import { CAMPAIGNS } from '../src/campaigns/index.js';

const TIERS = ['easy', 'medium', 'hard', 'nightmare'] as const;

/** Known, pre-existing inversions awaiting the rebalance. NEVER add to this. */
const KNOWN_INVERSIONS = new Set<string>([
  // EMPTIED 2026-08-31 — all seventeen repaired (PAVA pooling; unlitbeacon e9
  // special-cased to 1.45/1.55/1.70/2.20 since its medium 4.10 was walked up
  // chasing a broken measurement while hard and nightmare were sane).
  // This list must STAY empty: a new inversion fails the test outright.
]);

function inversions(): string[] {
  const out: string[] = [];
  for (const [cs, c] of Object.entries(CAMPAIGNS)) {
    for (const [id, enc] of Object.entries(c.encounters)) {
      const h = (enc as { hpScaleOverride?: Record<string, number> }).hpScaleOverride;
      if (!h) continue;
      const seq = TIERS.map((t) => h[t]);
      if (!seq.every((v, i) => i === 0 || v >= seq[i - 1])) out.push(`${cs} ${id}`);
    }
  }
  return out;
}

describe('enemy HP must not go DOWN as difficulty goes up', () => {
  it('has no inversion that is not already known', () => {
    const unexpected = inversions().filter((k) => !KNOWN_INVERSIONS.has(k));
    expect(unexpected, 'a NEW difficulty inversion was introduced').toEqual([]);
  });

  it('the known list is exact — shrink it as the rebalance fixes them', () => {
    const found = new Set(inversions());
    const stale = [...KNOWN_INVERSIONS].filter((k) => !found.has(k));
    expect(stale, 'these are fixed now — delete them from KNOWN_INVERSIONS').toEqual([]);
  });

});
