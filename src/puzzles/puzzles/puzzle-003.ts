import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #3 — "The Real Threat" (focus-fire; ignore the bait).
 *
 * The enemy Wizard (18 HP) is the target. A near-dead Rogue (8 HP) sits closer,
 * begging to be killed — and the AI, left to greedy instinct, takes that free
 * kill and leaves the Wizard standing. Your Warlock (9 unblockable) and Sorcerer
 * (9) together deal exactly 18: both must fire on the Wizard.
 *
 * Tier-0 fate (every attack lands). Vocabulary 1 (kill the right enemy).
 * Solver: 1 winning first idea, greedy fails, random 0.0%.
 */
export const PUZZLE_003: PuzzleDefinition = {
  id: 'puzzle-003',
  title: 'Puzzle #3 — The Real Threat',
  goalText: 'Defeat the enemy Wizard within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: ['hit', 'hit'],
  fateText: 'No luck today — every blow lands true. This one is pure tactics.',
  units: [
    { id: 'p1',   side: 'player', slug: 'warlock',  specialSlug: 'fear',   position: { x: 2, y: 4 } },
    { id: 'p2',   side: 'player', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 1, y: 4 } },
    { id: 'targ', side: 'enemy',  slug: 'wizard',   specialSlug: 'cold_snap', position: { x: 6, y: 4 }, currentHealth: 18 },
    { id: 'bait', side: 'enemy',  slug: 'rogue',    specialSlug: 'assassinate', position: { x: 3, y: 1 }, currentHealth: 8 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'bait'],
};
