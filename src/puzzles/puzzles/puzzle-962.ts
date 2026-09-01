import type { PuzzleDefinition } from '../types.js';

/**
 * ⚠ CUT FROM THE ROTATION 2026-09-01 — still registered so old links resolve.
 *
 * It measures min win depth 0: a winning line exists that never deviates from
 * the most goal-advancing play, so the puzzle's whole insight is free. Two
 * engine facts kill this skeleton and neither is tunable from inside a puzzle:
 *   1. A unit may ACT and THEN MOVE in the same turn, so "blast, then step out
 *      of the line" costs nothing at all — there is no trade to notice.
 *   2. `goalScore` measures range in Chebyshev, where a one-tile DIAGONAL step
 *      off the row leaves the distance unchanged. The "identical damage, one
 *      tile nearer" tie-break this design rests on does not exist.
 * It passed review because the depth search was returning its Infinity
 * sentinel (printed as -1) and the gate only rejected `=== 0`.
 *
 * Do not re-author "step your own blocker aside" until the sidestep costs
 * something the goal function can see.
 */

/**
 * Puzzle #962 — "Mind the Line" (THREE TURNS).
 *
 * ⚠ DELIBERATE SPACED NEAR-CLONE of puzzle-957 (re-dressing licence, recorded with
 * #25). Same bones — the thing blocking your archer is your own unit, and both
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
export const PUZZLE_962: PuzzleDefinition = {
  id: 'puzzle-962',
  title: 'Puzzle #962 — Mind the Line',
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
