import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #50 — "The Right Axe" (THREE TURNS: cooldown economy as ALLOCATION —
 * the special is not a bigger attack, it is the only key to one of the doors).
 *
 * Whirlwind is 16 and once per battle. The Cur is on 23 — which is a swing and
 * an Ice Blast, 13 + 10, exactly. The Warden is on 16 — which is Whirlwind, and
 * nothing else on this board reaches 16 in one turn.
 *
 * So the puzzle is not "when do I use my special", it is "which enemy is it
 * FOR". Spend it on the Cur, where it is merely the biggest number available,
 * and the Warden survives on 3 with the last swing already spent.
 *
 * Cost channel (trap #15 / #22 / #24): the trap is Whirlwind's 16 against the
 * ordinary swing's 13, on the same target, on turn one — strictly more damage,
 * strictly visible, and goal-greedy takes it every time. Under `eliminate_all`
 * every point of damage scores, so the bait needs no kill to be tempting.
 *
 * ⚠ THE WARDEN IS SIX TILES AWAY AND BOTH ENEMIES ARE ROOTED. Three things
 * were measured wrong before that: free to move, the Cur strolled into the
 * middle so ONE Whirlwind caught both (twenty winning first moves); rooted but
 * close, the axe could be spent on the Warden on turn one just as well as turn
 * three (six); and only at six tiles — one further than a Barbarian's move plus
 * reach — does the order stop being interchangeable. The advance has to be paid
 * for out of turn one, alongside the swing.
 *
 * ⚠ 23 = 13 + 10 and 16 = Whirlwind, both exact (trap #23's corollary — slack
 * multiplies winning ideas). The Wizard is deliberately out of range of the
 * Warden, so its 10 cannot be redirected to paper over a wasted special.
 *
 * ⚠ THE CUR DIES ON TURN TWO in the intended line, which is what keeps the
 * three-turn search cheap (trap #23).
 *
 * Vocabulary 2 (a once-per-battle special; two enemies with different locks).
 * Tier-0 fate.
 */
export const PUZZLE_050: PuzzleDefinition = {
  id: 'puzzle-050',
  title: 'Puzzle #50 — The Right Axe',
  goalText: 'Defeat BOTH enemies within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 3, y: 1 } },
    { id: 'p2', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 5, y: 2 } },
    // 23 = 13 + 10. The swing and the blast, and nothing needs the axe.
    // ⚠ ROOTED, like the Warden. Free to move, the Cur walks toward the
    // Barbarian and parks itself where ONE Whirlwind catches both enemies at
    // once — the solver found twenty winning first moves that way, all of them
    // "stroll into the middle and wait". Two rooted enemies three tiles apart
    // can never share a blast.
    {
      id: 'cur', side: 'enemy', slug: 'barbarian', specialSlug: 'shockwave',
      position: { x: 4, y: 1 }, currentHealth: 23,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // 16 = Whirlwind, and only Whirlwind. Rooted so the geometry cannot drift.
    {
      id: 'warden', side: 'enemy', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 3, y: 7 }, currentHealth: 16,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
  ],
  initiativeOrder: ['p1', 'p2', 'cur', 'warden'],
};
