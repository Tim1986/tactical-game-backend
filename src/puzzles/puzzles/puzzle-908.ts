import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #908 — "Close the Distance" (REACH — a distinct lesson).
 *
 * Target Wizard (21 HP) is at the far edge. Your Sorcerer's Flame Blast can't
 * reach from where it stands — step forward one tile first, THEN fire (9), while
 * the Ranger's Longshot (12) reaches from home. 9 + 12 = 21. The wounded Rogue
 * is bait the AI takes.
 *
 * Tier-0 fate. Vocabulary 2 (positioning + focus). Solver: 2 ideas, greedy
 * fails, random 0.7%.
 */
export const PUZZLE_908: PuzzleDefinition = {
  id: 'puzzle-908',
  title: 'Puzzle #908 — Close the Distance',
  goalText: 'Defeat the enemy Wizard within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: ['hit', 'hit'],
  fateText: 'Fate is quiet: every attack in this battle will hit. Only your choices decide it.',
  units: [
    { id: 'p1',   side: 'player', slug: 'sorcerer', specialSlug: 'ignite',      position: { x: 1, y: 1 } },
    { id: 'p2',   side: 'player', slug: 'ranger',   specialSlug: 'longshot',    position: { x: 1, y: 2 } },
    { id: 'targ', side: 'enemy',  slug: 'wizard',   specialSlug: 'cold_snap',   position: { x: 7, y: 1 }, currentHealth: 21 },
    { id: 'bait', side: 'enemy',  slug: 'rogue',    specialSlug: 'assassinate', position: { x: 3, y: 4 }, currentHealth: 8 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'bait'],
};
