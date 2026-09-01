import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #23 — "The Long Road" (THREE TURNS, and the first `eliminate_all`).
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
 * ⚠ THE COOLDOWN IS PART OF THE BUDGET, and it is easy to forget on a 3-turn
 * board. Longshot is a SPECIAL — cooldown 99, once per match — so the Ranger's
 * third turn is a plain Arrow for 11, not another 15. The first draft put the
 * Sorcerer on 12 and the puzzle came back NOT SOLVABLE with a near-miss of
 * exactly 1: the third shot was 11 against 12. On a two-turn puzzle each unit
 * acts once and this never comes up; from three turns on, a unit acts twice and
 * its special is gone the second time.
 *
 * Slack: 15 + 16 against 28 on the Cleric, and the Arrow's 11 against 9 on the
 * Sorcerer. Vocabulary 1 (a hurt Cleric heals itself).
 * Tier-0 fate. 2v2, three turns.
 */
export const PUZZLE_023: PuzzleDefinition = {
  id: 'puzzle-023',
  title: 'Puzzle #23 — The Long Road',
  goalText: 'Defeat the enemy Cleric and the enemy Sorcerer within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    // Off the rank so the Rogue never blocks the shot (ABL-3, trap #2).
    //
    // ROOTED, and NOT for a tactical reason — Longshot reaches 8 tiles and the
    // Ranger never wants to move. It is a SEARCH-COST device. A 3-turn
    // eliminate_all is the most expensive shape in the format: the solver has to
    // exhaust three plies of (every move tile x every ability x every target)
    // for both units, and the first draft of this puzzle ran past 35 minutes
    // without returning. Pinning the unit that has no reason to move removes an
    // entire branching dimension at every ply and brings it back into range.
    // Recommended for any future 3-turn puzzle: give at least one unit a reason
    // to be immobile.
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 1, y: 2 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 5, stacks: 1 }],
    },
    { id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'expose', position: { x: 3, y: 4 } },
    // 28 of 50: survives one hit, dies to two, and is deep enough in the red
    // after the first that it will reach for its own heal.
    { id: 'ward', side: 'enemy', slug: 'cleric', specialSlug: 'heal', position: { x: 5, y: 4 }, currentHealth: 28 },
    // The free kill, and the reason the puzzle works.
    //
    // A SORCERER, not a Wizard — and that is load-bearing. The first draft gave
    // this slot a Wizard with Cold Snap, which freezes; on its turn it froze the
    // Ranger, TRN-6 skipped the Ranger's slot, and the player's third turn
    // simply evaporated. The puzzle proved UNSOLVABLE and the solver spent 35
    // minutes exhausting the tree to say so. On a 3-turn puzzle the enemy has a
    // slot BETWEEN your second and third turns, so any enemy disable is a
    // direct attack on your turn budget. Check every enemy special for
    // frozen/rooted before authoring a 3-turn board.
    { id: 'acol', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 6, y: 2 }, currentHealth: 9 },
  ],
  initiativeOrder: ['p1', 'p2', 'ward', 'acol'],
};
