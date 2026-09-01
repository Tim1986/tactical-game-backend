import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #11 — "It Won't Stay Down" (THREE TURNS: UNDYING, and a burn that
 * needs time — a new channel).
 *
 * Undying lets a unit survive its first death at 1 health. So against the
 * Revenant there is no such thing as a killing blow: every single hit, however
 * large, leaves it standing on one. It has to be killed TWICE, and there is only
 * one caster here.
 *
 * Ignite is the answer precisely because it is the smallest number on the board.
 * Five is nothing; the fire behind it is 7 a turn for three turns, and that is
 * the only damage here that arrives in SEPARATE pieces. Seventeen, then 12, 5,
 * and a tick that spends the Undying, and a tick that finishes it — all three
 * ticks, which is three enemy turns, which means the fire has to be lit on turn
 * ONE. Nothing else the Sorcerer owns kills anything twice.
 *
 * Cost channel (trap #15 / #22 / #24): Bolt shows ten into the Hulk against
 * Ignite's five into the Revenant, so goal-greedy bolts, bolts again for the
 * kill, and lights the fire last — one tick, eaten by the Undying, and the
 * Revenant ends the puzzle on ONE.
 *
 * ⚠ THIS IS TRAP #23'S OPPOSITE. Everywhere else a scheduled death makes the
 * search cheap; here the schedule is the ANSWER, and it is invisible to greedy
 * for the reason established with #50 — the goal-greedy bot scores the board
 * immediately after the player's own actions, before any enemy turn, and a burn
 * has done nothing at all at that moment.
 *
 * ⚠ SEVENTEEN IS THE WHOLE DEADLINE, AND IT IS NARROW. The enemy turn resolves
 * inside the same submit as the player's, BEFORE the turn limit is checked
 * (localMatchService) — so a burn lit on the very last turn still gets one tick,
 * and the solver and the app agree about that. A puzzle that needs only TWO
 * ticks is therefore not a deadline at all: turn two would do. Seventeen needs
 * all THREE. After Ignite's 5 the Revenant sits on 12, which is more than one
 * tick (7) and no more than two, so the second tick is the one that spends the
 * Undying and the third is the one that kills. The legal window is 13-19; below
 * it the fire can be lit late, above it the fire never finishes at all because
 * Undying always eats the last tick it is offered.
 *
 * ⚠ AND IT IS WHY TWO BOLTS CANNOT DO IT EITHER: 10 and 10 into seventeen leaves
 * the Revenant standing on one. Undying does not care how big the number was,
 * only how many separate times it arrived — which is the lesson.
 *
 * ⚠ BOTH ENEMIES ARE MELEE AND ROOTED, five tiles out and unable to close. They
 * cannot touch the Sorcerer, so nothing about the enemy turns depends on where
 * anyone stands — the same isolation puzzle-957 was reaching for, done by taking the
 * enemy's reach away instead of by making a tie-break carry the puzzle.
 *
 * ⚠ 20 = two Bolts exactly, which is the entire rest of the budget. A Hulk any
 * softer would leave a Bolt spare for the Revenant and the fire would stop being
 * the only answer.
 *
 * Vocabulary 2 (a death that has to happen twice; a burn that pays later).
 * Tier-0 fate.
 */
export const PUZZLE_011: PuzzleDefinition = {
  id: 'puzzle-011',
  title: 'Puzzle #11 — It Won\'t Stay Down',
  goalText: 'Defeat BOTH enemies within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    // Bolt 10 (reach 5) and one Ignite: 5 now, then burning for three turns.
    {
      id: 'p1', side: 'player', slug: 'sorcerer', specialSlug: 'ignite',
      position: { x: 1, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // 6 = Ignite's 5, then the tick the Undying eats, then the tick that kills.
    {
      id: 'revenant', side: 'enemy', slug: 'fighter', specialSlug: 'second_wind',
      passiveSlug: 'undying', position: { x: 5, y: 4 }, currentHealth: 17,
      introRelevant: true,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { second_wind: 99 },
    },
    // 20 = two Bolts, which is the whole rest of the budget.
    {
      id: 'hulk', side: 'enemy', slug: 'barbarian', specialSlug: 'whirlwind',
      position: { x: 4, y: 2 }, currentHealth: 20,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { whirlwind: 99 },
    },
  ],
  initiativeOrder: ['p1', 'revenant', 'hulk'],
};
