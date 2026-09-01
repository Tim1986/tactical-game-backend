import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #906 — "Two Bows, One Mark" (focus-fire).
 *
 * Target: enemy Fighter (22 HP, the toughest class). Two Rangers (Arrow 11 or
 * Longshot 12) together clear it; the wounded Rogue (9 HP) is the bait kill.
 *
 * Tier-0 fate. Vocabulary 1. Solver: 2 ideas, greedy fails, random 0.0%.
 */
export const PUZZLE_906: PuzzleDefinition = {
  id: 'puzzle-906',
  title: 'Puzzle #906 — Two Bows, One Mark',
  goalText: 'Defeat the enemy Fighter within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: ['hit', 'hit'],
  fateText: 'Steady hands: each attack this battle connects. Find the line that wins.',
  units: [
    { id: 'p1',   side: 'player', slug: 'ranger',  specialSlug: 'longshot', position: { x: 1, y: 4 } },
    { id: 'p2',   side: 'player', slug: 'ranger',  specialSlug: 'piercing', position: { x: 1, y: 5 } },
    { id: 'targ', side: 'enemy',  slug: 'fighter', specialSlug: 'shield_bash', position: { x: 6, y: 4 }, currentHealth: 22 },
    { id: 'bait', side: 'enemy',  slug: 'rogue',   specialSlug: 'assassinate', position: { x: 3, y: 2 }, currentHealth: 9 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'bait'],
};
