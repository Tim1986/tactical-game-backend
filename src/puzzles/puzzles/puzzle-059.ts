import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #59 — "Ashes Anyway" (THREE TURNS).
 *
 * ⚠ DELIBERATE SPACED NEAR-CLONE of #45, under the re-dressing licence recorded
 * with #54: one clone per skeleton, spaced by at least eight entries. Same
 * bones — a burning enemy that dies on its own slot, and a second enemy whose
 * health is exactly the player's three turns — on a different chassis: daggers
 * and a warlock instead of an axe and a wizard.
 *
 * The Ember is on 7 and burning; the fire takes exactly 7 at the start of its
 * turn, which arrives before the player's third. It is already dead.
 *
 * The Bulwark is on 43, which is Twin Strike, Eldritch Blast, and Twin Strike
 * again: 16 + 11 + 16, with nothing spare. Spend a turn killing something the
 * fire was going to kill for free and the Bulwark ends the puzzle on 16.
 *
 * Cost channel (trap #15 / #22 / #24): a free kill is worth `kills * 10000` to
 * the scorer, so `eliminate_all` is what makes the bait bite (trap #24), and
 * goal-greedy cannot refuse it.
 *
 * ⚠ ONE STACK, ONE TURN: two stacks would kill the Ember before its slot and
 * remove the temptation entirely.
 *
 * Vocabulary 2. Tier-0 fate.
 */
export const PUZZLE_059: PuzzleDefinition = {
  id: 'puzzle-059',
  title: 'Puzzle #59 — Ashes Anyway',
  goalText: 'Defeat BOTH enemies within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'rogue', specialSlug: 'dagger_toss', position: { x: 4, y: 4 }, cooldowns: { dagger_toss: 99 } },
    { id: 'p2', side: 'player', slug: 'warlock', specialSlug: 'fear', position: { x: 5, y: 2 }, cooldowns: { fear: 99 } },
    // 43 = 16 + 11 + 16.
    {
      id: 'bulwark', side: 'enemy', slug: 'warlock', specialSlug: 'drain',
      position: { x: 5, y: 4 }, currentHealth: 43,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { drain: 99 },
    },
    // Already dead: 7 health, 7 of fire.
    {
      id: 'ember', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite',
      position: { x: 3, y: 6 }, currentHealth: 7,
      statusEffects: [{ slug: 'burning', turnsRemaining: 1, stacks: 1 }],
      cooldowns: { ignite: 99 },
    },
  ],
  initiativeOrder: ['p1', 'p2', 'ember', 'bulwark'],
};
