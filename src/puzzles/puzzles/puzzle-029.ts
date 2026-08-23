import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #29 — "Carried Through" (FRIENDLY FIRE, #18's channel, area weapon).
 *
 * ABL-9/ABL-10 again, but the offending weapon is the Sorcerer's Flame Jet
 * rather than a Ranger's Piercing Shot. The rank runs Sorcerer, gap, enemy
 * Warlock, your Barbarian — and Flame Jet's ray does not stop at the Warlock. It
 * carries into the Barbarian, who is on 14 and dies to its 16. The Sorcerer then
 * has both turns and finishes two short.
 *
 * Flame Blast is the answer: single-target, so it stops where you aimed it, and
 * the Barbarian lives to swing a Whirlwind worth 16.
 *
 * The Sorcerer is ROOTED for the reason #18's Ranger was: a line weapon can
 * always be angled around a friend if the shooter is free to step, and one free
 * sidestep is all goal-greedy needs (trap #14). This is the fourth puzzle to
 * lean on ROOTED as the pin — it works, but the device is getting familiar, and
 * tempo puzzles (#20/#23/#27) are the family that needs none of it.
 *
 * ⚠ RETUNED 2026-08-22 for the RING rebalance: Whirlwind fell 20 -> 16, which
 * left the intended line short of the Warlock's 28 and made the puzzle
 * unsolvable. The Warlock is now on 20. The value is bounded on BOTH sides:
 * below it the rooted Sorcerer's own two turns start finishing the job alone
 * (the goal-greedy gate), and above it the intended line stops reaching. 18-22
 * all pass; 20 sits in the middle of that window. (The random-win figure is a
 * sampled estimate and wobbles around 0-0.5% between runs — well under the 5%
 * bar either way; do not read a change there as a regression.)
 *
 * Slack: 10 + 16 against 20. Vocabulary 2. Tier-0 fate. 2v1.
 */
export const PUZZLE_029: PuzzleDefinition = {
  id: 'puzzle-029',
  title: 'Puzzle #29 — Carried Through',
  goalText: 'Defeat the enemy Warlock within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'sorcerer', specialSlug: 'flame_jet',
      position: { x: 2, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 3, stacks: 1 }],
    },
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 6, y: 4 }, currentHealth: 14 },
    { id: 'targ', side: 'enemy', slug: 'warlock', specialSlug: 'drain', position: { x: 5, y: 4 }, currentHealth: 20 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ'],
};
