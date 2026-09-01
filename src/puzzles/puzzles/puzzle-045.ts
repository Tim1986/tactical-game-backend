import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #45 — "Let It Burn" (THREE TURNS, and the first `eliminate_all` where
 * the winning move is to leave an enemy alone).
 *
 * Trap #10 said eliminate_all was undesignable at two turns: two kills consume
 * the whole budget, so there is no turn left for the setup move that depth ≥ 1
 * requires. Three turns is what makes it designable — and this puzzle spends
 * the extra turn on nothing at all, which is the point.
 *
 * The Ember is on 7 and BURNING. Burning ticks 7 at the start of its own turn
 * (STA-2), and its slot arrives before your third. It is already dead; it just
 * does not know yet. Killing it costs you a turn to buy something the fire was
 * going to give you for free.
 *
 * The Bulwark is on 36, and 36 is exactly three player turns: 13 + 10 + 13.
 * There is no slack anywhere. Spend a turn on the Ember and the Bulwark
 * finishes the puzzle standing on 13.
 *
 * Cost channel (trap #15 / trap #22): this is the cleanest turn-one trap the
 * rotation has. `goalScore` for eliminate_all is `kills * 10000 + dmg * 100`,
 * so a KILL is worth a hundred points of damage — goal-greedy will always take
 * the free one, and the free one is the mistake. The trap deals real, visible,
 * scoring progress (a whole enemy!) and loses by a full 13.
 *
 * ⚠ THE ARITHMETIC IS EXACT AND LOAD-BEARING. 13 + 10 + 13 = 36 with nothing
 * spare. Any slack and a turn spent on the Ember becomes affordable; any less
 * and the puzzle is unsolvable. Re-derive before touching a number.
 *
 * ⚠ ONE STACK, ONE TURN. Two stacks would kill the Ember before its slot and
 * remove the temptation; a longer burn would let it tick twice and hand the
 * player free damage on the Bulwark it did not earn.
 *
 * ⚠ THE EMBER MUST BE REACHABLE by both player units, or the trap is not a
 * temptation, it is scenery. Barbarian moves 3 to swing at it; the Wizard has
 * it inside Ice Blast's 5.
 *
 * Three turns also means the Barbarian acts TWICE (initiative wraps), which is
 * where the second 13 comes from — cooldown economy and the wrap are the two
 * things this format unlocks, and this puzzle uses the wrap.
 *
 * Vocabulary 2 (burning kills on its victim's own slot; a kill you did not have
 * to buy). Tier-0 fate.
 */
export const PUZZLE_045: PuzzleDefinition = {
  id: 'puzzle-045',
  title: 'Puzzle #45 — Let It Burn',
  goalText: 'Defeat BOTH enemies within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'barbarian', specialSlug: 'shockwave', position: { x: 4, y: 4 } },
    { id: 'p2', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 2, y: 4 } },
    // 36 = 13 + 10 + 13, exactly three player turns and not one point more.
    { id: 'bulwark', side: 'enemy', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 5, y: 4 }, currentHealth: 36 },
    // Already dead: 7 health, 7 of burning, and its slot comes before your third turn.
    {
      id: 'ember', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite',
      position: { x: 4, y: 2 }, currentHealth: 7,
      statusEffects: [{ slug: 'burning', turnsRemaining: 1, stacks: 1 }],
      revealAbilities: true,
    },
  ],
  initiativeOrder: ['p1', 'p2', 'ember', 'bulwark'],
};
