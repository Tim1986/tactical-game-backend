import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #3 — "Cut Him Loose" (ANSWER: PURIFY).
 *
 * ⚠ Fable review 2026-08-21: this is a NEAR-CLONE of #21 "Break the Bindings"
 * — same texture (rooted finisher), same answer (Purify your own unit), same
 * roster shape, same one-short retry hook. It was authored as "the first purify
 * answer" because the rotation tally carried "(016 tbd)" instead of #21's
 * actual answer. Kept in rotation (near-clones are acceptable filler on the
 * road to 50, and the two sit 15 days apart), but PURIFY IS NOW A CLOSED
 * ANSWER, and the lesson is procedural: verify the tally is COMPLETE before
 * claiming any answer is new.
 *
 * Your Rogue is ROOTED two tiles from the enemy Sorcerer: MOV-4 leaves it able
 * to use abilities but unable to close, and Expose Weakness only reaches one
 * tile, so it is a 16-damage unit that cannot spend a point of it. The Cleric
 * can walk up and swing its Mace for 11 — the only damage on offer, and three
 * short of the 14 the Sorcerer is sitting on.
 *
 * Purify removes Rooted (its text lists Frozen, Rooted and Burning) from an ally
 * within 3 tiles. It deals nothing to the Sorcerer, which is exactly why
 * goal-greedy will not consider it: the Cleric's Mace scores 11 and Purify
 * scores 0. Spend the turn on your own unit and the Rogue does the rest.
 *
 * The Cleric is placed so it CAN reach the Sorcerer and swing — deliberately.
 * If its only legal action were Purify the puzzle would score depth 0 and be
 * rejected (trap #2's lesson generalised): there has to be a tempting wrong
 * move for the right one to mean anything.
 *
 * Slack: 16 against 14. Vocabulary 2 (rooted cannot move; Purify clears it).
 * Tier-0 fate. 2v1.
 */
export const PUZZLE_003: PuzzleDefinition = {
  id: 'puzzle-003',
  title: 'Puzzle #3 — Cut Him Loose',
  goalText: 'Defeat the enemy Sorcerer within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'cleric', specialSlug: 'purify', position: { x: 4, y: 2 } },
    {
      id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'expose',
      position: { x: 3, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 3, stacks: 1 }],
    },
    { id: 'targ', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 5, y: 4 }, currentHealth: 14 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ'],
};
