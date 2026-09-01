import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #58 — "Pin It First" (THREE TURNS: a passive YOU have to switch on).
 *
 * Opportunist gives a Ranger +5 against a target that carries ANY status effect
 * (PAS-6). The Bulwark carries none, so her arrow is a plain 11 — and Pinning
 * Shot, which deals only 7, is what turns the passive on for everything that
 * follows.
 *
 * Seven now buys five later: pin on turn one, let the Axeman put 13 in, and the
 * last arrow lands for 16 against a rooted target. 7 + 13 + 16 = 36.
 *
 * Shoot the bigger arrow first and the passive never wakes up. 11 + 13 + 11 is
 * 35, and the Bulwark ends the puzzle standing on 1.
 *
 * Cost channel (trap #15 / #22 / #24): the trap is the LARGER IMMEDIATE NUMBER
 * on the goal — eleven against seven — and goal-greedy takes it every time. The
 * seven wins because it changes what every later shot is worth. #55 makes the
 * same trade through a burn on the enemy's clock; this one makes it through a
 * passive on the player's own sheet.
 *
 * ⚠ THE BULWARK MUST START UNSTATUSED, which is why it is NOT rooted like most
 * enemies in this file — a rooted target would hand the +5 over for free and
 * there would be no puzzle. It holds still because the Axeman is standing next
 * to it, which is reason enough for a melee enemy.
 *
 * ⚠ THE AXEMAN IS OFF THE FIRING ROW (trap #26): a body on a true line blocks
 * single-target sight, and orthogonal adjacency is what lets him reach at all.
 *
 * ⚠ 36 = 7 + 13 + 16, and the greedy line reaches 35. One point.
 *
 * Vocabulary 2 (Opportunist wants a status; a shot that trades damage for it).
 * Tier-0 fate.
 */
export const PUZZLE_058: PuzzleDefinition = {
  id: 'puzzle-058',
  title: 'Puzzle #58 — Pin It First',
  goalText: 'Defeat the Bulwark within 3 turns',
  goal: 'eliminate_target',
  targetUnitId: 'bulwark',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'pinning',
      passiveSlug: 'opportunist', position: { x: 0, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'shockwave', position: { x: 5, y: 3 }, cooldowns: { shockwave: 99 } },
    // 36 = 7 + 13 + 16. Unstatused at the start, on purpose.
    { id: 'bulwark', side: 'enemy', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 5, y: 4 }, currentHealth: 36, cooldowns: { whirlwind: 99 } },
  ],
  initiativeOrder: ['p1', 'p2', 'bulwark'],
};
