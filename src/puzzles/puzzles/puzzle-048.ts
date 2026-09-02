import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #48 — "Spend It Early" (THREE TURNS: the FATE QUEUE revived — trap #21
 * said this facet needed a third turn, and it does).
 *
 * Trap #21 cut a two-turn version of this idea: with a MISS at the head of the
 * queue, letting it be spent is the DEFAULT, so the answer was inaction and
 * inaction cannot out-score anything. The note said it might live at three
 * turns, "where inaction on turn one can be made to cost something visible."
 * That is exactly what this is.
 *
 * `rollScript` is a queue consumed by the whole board, one entry per blockable
 * roll (types.ts). One wide roll sits at the head of it. The Bulwark is on 23,
 * which is the Wizard's 10 and the Axeman's 13 — every point of it, and both of
 * those are blockable, so whichever lands FIRST goes wide unless something has
 * already paid the fate.
 *
 * The Axeman has two attacks and only one of them rolls. His swing is blockable
 * and worth 13; Ground Slam is UNBLOCKABLE and worth 9. Slam and you deal a
 * real, visible nine that the fate cannot touch — and then the Wizard's blast is
 * the first roll of the fight and goes wide, and 9 + 13 is 22 against 23.
 *
 * Swing first instead. It misses, it accomplishes nothing, and it is the whole
 * answer: the queue is clean, the blast lands, the second swing lands, 23.
 *
 * Cost channel (trap #15 / #22 / #24): the trap deals NINE REAL POINTS to the
 * goal on turn one while the correct move deals zero. Goal-greedy takes the nine
 * every time and finishes one point short — the tightest near-miss in the file.
 *
 * ⚠ THE UNBLOCKABLE OPTION IS THE TRAP, not an oversight. Every fate puzzle so
 * far has had to keep unblockable abilities OFF the board because they act
 * without paying the queue (traps #19, #20). Here that property is the bait: an
 * attack that cannot pay is exactly the wrong thing to open with.
 *
 * ⚠ THE WIZARD IS OFF THE AXEMAN'S ROW. On it, he would block the blast's line
 * of sight (ABL-8) — and he must also stay two tiles clear, because Ground Slam
 * hits every neighbour including allies.
 *
 * ⚠ 23 = 10 + 13 EXACTLY. The greedy line reaches 22, so the puzzle is decided
 * by a single point, which is what makes the fate feel like arithmetic rather
 * than luck.
 *
 * Vocabulary 2 (a scripted miss; unblockable attacks do not roll). Tier-1 fate.
 */
export const PUZZLE_048: PuzzleDefinition = {
  id: 'puzzle-048',
  title: 'Puzzle #48 — Spend It Early',
  goalText: 'Defeat the enemy Barbarian within 3 turns',
  goal: 'eliminate_target',
  targetUnitId: 'bulwark',
  maxPlayerTurns: 3,
  rollScript: ['miss'],
  fateText: 'Fate is sealed: the FIRST blow struck in this fight goes wide, whoever throws it. Every strike after it lands.',
  units: [
    { id: 'p1', side: 'player', slug: 'barbarian', specialSlug: 'shockwave', position: { x: 4, y: 4 } },
    // Off the row and two tiles clear of Ground Slam's ring.
    { id: 'p2', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 2, y: 2 } },
    // 23 = 10 + 13, both blockable, so the fate has to be paid by something else.
    {
      id: 'bulwark', side: 'enemy', slug: 'barbarian', specialSlug: 'whirlwind',
      position: { x: 5, y: 4 }, currentHealth: 23,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { whirlwind: 99 },
    },
  ],
  initiativeOrder: ['p1', 'p2', 'bulwark'],
};
