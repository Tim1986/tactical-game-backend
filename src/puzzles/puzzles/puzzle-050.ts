import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #50 — "Slow Fire" (THREE TURNS: a smaller hit that keeps giving).
 *
 * Ignite deals 5 and sets its target burning; burning ticks 7 at the start of
 * the victim's own turn (STA-2). Ice Bolt deals 10 and is over. Turn one is a
 * choice between ten now and twelve spread across the fight — and goal-greedy
 * scores what a move DEALS, so it takes the ten and never sees the seven.
 *
 * The Bulwark is on 35. Ignite first: 5, then 7 when its slot comes round, then
 * the Axeman's 13, then a bolt for 10. Exactly 35.
 *
 * Bolt first and the fire never gets lit early enough to tick: 10 + 13 + 10 is
 * 33, and the Bulwark ends the puzzle standing on 2.
 *
 * Cost channel (trap #15 / #22 / #24): the trap is the LARGER IMMEDIATE NUMBER
 * on the goal, which is the purest form of the bait this file has — no kill, no
 * geometry, just ten against five on the same target. The five wins because the
 * enemy's own turn pays the difference.
 *
 * ⚠ THE BULWARK GETS EXACTLY ONE SLOT before the last player turn, so the burn
 * ticks exactly once. Igniting on turn three instead deals 5 and nothing else —
 * the fire needs a turn of the victim's to burn through.
 *
 * ⚠ 35 = 5 + 7 + 13 + 10, and the greedy line reaches 33. Two points, and no
 * slack anywhere (trap #23's corollary).
 *
 * ⚠ THE AXEMAN IS OFF THE FIRING ROW (trap #26): on it he would block the
 * Sorcerer's line of sight, and orthogonal adjacency is what lets him reach the
 * Bulwark at all.
 *
 * ⚠ THE SORCERER IS ROOTED so "shuffle and cast" cannot fan the answer into a
 * dozen move-variants, and a decoy gives her somewhere wrong to aim (the
 * random-rate fix from #4).
 *
 * Vocabulary 2 (burning ticks on the victim's slot; a special used once).
 * Tier-0 fate.
 */
export const PUZZLE_050: PuzzleDefinition = {
  id: 'puzzle-050',
  title: 'Puzzle #50 — Slow Fire',
  goalText: 'Defeat the Bulwark within 3 turns',
  goal: 'eliminate_target',
  targetUnitId: 'bulwark',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'sorcerer', specialSlug: 'ignite',
      position: { x: 2, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'shockwave', position: { x: 5, y: 3 }, cooldowns: { shockwave: 99 } },
    // 35 = 5 (ignite) + 7 (its own burn) + 13 (axe) + 10 (bolt).
    {
      id: 'bulwark', side: 'enemy', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 5, y: 4 }, currentHealth: 35,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { longshot: 99 },
    },
    // Somewhere wrong to aim: scores nothing under eliminate_target.
    {
      id: 'decoy', side: 'enemy', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 1, y: 1 }, currentHealth: 38,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { longshot: 99 },
    },
  ],
  initiativeOrder: ['p1', 'p2', 'bulwark', 'decoy'],
};
