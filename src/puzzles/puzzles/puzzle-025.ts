import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #25 — "Let the Dog Wait" (THREE TURNS: the order trap again, on a
 * different chassis).
 *
 * ⚠ DELIBERATE NEAR-CLONE of #42, and spaced from it in the rotation — the same
 * licence #3 takes with #21. The skeleton is identical (a healer that must die
 * inside one lap; a free kill that must wait), the surface is not: a bow and a
 * warlock instead of an axe and a wizard, a Cleric's Heal instead of a
 * Fighter's First Aid, and the free kill is claimed by the once-per-battle shot
 * rather than an ordinary swing. Volume matters for a daily rotation, and a
 * proven skeleton re-dressed is the cheapest honest way to get it.
 *
 * The Chanter is on 22 of 50 and carries Heal: give her a turn while she is
 * hurt and she puts 27 back, past anything the board can still take off. So she
 * dies inside one lap or not at all — the arrow's 11 and the Warlock's 11 are
 * exactly 22, and exactly the first two turns.
 *
 * The Dog is on 15, rooted, and worth a whole enemy for one Longshot. It waits,
 * because the last turn is enough for it.
 *
 * Take the free kill first and the Chanter heals on schedule, and the arrow that
 * is left is 16 short.
 *
 * Cost channel (trap #15 / #22 / #24): the bait is a KILL, so the goal is
 * `eliminate_all` and the scorer values it at `kills * 10000` — greedy cannot
 * refuse it. Trap #1 is again the mechanism rather than the hazard, and the
 * heal is sized to be unanswerable (27 restored against 11 remaining) rather
 * than merely large.
 *
 * ⚠ 22 = 11 + 11 and 15 = one Longshot, both exact. The Warlock's Eldritch
 * Blast is unblockable, which matters not at all here (Tier-0 fate) but keeps
 * the arithmetic clean of dodge chances.
 *
 * ⚠ THE DOG SITS AT EXACTLY EIGHT TILES — the Longshot's full reach. At nine it
 * was simply unkillable and the puzzle measured NOT SOLVABLE with a near-miss
 * of exactly its health. Range is manhattan; count it, do not eyeball it.
 *
 * ⚠ ORTHOGONAL REACH AND CLEAR LINES (trap #26): the Warlock stands beside the
 * Chanter on the axis, and neither enemy sits between the archer and her
 * target.
 *
 * Vocabulary 2 (a wounded enemy heals itself; two kills can be taken in either
 * order). Tier-0 fate.
 */
export const PUZZLE_025: PuzzleDefinition = {
  id: 'puzzle-025',
  title: 'Puzzle #25 — Let the Dog Wait',
  goalText: 'Defeat BOTH enemies within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 0, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    { id: 'p2', side: 'player', slug: 'warlock', specialSlug: 'fear', position: { x: 4, y: 3 }, cooldowns: { fear: 99 } },
    // 22 = 11 + 11, and only inside one lap.
    {
      id: 'chanter', side: 'enemy', slug: 'cleric', specialSlug: 'heal',
      position: { x: 4, y: 4 }, currentHealth: 22,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // 15 = one Longshot. The free kill, and the trap.
    {
      id: 'dog', side: 'enemy', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 6, y: 2 }, currentHealth: 15,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { longshot: 99 },
    },
  ],
  initiativeOrder: ['p1', 'p2', 'chanter', 'dog'],
};
