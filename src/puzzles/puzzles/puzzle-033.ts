import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #33 — "The Long Road" (THREE TURNS, and the first `eliminate_all`).
 *
 * Every puzzle before this one is `eliminate_target` in two turns, for a
 * documented reason: trap #10 — two kills consume the whole two-turn budget and
 * leave nothing for the setup move that depth >= 1 requires. Three turns is
 * what un-walls it, and Fable measured the cost honestly at 15–370s per solver
 * run, which is slow but not the "intractable" the board used to claim.
 *
 * Both of them have to die. The Acolyte is on 12 and the Ranger can drop it from
 * anywhere on the board — which is exactly the move that loses. Spend a turn on
 * it and the Warden, left alone and hurt, spends its slot putting 27 back on
 * itself (trap #1: a wounded Cleric heals ITSELF, and here that is the trap
 * rather than the hazard). Your remaining turn cannot cover the difference.
 *
 * The Warden has to go first, and it takes BOTH of your first two turns to do
 * it: 28 health against Longshot's 15 and Expose Weakness's 16. Kill it before
 * its slot ever arrives and it never heals; the Acolyte is then a formality for
 * the third turn.
 *
 * The order is the whole puzzle, and it is invisible to goal-greedy for a
 * structural reason worth noting: for `eliminate_all` the solver scores a KILL
 * at 10000 against 100 per point of damage, so taking the free kill always
 * outranks chipping the healer. That is also how a human reads a board — clear
 * the one you can actually finish — which is what makes it a fair trap rather
 * than a gotcha.
 *
 * Slack: 15 + 16 against 28. Vocabulary 1 (a hurt Cleric heals itself).
 * Tier-0 fate. 2v2, three turns.
 */
export const PUZZLE_033: PuzzleDefinition = {
  id: 'puzzle-033',
  title: 'Puzzle #33 — The Long Road',
  goalText: 'Defeat the enemy Cleric and the enemy Wizard within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    // Off the rank so the Rogue never blocks the shot (ABL-3, trap #2).
    { id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'longshot', position: { x: 1, y: 2 } },
    { id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'expose', position: { x: 3, y: 4 } },
    // 28 of 50: survives one hit, dies to two, and is deep enough in the red
    // after the first that it will reach for its own heal.
    { id: 'ward', side: 'enemy', slug: 'cleric', specialSlug: 'heal', position: { x: 5, y: 4 }, currentHealth: 28 },
    // The free kill, and the reason the puzzle works.
    { id: 'acol', side: 'enemy', slug: 'wizard', specialSlug: 'cold_snap', position: { x: 6, y: 2 }, currentHealth: 12 },
  ],
  initiativeOrder: ['p1', 'p2', 'ward', 'acol'],
};
