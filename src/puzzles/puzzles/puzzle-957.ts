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
 * Puzzle #957 — "Out of the Way" (THREE TURNS: the blocked line, from the other
 * side — the thing in the way is YOURS).
 *
 * Every blocked-path puzzle so far (#41, #37, #31, #19) asks the player to
 * remove an enemy from a doorway. This one asks the player to notice that the
 * obstruction is their own wizard, standing directly between the archer and the
 * target: a living unit on a true line blocks single-target line of sight
 * (ABL-8), and the archer's one Longshot is illegal while he stands there.
 *
 * The Bulwark is on 35 — two Ice Blasts and a Longshot, 10 + 10 + 15, with
 * nothing spare. The Wizard shoots first and last; the archer's single shot is
 * in between, and it only exists if the row is clear when her turn comes.
 *
 * Ice Blast reaches from where he stands and from a step aside alike, so the
 * shot itself costs nothing to relocate. Standing still is simply closer to the
 * target, which is why goal-greedy does it: identical damage, one tile nearer,
 * and the Longshot never happens.
 *
 * Cost channel (trap #15 / #22 / #24): the two options deal exactly the same
 * damage to the goal, so the tie breaks on distance — and the tie-break is the
 * trap. This is the only puzzle in the file where greedy loses to a positional
 * tie-break rather than to a bigger number.
 *
 * ⚠ THE ARCHER IS ROOTED at the end of the row, so she cannot sidestep the
 * obstruction herself — the fix has to come from the unit causing it.
 *
 * ⚠ 35 = 10 + 15 + 10 EXACTLY, and the blocked line costs precisely the
 * Longshot: the greedy line reaches 20 and stops.
 *
 * ⚠ THE BULWARK IS A WARLOCK so its own attack is unblockable — not for the
 * fate (there is none here) but so that nothing about the enemy's turn depends
 * on where anyone is standing.
 *
 * Vocabulary 2 (a body blocks a line; a shot you only get once). Tier-0 fate.
 */
export const PUZZLE_957: PuzzleDefinition = {
  id: 'puzzle-957',
  title: 'Puzzle #957 — Out of the Way',
  goalText: 'Defeat the enemy Warlock within 3 turns',
  goal: 'eliminate_target',
  targetUnitId: 'bulwark',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    // Acts first and last: 10 + 10.
    { id: 'p2', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 4, y: 4 }, cooldowns: { freeze: 99 } },
    // Rooted at the end of the row. One Longshot, and only with a clear line.
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 0, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // 35 = 10 + 15 + 10.
    {
      id: 'bulwark', side: 'enemy', slug: 'warlock', specialSlug: 'drain',
      position: { x: 7, y: 4 }, currentHealth: 35,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { drain: 99 },
    },
  ],
  initiativeOrder: ['p2', 'p1', 'bulwark'],
};
