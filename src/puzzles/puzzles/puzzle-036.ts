import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #36 — "Pin It First" (THREE TURNS: a passive YOU have to switch on).
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
 * seven wins because it changes what every later shot is worth. #50 makes the
 * same trade through a burn on the enemy's clock; this one makes it through a
 * passive on the player's own sheet.
 *
 * ⚠ THE BULWARK MUST START UNSTATUSED, which is why it is NOT rooted like most
 * enemies in this file — a rooted target would hand the +5 over for free and
 * there would be no puzzle. It holds still because the pin lands on turn one,
 * before it ever acts.
 *
 * ⚠ THE AXEMAN STARTS TWO TILES OUT, at (4,1), and this is a DIFFICULTY lever,
 * not flavour. Adjacent at (5,3) he could attack from where he stood, so a
 * player pressing buttons at random pinned-then-swung often enough to win 4.8%
 * of the time (audit 2026-09-01, n=2000 — the thinnest margin in the file, and
 * it measured 6.5% FAIL on one 200-trial run and PASS on another). Making him
 * walk first drops it to 0.4%: the same single idea, but flailing no longer
 * finds it. Reach for this lever before touching a puzzle's arithmetic.
 *
 * ⚠ HIS APPROACH TILES ARE (5,3) AND (5,5), both off the firing row (trap #26):
 * a body on a true line blocks single-target sight, so a player who walks him
 * to (4,4) blocks his own archer — the puzzle-957 mistake, available here as a trap
 * rather than as the answer.
 *
 * ⚠ 36 = 7 + 13 + 16, and the greedy line reaches 35. One point.
 *
 * Vocabulary 2 (Opportunist wants a status; a shot that trades damage for it).
 * Tier-0 fate.
 */
export const PUZZLE_036: PuzzleDefinition = {
  id: 'puzzle-036',
  title: 'Puzzle #36 — Pin It First',
  goalText: 'Defeat the enemy Barbarian within 3 turns',
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
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'shockwave', position: { x: 4, y: 1 }, cooldowns: { shockwave: 99 } },
    // 36 = 7 + 13 + 16. Unstatused at the start, on purpose.
    { id: 'bulwark', side: 'enemy', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 5, y: 4 }, currentHealth: 36, cooldowns: { whirlwind: 99 } },
  ],
  initiativeOrder: ['p1', 'p2', 'bulwark'],
};
