import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #21 — "Shut the Gate" (BLOCKED PATH, #19's channel on a new axis).
 *
 * MOV-3: enemies block movement completely. The enemy Ranger is backed into the
 * south edge with a Wisp holding the one square in front of it. Your Rogue has
 * 16 and needs 14, and cannot get there: the two remaining squares beside the
 * Ranger are five steps around the Wisp against four movement. The Sorcerer's
 * Flame Blast can reach the Ranger for 10 — four short — or kill the Wisp, which
 * scores nothing and opens the road.
 *
 * Runs north-south where #19 ran east-west, and swaps who holds the door: there
 * the opener was a Ranger's basic Arrow, here a Sorcerer's Flame Blast, with the
 * Wisp tuned to 9 so exactly one shot opens it (Ignite's 5 does not).
 *
 * Ignite is the Sorcerer's special ON PURPOSE. Flame Jet would put 16 on the
 * Ranger and simply win, which is the whole reason the loadout is not free
 * choice here — see trap #14 on enumerating a trapped action's alternatives.
 *
 * Slack: 16 against 14. Vocabulary 1. Tier-0 fate. 2v2.
 */
export const PUZZLE_021: PuzzleDefinition = {
  id: 'puzzle-021',
  title: 'Puzzle #21 — Shut the Gate',
  goalText: 'Defeat the enemy Ranger within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    // Off the column, so line of sight to the Ranger is never blocked by the Wisp.
    { id: 'p1', side: 'player', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 6, y: 4 } },
    { id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'expose', position: { x: 4, y: 3 } },
    { id: 'targ', side: 'enemy', slug: 'ranger', specialSlug: 'longshot', position: { x: 4, y: 7 }, currentHealth: 14 },
    // 9 health: Flame Blast's 10 opens the gate, Ignite's 5 does not.
    { id: 'blok', side: 'enemy', slug: 'wizard', specialSlug: 'cold_snap', position: { x: 4, y: 6 }, currentHealth: 9 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'blok'],
};
