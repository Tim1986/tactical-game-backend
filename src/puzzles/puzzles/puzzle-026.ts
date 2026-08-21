import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #26 — "The Narrow Shelf" (BLOCKED PATH, slow finisher).
 *
 * The same MOV-3 lock as #19/#21/#22, tightened by giving the job to a
 * Barbarian: three movement instead of the Rogue's four, so the box does not
 * need to be as deep. The enemy Cleric is wedged into the north-east with a
 * Wisp on the only square the Barbarian can walk to; the other two squares
 * beside it are four steps away against three.
 *
 * The Arrow reaches the Cleric for 11 and needs 18 — or kills the Wisp and
 * opens the shelf for a Whirlwind worth 20.
 *
 * Note the Barbarian's Whirlwind is safe to use here only because nothing of
 * yours ends up adjacent to it (ABL-10: every area ability hits allies too).
 * That is worth checking on any puzzle that hands a unit a self-centred blast.
 *
 * Slack: 20 against 18. Vocabulary 1. Tier-0 fate. 2v2.
 */
export const PUZZLE_026: PuzzleDefinition = {
  id: 'puzzle-026',
  title: 'Puzzle #26 — The Narrow Shelf',
  goalText: 'Defeat the enemy Cleric within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'pinning', position: { x: 4, y: 5 } },
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 4, y: 2 } },
    { id: 'targ', side: 'enemy', slug: 'cleric', specialSlug: 'heal', position: { x: 7, y: 2 }, currentHealth: 18 },
    // 10 health: the Arrow's 11 opens the shelf, Pinning Shot's 7 does not.
    { id: 'blok', side: 'enemy', slug: 'wizard', specialSlug: 'cold_snap', position: { x: 6, y: 2 }, currentHealth: 10 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'blok'],
};
