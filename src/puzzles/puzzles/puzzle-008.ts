import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #8 — "Keep the Flame" (TEMPO — an ally heals the target).
 *
 * #22's channel with the finish moved to a line ability. The enemy Cleric acts
 * between your units and returns 27 to the Ranger, more than the Sorcerer's
 * Flame Jet can take off. Freeze the Cleric and the 16 is enough against 14.
 *
 * Geometry constraints worth copying: the Cleric is at FULL health so it values
 * its charge above itself (trap #1), and it is deliberately off the Sorcerer's
 * RANK — Flame Jet is a line ability, so the Sorcerer and the Ranger must share
 * a row for the shot to exist at all, and putting the Cleric on that row would
 * have made it collateral and changed the puzzle into something else.
 *
 * Slack: 16 against 14. Vocabulary 2. Tier-0 fate. 2v2.
 */
export const PUZZLE_008: PuzzleDefinition = {
  id: 'puzzle-008',
  title: 'Puzzle #8 — Keep the Flame',
  goalText: 'Defeat the enemy Ranger within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 3, y: 4 } },
    { id: 'p2', side: 'player', slug: 'sorcerer', specialSlug: 'flame_jet', position: { x: 2, y: 2 } },
    { id: 'targ', side: 'enemy', slug: 'ranger', specialSlug: 'longshot', position: { x: 5, y: 2 }, currentHealth: 14 },
    { id: 'mend', side: 'enemy', slug: 'cleric', specialSlug: 'heal', position: { x: 5, y: 5 } },
  ],
  initiativeOrder: ['p1', 'mend', 'p2', 'targ'],
};
