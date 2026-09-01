import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #17 — "Which Bow" (PICKER-FIRST on the blocked-path lesson).
 *
 * The Ranger commits to one bow before anything moves, and the Wisp holding the
 * doorway is on 13. Longshot's 15 opens it. Piercing Shot's 12 falls one short —
 * the near-miss engineered into a decoy — and Pinning Shot's 7 is not close. The
 * Arrow the Ranger carries anyway is 11, also short. Exactly one choice makes
 * the puzzle solvable, and it cannot be walked back.
 *
 * Piercing Shot is the DEFAULT: the flashiest option, one point from working,
 * and therefore the one a player talks themselves into. A picker whose
 * pre-selected special is the answer is decoration (#7's rule).
 *
 * The trap survives the correct pick. With Longshot in hand it is also the
 * biggest number available on the goal target — 15 into the Wizard, one short
 * of 16 — so the greedy player spends it there and leaves the Barbarian outside
 * a shut door.
 *
 * ⚠ REBUILT 2026-08-22 for the RING Whirlwind, which broke this twice over.
 *  1. GEOMETRY. Whirlwind used to hit only the 4 cardinal tiles, so (6,4) — the
 *     Wisp's square — was the sole place the Barbarian could stand. As an
 *     8-tile ring it also reaches from the DIAGONALS (6,3) and (6,5), both
 *     three steps from the old (4,4) start, so the door stopped mattering. The
 *     Barbarian now starts at (3,4): (6,4) is exactly three steps, the two
 *     diagonals are four.
 *  2. ARITHMETIC. Whirlwind fell 20 -> 16, so the Wizard's 18 became unkillable
 *     and every combo went unsolvable. It is now 16.
 *
 * ⚠ THE TARGET'S HP IS PINNED, NOT CHOSEN. It must be ABOVE Longshot's 15 (or
 * the greedy shot at the Wizard just wins) and AT MOST Whirlwind's 16 (or
 * nothing kills it). 16 is the only value that satisfies both, so this puzzle
 * has ZERO slack by construction and MUST be re-solved if either number moves.
 * That is the exact-sum fragility that killed puzzle-905 and puzzle-910 — accepted here only
 * because the alternative is deleting a working picker.
 *
 * Why there is no two-turn fallback: the Wizard has 3 movement and the Arrow
 * reaches 6, so a wounded Wizard simply walks out of range. The kill has to
 * land on turn 1, which is what forces the whole sequence.
 *
 * Vocabulary 1. Tier-0 fate. 2v2.
 */
export const PUZZLE_017: PuzzleDefinition = {
  id: 'puzzle-017',
  title: 'Puzzle #17 — Which Bow',
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
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 3, y: 4 } },
    { id: 'targ', side: 'enemy', slug: 'wizard', specialSlug: 'blizzard', position: { x: 7, y: 4 }, currentHealth: 16 },
    // 13: only Longshot's 15 opens the door. Piercing's 12 is one short,
    // the Arrow's 11 two, Pinning Shot's 7 nowhere near.
    { id: 'blok', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 6, y: 4 }, currentHealth: 13 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'blok'],
};
