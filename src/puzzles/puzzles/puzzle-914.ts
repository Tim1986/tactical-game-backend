import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #914 — "Eyes on the Prize" (focus-fire).
 *
 * Target enemy Warlock (18 HP). Two Sorcerers (Flame Blast 9 each = 18) must
 * both burn the Warlock down; the wounded Wizard (9 HP) is bait the AI takes.
 *
 * Tier-0 fate. Vocabulary 1. Solver: 2 ideas, greedy fails, random 0.8%.
 */
export const PUZZLE_914: PuzzleDefinition = {
  id: 'puzzle-914',
  title: 'Puzzle #914 — Eyes on the Prize',
  goalText: 'Defeat the enemy Warlock within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: ['hit', 'hit'],
  fateText: 'Steady hands: each attack this battle connects. Find the line that wins.',
  units: [
    { id: 'p1',   side: 'player', slug: 'sorcerer', specialSlug: 'ignite',    position: { x: 1, y: 4 } },
    { id: 'p2',   side: 'player', slug: 'sorcerer', specialSlug: 'flame_jet', position: { x: 1, y: 3 } },
    { id: 'targ', side: 'enemy',  slug: 'warlock',  specialSlug: 'fear',      position: { x: 6, y: 4 }, currentHealth: 18 },
    { id: 'bait', side: 'enemy',  slug: 'wizard',   specialSlug: 'cold_snap', position: { x: 3, y: 1 }, currentHealth: 9 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'bait'],
};
