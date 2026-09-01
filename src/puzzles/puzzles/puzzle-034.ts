import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #34 — "Waste the Arrow" (THREE TURNS: the SHIELD channel — a new one).
 *
 * A shield negates the first damaging hit that lands — the whole hit, damage and
 * any effect it carries, even an unblockable one — and then breaks (DGE-5). So
 * against a shielded enemy the biggest thing you own is the WORST thing to lead
 * with: it is spent in full on a hit that deals nothing.
 *
 * The Wardbearer is on 15 and shielded. Fifteen is exactly one Longshot, and the
 * Longshot only exists once. The plain arrow deals eleven and could never finish
 * her — which is precisely what makes it the right thing to throw away.
 *
 * Arrow into the ward (nothing), the Axeman puts the Cur down, Longshot into the
 * Wardbearer for fifteen. Both enemies dead on the last turn.
 *
 * Cost channel (trap #15 / #22 / #24) — but the cost is NOT a smaller number
 * this time, it is a wasted TURN. Turn one deals literally zero damage, which is
 * the least attractive play on the board and the only winning one.
 *
 * ⚠ THE TRAP IS A FREE KILL AT MAXIMUM RANGE. The Cur sits eight tiles out —
 * Longshot's exact reach, and two tiles past the plain arrow's — so goal-greedy
 * opens by Longshotting the Cur, which is a real kill for real damage and scores
 * higher than anything else on the board (trap #24: under `eliminate_all` a kill
 * is worth a hundred points of damage). It also spends the only thing that can
 * ever get through the ward. The Axeman's thirteen is then eaten by the shield
 * and the last arrow lands for eleven: the Wardbearer ends the puzzle on FOUR.
 *
 * ⚠ THE ORDER OF THE TWO WASTED HITS MATTERS AND IS THE WHOLE PUZZLE. Feed the
 * ward the Longshot instead of the arrow and the arithmetic inverts — 13 into
 * the Cur, 11 left for a 15-health target. Only the cheap hit is affordable as
 * a sacrifice.
 *
 * ⚠ 15 = one Longshot, 13 = one Axe, both exact. There is no slack anywhere and
 * that is deliberate: the shield already gives the player a free unit of tempo
 * to spend, so the numbers underneath it have to be tight or the sacrifice
 * stops costing anything.
 *
 * ⚠ THE ARCHER IS ROOTED so the row cannot be re-solved by walking, and both
 * enemies are ROOTED so the geometry the two ranges depend on cannot drift.
 *
 * Vocabulary 2 (a shield eats one whole hit; a shot you only get once).
 * Tier-0 fate.
 */
export const PUZZLE_034: PuzzleDefinition = {
  id: 'puzzle-034',
  title: 'Puzzle #34 — Waste the Arrow',
  goalText: 'Defeat BOTH enemies within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    // Rooted at the end of the row. Arrow 11 (reach 6), Longshot 15 (reach 8).
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 0, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // The Axeman: 13, and the Cur is the only thing he can reach.
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 3, y: 0 }, cooldowns: { whirlwind: 99 } },
    // 15 = one Longshot, once the ward is gone. Five tiles out: both shots reach.
    {
      id: 'wardbearer', side: 'enemy', slug: 'warlock', specialSlug: 'drain',
      position: { x: 5, y: 4 }, currentHealth: 15, introRelevant: true,
      statusEffects: [
        { slug: 'shielded', turnsRemaining: 99, stacks: 1 },
        { slug: 'rooted', turnsRemaining: 9, stacks: 1 },
      ],
      cooldowns: { drain: 99 },
    },
    // 13 = one Axe. Eight tiles from the archer: Longshot reaches, the arrow does not.
    {
      id: 'cur', side: 'enemy', slug: 'wizard', specialSlug: 'freeze',
      position: { x: 5, y: 1 }, currentHealth: 13,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { freeze: 99 },
    },
  ],
  initiativeOrder: ['p1', 'p2', 'wardbearer', 'cur'],
};
