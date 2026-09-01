import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #49 — "No Escape" (PULL COMBO).
 *
 * The target Ranger (15 HP) is out of the Fighter's reach. Shadow Grasp drags it
 * in (4 dmg + pull + root), then the Fighter steps up and finishes it off. The
 * wounded Sorcerer is the AI's free kill, so the greedy line fails.
 *
 * Tier-0 fate. Vocabulary 2 (pull + focus). Solver: 1 winning idea, greedy
 * fails, random 0.7%.
 */
export const PUZZLE_049: PuzzleDefinition = {
  id: 'puzzle-049',
  title: 'Puzzle #49 — No Escape',
  goalText: 'Defeat the enemy Ranger within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: ['hit', 'hit'],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1',   side: 'player', slug: 'warlock', specialSlug: 'grasp',       position: { x: 3, y: 3 } },
    { id: 'p2',   side: 'player', slug: 'fighter', specialSlug: 'shield_bash', position: { x: 2, y: 3 } },
    { id: 'targ', side: 'enemy',  slug: 'ranger',  specialSlug: 'longshot',    position: { x: 7, y: 3 }, currentHealth: 15 },
    { id: 'bait', side: 'enemy',  slug: 'sorcerer', specialSlug: 'ignite',     position: { x: 3, y: 6 }, currentHealth: 9 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'bait'],
};
