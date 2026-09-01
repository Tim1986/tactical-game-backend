import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #42 — "Wrong One First" (THREE TURNS: the ORDER TRAP — kill them in
 * the appealing order and the survivor patches itself up).
 *
 * The doc has listed order traps as a three-turn unlock since axis 2 was
 * measured, on the reasoning that two kills eat the whole two-turn budget and
 * leave no room to be wrong. With three turns there is room, and being wrong is
 * the puzzle.
 *
 * The Cur is on 13 — one swing, a whole enemy, free. The Warden is on 23 of 52,
 * deep in the red, and carries First Aid: give it a turn while it is hurt and it
 * puts 27 back, which is more than anything left on the board can take off.
 *
 * So the Warden has to die inside a single lap, before its slot ever arrives:
 * the Barbarian's 13 and the Wizard's 10 are exactly 23, and they are exactly
 * the first two turns. The Cur waits, because the last turn is enough for it.
 *
 * Take the free kill first and the arithmetic never recovers. The Wizard's 10
 * leaves the Warden on 13, its slot arrives, First Aid takes it to 40, and the
 * final swing is 27 short.
 *
 * Cost channel (trap #15 / #22 / #24): the bait is an entire enemy — worth
 * `kills * 10000` to the scorer, which is why the goal must be `eliminate_all`
 * for the trap to bite at all — and the correct opening scores a tenth of that.
 * Goal-greedy takes the kill every time and finishes 27 behind.
 *
 * ⚠ TRAP #1, USED ON PURPOSE. Every other puzzle in this file treats a wounded
 * enemy that carries a self-heal as a hazard to design around; #46a died to it
 * outright. Here it IS the mechanism, and the numbers are chosen so the heal is
 * unanswerable rather than merely annoying: 27 restored against 13 remaining.
 * A heal you can grind through is not a deadline.
 *
 * ⚠ 23 = 13 + 10 EXACTLY, and both of those turns must land before the Warden's
 * slot. Any slack and the free kill becomes affordable.
 *
 * ⚠ THE CUR IS ROOTED so the geometry cannot drift; it is a deadline, not an
 * opponent. Its 13 matches the Barbarian's swing exactly, so the last turn is
 * spoken for and cannot be borrowed.
 *
 * Vocabulary 2 (a wounded enemy heals itself; kills can be taken in either
 * order). Tier-0 fate.
 */
export const PUZZLE_042: PuzzleDefinition = {
  id: 'puzzle-042',
  title: 'Puzzle #42 — Wrong One First',
  goalText: 'Defeat BOTH enemies within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'barbarian', specialSlug: 'shockwave',
      position: { x: 4, y: 4 },
      // Spent: an AoE that clips both enemies would rewrite the arithmetic, and
      // a special that cannot matter still generates cosmetic winning ideas
      // (learned on #20).
      cooldowns: { shockwave: 99 },
    },
    { id: 'p2', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 2, y: 4 } },
    // 23 = 13 + 10, and it must die before its own slot or First Aid ends it.
    { id: 'warden', side: 'enemy', slug: 'fighter', specialSlug: 'second_wind', position: { x: 5, y: 4 }, currentHealth: 23 },
    // 13 = one swing. The free kill, and the trap.
    {
      id: 'cur', side: 'enemy', slug: 'barbarian', specialSlug: 'whirlwind',
      position: { x: 4, y: 6 }, currentHealth: 13,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
  ],
  initiativeOrder: ['p1', 'p2', 'warden', 'cur'],
};
