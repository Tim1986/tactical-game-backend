import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #40 — "Let It Burn" (ANSWER: ignore the free kill entirely).
 *
 * The first puzzle to use PRE-APPLIED BURNING, which the doc has called "great
 * material" since the v2 rework without a single puzzle spending it.
 *
 * STA-2: burning deals 7 at the START of the burning unit's turn, before it
 * acts — "a unit can die to its own burn before it gets to act." The enemy
 * Acolyte is on 6 and burning. It is already dead; it just does not know yet.
 *
 * Both enemies have to die and you have three turns, which is exactly enough to
 * put 42 into the Warden's 35 — but only if you spend all three on the Warden.
 * The Acolyte is the trap: a one-shot kill sitting in the open, worth 10000 to
 * any scoring function and irresistible to a human reading the board. Take it
 * and you have burned a third of your budget on a unit the fire was going to
 * finish on its own, and the Warden lives on 8.
 *
 * The winning first move is Longshot into the Warden — the enemy you CANNOT
 * kill this turn, while a free kill stands next to it.
 *
 * Why this is a fair trap rather than a gotcha: everything needed is on screen.
 * The Acolyte's health, its burning icon, and the rule that burning ticks at the
 * start of its turn are all visible before you move, and the initiative strip
 * shows its slot arriving before your third turn.
 *
 * Both search-cost rules from #23 apply: the Ranger is ROOTED (range 8, no
 * reason to move) to keep the 3-turn search tractable, and neither enemy carries
 * a freeze or a root, so nothing can delete the third turn.
 *
 * Slack: 15 + 16 + 11 = 42 against 40, and the Acolyte's 6 against a 7-point
 * tick. Note the third shot is an ARROW, not a second Longshot — specials are
 * once per match, which is #23's lesson and is now part of the budget.
 *
 * Vocabulary 1 (burning ticks at the start of its victim's turn). Tier-0 fate.
 * 2v2, three turns.
 */
export const PUZZLE_040: PuzzleDefinition = {
  id: 'puzzle-040',
  title: 'Puzzle #40 — Let It Burn',
  goalText: 'Defeat the enemy Fighter and the enemy Sorcerer within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    // ROOTED as a search-cost device (see #23): range 8, never wants to move.
    // CAMOUFLAGE (Fable retrofit, 2026-08-21): the Ranger picks its bow. Only
    // Longshot's 15 completes the 42-point budget against 40; Piercing's 12
    // leaves the Warden on exactly 1 (the near-miss made into a decoy), and
    // Pinning's 7 is never close. Default is PIERCING — the tempting decoy —
    // because a picker whose default is the answer is decoration (the #7 rule).
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'piercing',
      specialChoices: ['pinning', 'piercing', 'longshot'],
      position: { x: 1, y: 2 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 5, stacks: 1 }],
    },
    { id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'expose', position: { x: 3, y: 4 } },
    // The real job: 35 health, and it takes all three turns.
    { id: 'ward', side: 'enemy', slug: 'fighter', specialSlug: 'concussive', position: { x: 5, y: 4 }, currentHealth: 40 },
    // Already dead. 6 health against a 7-point tick at the start of its own slot.
    {
      id: 'acol', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite',
      position: { x: 6, y: 2 }, currentHealth: 6,
      statusEffects: [{ slug: 'burning', turnsRemaining: 3, stacks: 1 }],
    },
  ],
  initiativeOrder: ['p1', 'p2', 'acol', 'ward'],
};
