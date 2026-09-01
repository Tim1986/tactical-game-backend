import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #62 — "Mind the Line" (THREE TURNS).
 *
 * ⚠ DELIBERATE SPACED NEAR-CLONE of #57 (re-dressing licence, recorded with
 * #54). Same bones — the thing blocking your archer is your own unit, and both
 * of its options deal identical damage so the tie breaks on distance — on a
 * different chassis: a Sorcerer's bolt instead of a Wizard's blast.
 *
 * The Bulwark is on 35: two bolts and a Longshot, 10 + 15 + 10. The Sorcerer
 * shoots first and last; the archer's single shot is in between and exists only
 * if the row is clear when her turn comes.
 *
 * A bolt reaches from where he stands and from a step aside alike, so moving
 * costs nothing — except that standing still is one tile nearer, which is
 * exactly why goal-greedy stays, and staying is what blocks the Longshot
 * (ABL-8).
 *
 * Vocabulary 2. Tier-0 fate.
 */
export const PUZZLE_062: PuzzleDefinition = {
  id: 'puzzle-062',
  title: 'Puzzle #62 — Mind the Line',
  goalText: 'Defeat the Bulwark within 3 turns',
  goal: 'eliminate_target',
  targetUnitId: 'bulwark',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p2', side: 'player', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 4, y: 4 }, cooldowns: { ignite: 99 } },
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 0, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    {
      id: 'bulwark', side: 'enemy', slug: 'warlock', specialSlug: 'drain',
      position: { x: 7, y: 4 }, currentHealth: 35,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { drain: 99 },
    },
  ],
  initiativeOrder: ['p2', 'p1', 'bulwark'],
};
