import { describe, it, expect } from 'vitest';
import { calculateElo, calculateLevel, calculateXpGain } from '../src/services/eloService.js';

describe('calculateElo', () => {
  it('winner gains, loser loses', () => { const r = calculateElo(1200, 1200); expect(r.winnerDelta).toBeGreaterThan(0); expect(r.loserDelta).toBeLessThan(0); });
  it('upsets yield bigger gains', () => { const upset = calculateElo(1000, 1400); const expected = calculateElo(1400, 1000); expect(upset.winnerDelta).toBeGreaterThan(expected.winnerDelta); });
  it('Elo floor is 100', () => { const r = calculateElo(2000, 100); expect(r.newLoserElo).toBeGreaterThanOrEqual(100); });
});

describe('calculateLevel', () => {
  it('starts at 1 with 0 XP', () => { expect(calculateLevel(0)).toBe(1); });
  it('levels at 200 XP intervals', () => { expect(calculateLevel(200)).toBe(2); expect(calculateLevel(400)).toBe(3); });
});

describe('calculateXpGain', () => {
  it('winner gets more XP', () => { expect(calculateXpGain(true)).toBeGreaterThan(calculateXpGain(false)); });
});
