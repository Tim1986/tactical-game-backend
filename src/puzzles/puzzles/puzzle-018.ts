import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #18 — "Into the Ring" (THREE TURNS: displacement into an AREA rather
 * than onto a line).
 *
 * A cousin of #44 rather than a clone: there the Warlock's Fear pushed an enemy
 * onto a straight firing line, here it pushes one into the ring of a blast. Ring
 * of Fire hits every tile around a chosen centre and SPARES the centre itself
 * (ABL-11), so the two enemies have to end up on the same circle — not the same
 * row.
 *
 * The Bulwark is on 24 and the Cur on 14, three tiles apart and both rooted, so
 * no single ring reaches both. Fear drives a target three tiles directly away
 * from the caster; standing where he does, "away" is into the ring that already
 * covers the Bulwark.
 *
 * So the fire waits for turn three: bolt on turn one, Fear on turn two, and one
 * Ring of Fire takes 14 off each — enough for the Cur exactly, and enough for
 * the Bulwark on top of the bolt.
 *
 * Cast it early and it catches the Bulwark alone for 14, the once-per-battle
 * blast is gone, and the Cur is still standing when the puzzle ends.
 *
 * Cost channel (trap #15 / #22 / #24): 14 now against 10 now, on the goal, under
 * `eliminate_all` where every point scores. Greedy takes the bigger number and
 * loses the only tool that can finish the second enemy.
 *
 * ⚠ FEAR DEALS NO DAMAGE (trap #27), which is what keeps the Warlock's turn a
 * pure setup — Shield Bash would simply kill a 14-health target and dissolve
 * the puzzle.
 *
 * ⚠ BOTH ENEMIES ROOTED AND FURTHER APART THAN ONE RING (trap #25): pinned so
 * neither wanders into the blast on its own, and separated so the two orderings
 * are not interchangeable.
 *
 * ⚠ 24 = 10 + 14 and 14 = one Ring of Fire, both exact.
 *
 * ⚠ THE TWO ENEMIES END TWO TILES APART, not adjacent, so the ring's centre is
 * the empty tile BETWEEN them. An earlier draft left them adjacent after the
 * push, where every candidate centre also had to dodge the spared middle, and
 * the puzzle measured NOT SOLVABLE. With a gap of two there is exactly one
 * centre that covers both, and it is empty by construction.
 *
 * Vocabulary 3 (a ring that spares its centre; a push of exactly three; a
 * once-per-battle blast). Tier-0 fate.
 */
export const PUZZLE_018: PuzzleDefinition = {
  id: 'puzzle-018',
  title: 'Puzzle #18 — Into the Ring',
  goalText: 'Defeat BOTH enemies within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'sorcerer', specialSlug: 'ffh',
      position: { x: 2, y: 5 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // North of the Cur: three tiles "away from the caster" is south, into the ring.
    { id: 'p2', side: 'player', slug: 'warlock', specialSlug: 'fear', position: { x: 5, y: 0 } },
    // 24 = 10 + 14.
    {
      id: 'bulwark', side: 'enemy', slug: 'warlock', specialSlug: 'drain',
      position: { x: 5, y: 6 }, currentHealth: 24,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { drain: 99 },
    },
    // 14 = one Ring of Fire, once it is standing in it.
    {
      id: 'cur', side: 'enemy', slug: 'warlock', specialSlug: 'drain',
      position: { x: 5, y: 1 }, currentHealth: 14,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { drain: 99 },
    },
  ],
  initiativeOrder: ['p1', 'p2', 'bulwark', 'cur'],
};
