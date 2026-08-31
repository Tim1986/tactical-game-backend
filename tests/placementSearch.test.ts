import { describe, it, expect } from 'vitest';
import { permutations, describeOpening, searchPlacements } from '../src/ai/placementSearch.js';

describe('permutations', () => {
  it('is exhaustive and duplicate-free', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const p = permutations(n);
      const fact = Array.from({ length: n }, (_, i) => i + 1).reduce((a, b) => a * b, 1);
      expect(p.length).toBe(fact);
      expect(new Set(p.map((x) => x.join(','))).size).toBe(fact);
      for (const one of p) expect([...one].sort()).toEqual([...Array(n).keys()]);
    }
  });

  it('is deterministic — a re-run sweeps the openings in the same order', () => {
    expect(permutations(4)).toEqual(permutations(4));
  });
});

describe('describeOpening', () => {
  const tiles = [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }];
  const enemies = [{ x: 6, y: 3 }];

  it('names the party front-to-back', () => {
    // slot0 -> tile2 (front), slot1 -> tile3 (front), slot2 -> tile0, slot3 -> tile1
    const s = describeOpening(['fighter', 'rogue', 'wizard', 'cleric'], [2, 3, 0, 1], tiles, enemies);
    expect(s.split('>').slice(0, 2).sort()).toEqual(['fighter', 'rogue']);
    expect(s.split('>').slice(2).sort()).toEqual(['cleric', 'wizard']);
  });
});

describe('searchPlacements (integration, small games count)', () => {
  it('reports a real range and locates both known openings inside it', () => {
    const r = searchPlacements('unlitbeacon', 'e1', 'medium', 'custom',
      ['barbarian', 'sorcerer', 'warlock', 'rogue'], 6);
    expect(r.openings.length).toBe(24);
    expect(r.best.winRate).toBeGreaterThanOrEqual(r.worst.winRate);
    expect(r.spread).toBeCloseTo(r.best.winRate - r.worst.winRate, 10);
    // The two openings the sims have used must be findable in the sweep, and
    // their ranks must be real positions within it.
    for (const k of [r.frontline, r.slotOrder]) {
      expect(k.rank).toBeGreaterThanOrEqual(1);
      expect(k.rank).toBeLessThanOrEqual(24);
      expect(k.winRate).toBeLessThanOrEqual(r.best.winRate);
      expect(k.winRate).toBeGreaterThanOrEqual(r.worst.winRate);
    }
    expect(r.median).toBeLessThanOrEqual(r.best.winRate);
    expect(r.median).toBeGreaterThanOrEqual(r.worst.winRate);
  });

  it('is deterministic — the same sweep twice gives the same ranking', () => {
    const p = ['barbarian', 'sorcerer', 'warlock', 'rogue'];
    const a = searchPlacements('unlitbeacon', 'e1', 'medium', 'custom', p, 4);
    const b = searchPlacements('unlitbeacon', 'e1', 'medium', 'custom', p, 4);
    expect(b.openings.map((o) => o.order.join(''))).toEqual(a.openings.map((o) => o.order.join('')));
    expect(b.best.winRate).toBe(a.best.winRate);
  });
});
