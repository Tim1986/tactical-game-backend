import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #10 — "One Step Closer" (REACH).
 *
 * Target Sorcerer (22 HP). Your Wizard is one tile out of Ice Blast range — step
 * up, then fire (11); the Ranger's Arrow (11) reaches from home. 11 + 11 = 22.
 * The wounded Rogue is bait.
 *
 * Tier-0 fate. Vocabulary 2. Solver: 1 winning idea, greedy fails, random 0.0%.
 */
export const PUZZLE_010: PuzzleDefinition = {
  id: 'puzzle-010',
  title: 'Puzzle #10 — One Step Closer',
  goalText: 'Defeat the enemy Sorcerer within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: ['hit', 'hit'],
  fateText: 'Steady hands: each attack this battle connects. Find the line that wins.',
  units: [
    { id: 'p1',   side: 'player', slug: 'wizard',   specialSlug: 'cold_snap',   position: { x: 1, y: 4 } },
    { id: 'p2',   side: 'player', slug: 'ranger',   specialSlug: 'pinning',     position: { x: 1, y: 3 } },
    { id: 'targ', side: 'enemy',  slug: 'sorcerer', specialSlug: 'ignite',      position: { x: 7, y: 4 }, currentHealth: 22 },
    { id: 'bait', side: 'enemy',  slug: 'rogue',    specialSlug: 'assassinate', position: { x: 3, y: 6 }, currentHealth: 8 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'bait'],
};
