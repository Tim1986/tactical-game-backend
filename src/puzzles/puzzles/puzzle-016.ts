import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #16 — "Break the Bindings" (v2 texture: FREE THE FINISHER).
 *
 * Your Barbarian is the only unit whose axe reaches 12 — and it is ROOTED two
 * tiles short of the Sorcerer, so it cannot close. Your Cleric is standing
 * right next to the target with a mace in its hand, and swinging it is the
 * obvious play: 11 damage, one hp short, and the Barbarian still cannot move.
 * Purify is the answer — spend the Cleric's turn dealing no damage at all.
 *
 * v2 shape: the winning first move deals ZERO damage to the goal target while
 * a legal 11-damage attack is available and in range, so a goal-aware greedy
 * player swings and finishes one HP short. That last point is the retry hook —
 * the failing line ends with the Sorcerer on 1.
 *
 * Narrow by construction (the lesson from the rejected #16 displacement draft):
 * exactly one action wins — Purify on the Barbarian. There is no direction to
 * get right and no second target worth cleansing, so flailing does not land it.
 *
 * The Barbarian's special is Ground Slam (range 0) on purpose: Leaping Slam
 * explicitly leaps "even if rooted" (ABL-12), which hands a rooted unit a
 * 2-tile escape hatch and breaks the whole premise. The solver caught exactly
 * that on the first draft.
 *
 * Vocabulary 2 (rooted stops movement; Purify removes it). Tier-0 fate. 2v1.
 */
export const PUZZLE_016: PuzzleDefinition = {
  id: 'puzzle-016',
  title: 'Puzzle #16 — Break the Bindings',
  goalText: 'Defeat the enemy Sorcerer within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'cleric', specialSlug: 'heal',
      // [CAMO SWEEP 2026-08-31] A Cleric holding Purify beside a ROOTED ally is
      // the answer written on the tin. The default is now the tempting number —
      // Heal's 27, the biggest thing the Cleric can do — and both decoys are
      // live: Heal patches a unit that is not hurt, Ward shields a unit nothing
      // is attacking. Only Purify frees the swing.
      specialChoices: ['heal', 'ward', 'purify'],
      position: { x: 5, y: 4 },
    },
    {
      id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'shockwave',
      position: { x: 4, y: 6 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 3, stacks: 1 }],
    },
    { id: 'targ', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 6, y: 4 }, currentHealth: 12 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ'],
};
