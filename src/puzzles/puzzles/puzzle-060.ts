import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #60 — "The Long Road" (THREE TURNS).
 *
 * ⚠ DELIBERATE SPACED NEAR-CLONE of #46 (re-dressing licence, recorded with
 * #54). Same bones — a free kill that costs the ground you needed — on a
 * different chassis: a sword and a bolt instead of an axe and a blast.
 *
 * The Bulwark is rooted six tiles away, which is exactly two full moves with
 * nothing spare. The Ember is on 7 and burning, two steps off that road; the
 * fire kills it on its own slot whether the Fighter walks over or not.
 *
 * A turn holds one move. Step aside to take the free kill and the second move
 * ends three tiles short of the swing.
 *
 * Cost channel (trap #15 / #22 / #24): the bait is a whole enemy, worth
 * `kills * 10000` under `eliminate_all`, against a correct opening of a Fighter
 * walking across an empty board.
 *
 * ⚠ 21 = 11 + 10 exactly, and the Fighter's special is spent so an uncastable
 * ability cannot generate cosmetic winning ideas (the #46 lesson).
 *
 * Vocabulary 2. Tier-0 fate.
 */
export const PUZZLE_060: PuzzleDefinition = {
  id: 'puzzle-060',
  title: 'Puzzle #60 — The Long Road',
  goalText: 'Defeat BOTH enemies within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'fighter', specialSlug: 'shield_bash', position: { x: 0, y: 4 }, cooldowns: { shield_bash: 99 } },
    { id: 'p2', side: 'player', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 4, y: 6 }, cooldowns: { ignite: 99 } },
    // 21 = 11 + 10. Rooted six tiles away: two full moves, nothing spare.
    {
      id: 'bulwark', side: 'enemy', slug: 'warlock', specialSlug: 'drain',
      position: { x: 7, y: 4 }, currentHealth: 21,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { drain: 99 },
    },
    // Two steps off the road, and already dead.
    {
      id: 'ember', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite',
      position: { x: 0, y: 6 }, currentHealth: 7,
      statusEffects: [{ slug: 'burning', turnsRemaining: 1, stacks: 1 }],
      cooldowns: { ignite: 99 },
    },
  ],
  initiativeOrder: ['p1', 'p2', 'ember', 'bulwark'],
};
