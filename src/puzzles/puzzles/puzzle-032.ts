import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #32 — "Pay the Fate" (THREE TURNS, Tier-1).
 *
 * ⚠ DELIBERATE SPACED NEAR-CLONE of #48 (re-dressing licence, recorded with
 * #25). Same bones — one wide roll at the head of the queue, and an unblockable
 * attack that cannot pay it — on a different chassis: a Fighter's sword and
 * Concussive Blow instead of an Axeman's swing and Ground Slam.
 *
 * The Bulwark is on 21: the Wizard's 10 and the Fighter's 11, both blockable,
 * so whichever lands first goes wide unless the fate is already spent.
 *
 * Concussive Blow is 7 and UNBLOCKABLE — real, visible damage that rolls no die
 * and pays nothing. Open with it and the blast goes wide instead: 7 + 11 is 18
 * against 21.
 *
 * Swing first. It misses, it accomplishes nothing, and the queue is clean.
 *
 * ⚠ THE BULWARK'S OWN ATTACK MUST BE UNBLOCKABLE or its slot eats a roll for
 * free and the arithmetic collapses — the #38 lesson, from the enemy's side.
 *
 * Vocabulary 2. Tier-1 fate.
 */
export const PUZZLE_032: PuzzleDefinition = {
  id: 'puzzle-032',
  title: 'Puzzle #32 — Pay the Fate',
  goalText: 'Defeat the Bulwark within 3 turns',
  goal: 'eliminate_target',
  targetUnitId: 'bulwark',
  maxPlayerTurns: 3,
  rollScript: ['miss'],
  fateText: 'Fate is sealed: the FIRST blow struck in this fight goes wide, whoever throws it. Every strike after it lands.',
  units: [
    { id: 'p1', side: 'player', slug: 'fighter', specialSlug: 'concussive', position: { x: 4, y: 4 } },
    { id: 'p2', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 2, y: 2 }, cooldowns: { freeze: 99 } },
    // 21 = 10 + 11, both blockable.
    {
      id: 'bulwark', side: 'enemy', slug: 'warlock', specialSlug: 'drain',
      position: { x: 5, y: 4 }, currentHealth: 21,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { drain: 99 },
    },
  ],
  initiativeOrder: ['p1', 'p2', 'bulwark'],
};
