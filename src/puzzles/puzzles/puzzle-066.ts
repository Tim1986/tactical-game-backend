import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #66 — "Feed It Something Cheap" (THREE TURNS: the SHIELD channel
 * again, and a DELIBERATE spaced near-clone of #64 — see the licence note with
 * #54. Different chassis, and a different clause of the same rule.)
 *
 * #64 taught that a shield eats the first damaging hit whole. This one adds the
 * half of DGE-5 that surprises people: **it does not care that the hit is
 * unblockable.** Flame Jet cannot be dodged, and the ward absorbs it anyway —
 * damage, effect and all — and then breaks.
 *
 * So the Sorcerer's once-per-battle line is the single worst thing to open with,
 * and the ordinary Bolt is worth throwing away precisely because it is ordinary.
 * Bolt into the ward, the Axeman puts the Cur down, Flame Jet for sixteen.
 *
 * ⚠ THE TRAP IS DIFFERENT FROM #64'S, WHICH IS WHY THIS IS A CLONE AND NOT A
 * REPEAT. There the bait was a free kill at maximum range; here it is that the
 * Cur is the only thing on the board a first Bolt can visibly hurt, so
 * goal-greedy spends turn one usefully, watches the Axeman finish the job, and
 * arrives at turn three holding an unblockable sixteen that the ward swallows
 * whole. The board never punishes greed until the last possible moment.
 *
 * ⚠ FLAME JET IS A LINE, and the Sorcerer is ROOTED at the end of the row, so
 * the only thing it can ever be aimed at is the Wardbearer. The tool has exactly
 * one target and exactly one use, which is what makes feeding the ward with it
 * unrecoverable rather than merely wasteful.
 *
 * ⚠ 16 = one Flame Jet and 13 = one Axe, both exact. Feed the ward the Flame Jet
 * instead of the Bolt and the Bolt's ten is all that is left for a sixteen: the
 * Wardbearer ends the puzzle on SIX, which is the hook.
 *
 * ⚠ THE CUR IS OFF THE ROW so it cannot be caught by the line, and MELEE AND
 * ROOTED so it can never reach the Sorcerer — only the Wardbearer's eldritch
 * touches him, and 34 health covers two rounds of it with room to spare.
 *
 * Vocabulary 2 (a shield eats one whole hit, unblockable included; a line you
 * only get once). Tier-0 fate.
 */
export const PUZZLE_066: PuzzleDefinition = {
  id: 'puzzle-066',
  title: 'Puzzle #66 — Feed It Something Cheap',
  goalText: 'Defeat BOTH enemies within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    // Bolt 10 (reach 5) and one Flame Jet: 16 unblockable, along a line, reach 4.
    {
      id: 'p1', side: 'player', slug: 'sorcerer', specialSlug: 'flame_jet',
      position: { x: 0, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // The Axeman: 13, and he has to walk before he can swing.
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 1, y: 0 }, cooldowns: { whirlwind: 99 } },
    // 16 = one Flame Jet, once the ward is gone. On the row, four tiles out.
    {
      id: 'wardbearer', side: 'enemy', slug: 'warlock', specialSlug: 'drain',
      position: { x: 4, y: 4 }, currentHealth: 16, introRelevant: true,
      statusEffects: [
        { slug: 'shielded', turnsRemaining: 99, stacks: 1 },
        { slug: 'rooted', turnsRemaining: 9, stacks: 1 },
      ],
      cooldowns: { drain: 99 },
    },
    // 13 = one Axe. Off the row, in Bolt range, and rooted out of everyone's reach.
    {
      id: 'cur', side: 'enemy', slug: 'barbarian', specialSlug: 'whirlwind',
      position: { x: 3, y: 2 }, currentHealth: 13,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { whirlwind: 99 },
    },
  ],
  initiativeOrder: ['p1', 'p2', 'wardbearer', 'cur'],
};
