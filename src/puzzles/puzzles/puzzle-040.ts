import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #40 — "Which Bow" (PICKER-FIRST on the blocked-path lesson).
 *
 * The Ranger commits to one bow before anything moves, and the Wisp holding the
 * doorway is on 13. Longshot's 15 opens it. Piercing Shot's 12 falls one short —
 * the near-miss engineered into a decoy — and Pinning Shot's 7 is not close. The
 * Arrow the Ranger carries anyway is 11, also short. Exactly one choice makes
 * the puzzle solvable, and it cannot be walked back.
 *
 * Piercing Shot is the DEFAULT: the flashiest option, one point from working,
 * and therefore the one a player talks themselves into. A picker whose
 * pre-selected special is the answer is decoration (#24's rule).
 *
 * The trap survives the correct pick. With Longshot in hand it is also the
 * biggest number available on the goal target — 15 into the Wizard, three short
 * of 18 — so the greedy player spends it there and leaves the Barbarian outside
 * a shut door.
 *
 * Slack: Whirlwind's 20 against 18. Vocabulary 1. Tier-0 fate. 2v2.
 */
export const PUZZLE_040: PuzzleDefinition = {
  id: 'puzzle-040',
  title: 'Puzzle #40 — Which Bow',
  goalText: 'Defeat the enemy Wizard within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'piercing',
      specialChoices: ['pinning', 'piercing', 'longshot'],
      position: { x: 4, y: 1 },
    },
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 4, y: 4 } },
    { id: 'targ', side: 'enemy', slug: 'wizard', specialSlug: 'blizzard', position: { x: 7, y: 4 }, currentHealth: 18 },
    // 13: only Longshot's 15 opens the door. Piercing's 12 is one short.
    { id: 'blok', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 6, y: 4 }, currentHealth: 13 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'blok'],
};
