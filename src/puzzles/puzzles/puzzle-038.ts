import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #38 — "Twin Fates" (THREE TURNS: the MULTI-HIT fate facet, revived —
 * trap #20 was arithmetically walled at two turns and is not any more).
 *
 * Trap #20 cut this idea with an exact proof: a fate puzzle needs a blockable
 * finisher AND a turn-one trap, the trap must sit on the unit that acts first,
 * and every rogue special is unblockable at 16 — which demanded
 * `16 < HP <= 16` against a finisher capped at 16. The window was empty. Three
 * turns opens it, because the finisher no longer has to be a single blow.
 *
 * `rollScript` is a queue consumed one entry per blockable roll, and Twin Strike
 * rolls TWICE (types.ts). Two wide rolls sit at the head of it. The Rogue is the
 * only thing on the board that can clear both in a single action — a shovel
 * where everything else has a spoon.
 *
 * Dagger Toss is 16 and UNBLOCKABLE, so it rolls nothing and pays nothing. Open
 * with it and the queue is untouched: the Axeman's swing then eats the first
 * miss, the Rogue's twin eats the second and lands one dagger for 8, and 16 + 8
 * is 24 against 29.
 *
 * Open with Twin Strike instead. Both daggers go wide, for nothing, and that is
 * the point — the queue is clean, the Axeman's 13 lands, and the second twin
 * lands both daggers for 16. 13 + 16 = 29.
 *
 * Cost channel (trap #15 / #22 / #24): the trap deals SIXTEEN REAL POINTS on
 * turn one and the answer deals zero. Goal-greedy cannot see a queue.
 *
 * ⚠ WHY IT WORKS NOW AND DID NOT BEFORE: at two turns the Rogue's own second
 * action did not exist, so the shovel had to be paid for out of the only
 * finisher. Here the shovel and the finisher are the SAME unit on two different
 * turns, and the Axeman covers the middle.
 *
 * ⚠ 29 = 13 + 16 EXACTLY, and the greedy line reaches 24. The script is two
 * misses and nothing else — an exhausted script HITS (types.ts), which is what
 * makes the later daggers land.
 *
 * ⚠ THE AXEMAN'S SWING MUST BE BLOCKABLE or it cannot eat a miss in the greedy
 * line and the arithmetic collapses. Ground Slam is on cooldown for the same
 * reason it was in #20: an uncastable ability still generates winning ideas.
 *
 * Vocabulary 2 (a scripted miss; a two-hit attack rolls twice). Tier-1 fate.
 */
export const PUZZLE_038: PuzzleDefinition = {
  id: 'puzzle-038',
  title: 'Puzzle #38 — Twin Fates',
  goalText: 'Defeat the enemy Warlock within 3 turns',
  goal: 'eliminate_target',
  targetUnitId: 'bulwark',
  maxPlayerTurns: 3,
  rollScript: ['miss', 'miss'],
  fateText: 'Fate is sealed: the first TWO blows struck in this fight go wide, whoever throws them. Every strike after them lands.',
  units: [
    { id: 'p1', side: 'player', slug: 'rogue', specialSlug: 'dagger_toss', position: { x: 4, y: 4 } },
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'shockwave', position: { x: 5, y: 3 }, cooldowns: { shockwave: 99 } },
    // 29 = 13 + 16, and only if the two wide rolls are already spent.
// ⚠ A WARLOCK, BECAUSE ELDRITCH BLAST IS UNBLOCKABLE. As a Ranger its own
    // arrow was blockable, so its slot ate the SECOND wide roll for free and
    // the greedy line landed both daggers after all — measured, dagger_toss
    // became a winning first move. Trap #21's lesson from the other side: an
    // enemy attack spends the queue exactly like yours, so in a fate puzzle the
    // enemy's kit has to be chosen as carefully as the player's.
    {
      id: 'bulwark', side: 'enemy', slug: 'warlock', specialSlug: 'drain',
      position: { x: 5, y: 4 }, currentHealth: 29,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { drain: 99 },
    },
    // ⚠ A DECOY WITH AN UNBLOCKABLE BASIC. It exists to give both player units
    // somewhere wrong to aim — the random-rate fix from #4 — but in a FATE
    // puzzle a decoy must also be unable to spend the queue, or it changes the
    // arithmetic every time it swings. Eldritch Blast rolls nothing.
    {
      id: 'decoy', side: 'enemy', slug: 'warlock', specialSlug: 'drain',
      position: { x: 2, y: 4 }, currentHealth: 43,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { drain: 99 },
    },
  ],
  initiativeOrder: ['p1', 'p2', 'bulwark', 'decoy'],
};
