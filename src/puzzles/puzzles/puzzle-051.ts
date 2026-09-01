import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #51 — "Don't Wake It" (THREE TURNS: an enemy PASSIVE that you turn on
 * yourself, by hitting it).
 *
 * The Reaver has Vengeful: below half health it swings for 4 more (PAS-5). It
 * is on 39 of 55, and its slot falls between the Marksman's first turn and the
 * Axeman's only turn — so whatever turn one does to it is what the Axeman has
 * to stand in front of.
 *
 * Both of the Marksman's shots are available and both are real. The arrow takes
 * 11 and leaves the Reaver on 28, still a point clear of half, so it swings for
 * 13; the Axeman takes that on 16 health and lives on 3, puts 13 back, and the
 * Longshot finishes it. 11 + 13 + 15 = 39, exactly.
 *
 * Longshot first takes 15 — four more, and the wrong four. The Reaver drops to
 * 24, under half, swings for 17 instead, and the Axeman dies on 16 health
 * before he ever swings. His 13 is gone, the arrow is all that is left, and the
 * puzzle ends 13 short.
 *
 * Cost channel (trap #15 / #22 / #24): the trap is the BIGGER of two real
 * attacks on the goal — fifteen against eleven, both scoring, both sensible.
 * Goal-greedy takes the larger number every time, and the larger number is what
 * arms the enemy. This is the first puzzle in the file where hitting the target
 * HARDER is how you lose.
 *
 * ⚠ 39 OF 55 IS THE WHOLE PUZZLE. Vengeful triggers at `health * 2 <=
 * maxHealth`, i.e. at 27. The arrow leaves 28 — one point clear. Longshot
 * leaves 24. The gap between the two shots is four points of damage and the
 * entire outcome. An earlier draft started the Reaver at 28, where ANY chip
 * armed it and the answer was to pass: that measured a 6.5% random win rate
 * (bar 5%), because "do nothing" is a third of a rooted archer's options. The
 * answer being a positive, smaller SHOT rather than inaction fixed both.
 *
 * ⚠ THE AXEMAN IS ON 16: he survives a 13 and dies to a 17. One point of margin
 * either side, so the mistake is total rather than gradual.
 *
 * ⚠ THE MARKSMAN IS ROOTED, so "shuffle sideways and shoot" cannot fan the
 * answer out into a dozen move-variants (the trap that has cost more candidates
 * here than any other). Rooted, her whole turn is a yes/no: shoot, or don't.
 *
 * Vocabulary 2 (Vengeful's threshold; a wounded enemy hits harder). Tier-0 fate.
 */
export const PUZZLE_051: PuzzleDefinition = {
  id: 'puzzle-051',
  title: 'Puzzle #51 — Don\'t Wake It',
  goalText: 'Defeat the Reaver within 3 turns',
  goal: 'eliminate_target',
  targetUnitId: 'reaver',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 0, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // 16 health: survives a 13, dies to a 17.
    // ⚠ ORTHOGONALLY adjacent, and off the firing line. Two separate measured
    // mistakes live in this one position. At (4,4) he stood between the
    // Marksman and the Reaver on a true line, and single-target LOS is blocked
    // by a living unit — both shots were simply ILLEGAL, which made an earlier
    // draft "work" for the wrong reason. At (4,3) he was DIAGONALLY adjacent,
    // which is chebyshev 1 but MANHATTAN 2 — and ability range is manhattan, so
    // the Reaver could not reach him at all and never swung. Adjacency for
    // reach means orthogonal.
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'shockwave', position: { x: 5, y: 3 }, cooldowns: { shockwave: 99 }, currentHealth: 16 },
    // 28 of 55 — one point clear of Vengeful. 28 = 13 + 15, exactly.
    {
      id: 'reaver', side: 'enemy', slug: 'barbarian', specialSlug: 'whirlwind',
      position: { x: 5, y: 4 }, currentHealth: 39,
      passiveSlug: 'vengeful',
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { whirlwind: 99 },
    },
    // ⚠ A DECOY, AND IT EARNS ITS PLACE. With only the Reaver to shoot, a
    // rooted archer had three options and one of them was the answer — a
    // coin-flipping player won 6.5% of the time (bar 5%). A second thing to
    // aim at doubles the ways to be wrong on both of her turns without
    // touching the arithmetic: under `eliminate_target` shooting it scores
    // nothing, so it tempts the solver not at all and the player a little.
    {
      id: 'decoy', side: 'enemy', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 1, y: 1 }, currentHealth: 38,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { longshot: 99 },
    },
  ],
  initiativeOrder: ['p1', 'reaver', 'p2', 'decoy'],
};
