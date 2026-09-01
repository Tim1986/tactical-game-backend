import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #47 — "Wait for the Weakness" (THREE TURNS: a status EXPIRES, and the
 * whole puzzle is refusing to act while it lasts).
 *
 * The third thing three turns unlocks, after #45's spare turn and #46's ground:
 * time itself. A one-turn status is invisible at two turns — it is simply true
 * for the whole puzzle. At three, initiative wraps, and a debuff on YOUR unit
 * is a window that closes.
 *
 * The Marksman is WEAKENED, one turn left. Weakened takes 4 off every damaging
 * effect (STA-3), and it wears off at the end of her own turn — so her Longshot
 * is 11 now and 15 later, and she gets exactly two turns: this one and the last.
 *
 * The Sentinel is on 25, rooted at the far wall, seven tiles away. That is
 * outside her bow's six and inside Longshot's eight, so the big shot is the only
 * thing she owns that can touch it — once, because Longshot is once per battle.
 * The Wizard's Ice Blast takes 10. 15 + 10 = 25, exactly, and only if the shot
 * is taken AFTER the weakness passes.
 *
 * Fire now and you deal a real, visible 11. Then the Wizard's 10 leaves four
 * health standing, the bow cannot span the gap, and there is nothing else.
 *
 * Cost channel (trap #15 / #22 / #24): the trap is DAMAGE TO THE GOAL, which is
 * what `eliminate_target` requires of a bait — greedy scores 11 and takes it
 * every time. The correct first move is a rooted archer doing nothing at all.
 *
 * ⚠ THE MARKSMAN IS ROOTED, and it is what makes the puzzle exist. Free to move,
 * she simply walks three tiles and the bow reaches — no window, no decision.
 * Rooted, the only variable is WHEN she shoots.
 *
 * ⚠ THE SENTINEL IS ROOTED TOO. Unrooted it advances on its own slot, wanders
 * into bow range, and the greedy line finishes with the ordinary arrow.
 *
 * ⚠ AND IT IS NOT A FIGHTER (trap #1): at 25 of 38 a wounded enemy carrying
 * First Aid heals past anything on this board. A Ranger has no heal.
 *
 * ⚠ THE EMBER IS HERE FOR SEARCH COST, NOT FOR THE PLAYER (trap #23). Its burn
 * kills it on its own slot, which prunes the tree — this solves in seconds
 * where a three-turn board with everything alive to the end took 39 minutes.
 * Under `eliminate_target` a free kill is not bait (trap #24), so it tempts
 * nobody; it is scaffolding.
 *
 * Vocabulary 2 (weakened expires at the end of your turn; a shot you only get
 * once). Tier-0 fate.
 */
export const PUZZLE_047: PuzzleDefinition = {
  id: 'puzzle-047',
  title: 'Puzzle #47 — Wait for the Weakness',
  goalText: 'Defeat the Sentinel within 3 turns',
  goal: 'eliminate_target',
  targetUnitId: 'sentinel',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 0, y: 4 },
      statusEffects: [
        { slug: 'weakened', turnsRemaining: 1, stacks: 1 },
        { slug: 'rooted', turnsRemaining: 9, stacks: 1 },
      ],
    },
    // ⚠ OUT OF RANGE WHERE IT STANDS, and off the Marksman's firing row. Standing
    // ready at range 4 made the Wizard's turn a gimme — a coin-flipping player
    // won 6% of the time (bar: 5%) because two of the three units' turns
    // succeeded by accident. Seven tiles away it has to close first, so the
    // middle turn costs a decision too.
    { id: 'p2', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 2, y: 6 } },
    // 25 = 15 + 10, and 15 only exists after the weakness passes.
    {
      id: 'sentinel', side: 'enemy', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 7, y: 4 }, currentHealth: 25,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // Scaffolding: dies to its own fire on its own slot, and prunes the search.
    {
      id: 'ember', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite',
      position: { x: 0, y: 6 }, currentHealth: 7,
      statusEffects: [{ slug: 'burning', turnsRemaining: 1, stacks: 1 }],
    },
  ],
  initiativeOrder: ['p1', 'p2', 'ember', 'sentinel'],
};
