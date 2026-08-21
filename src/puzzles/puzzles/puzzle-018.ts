import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #18 — "Through and Through" (v2 texture: FRIENDLY FIRE / the line
 * attack does not stop where you aimed it).
 *
 * Rulebook source: ABL-9 and ABL-10, which no puzzle had used. A line ability
 * "fires a ray... and hits EVERY unit along it — friend and foe... The tile you
 * tap only chooses the direction: the ray does not stop at it, nor at the first
 * unit it hits." Every area and line ability hits your own teammates.
 *
 * The board is one straight rank: your rooted Ranger, a gap, the enemy Wizard,
 * and your Rogue standing just behind it. Piercing Shot is the bigger number
 * (12 against the Arrow's 11) and it is aimed straight down that rank — so it
 * hits the Wizard AND carries on into your own Rogue, who is sitting on 11 and
 * dies to it. The Ranger then has both turns to itself and finishes two points
 * short. The winning move is the plain Arrow: single-target, so it stops at the
 * Wizard, and the Rogue lives to throw the dagger that ends it.
 *
 * v2 shape: goal-greedy takes the highest-damage action and loses. The winning
 * first move deals LESS damage to the goal target than the alternative — #17's
 * shape, reached through a completely different rule.
 *
 * Narrow by construction, per trap #14 (enumerate every tile the trapped action
 * can be fired from). A mobile Ranger could simply step off the rank and fire a
 * ray that misses the Rogue, which would hand goal-greedy a safe angle and the
 * win. The Ranger is therefore ROOTED: MOV-4 leaves it able to use abilities
 * but unable to reposition, so the only ray that reaches the Wizard is the one
 * that also reaches the Rogue. That is the whole trap.
 *
 * Why the Rogue is BEHIND the target and not in front of it: on the near side it
 * would block line of sight (ABL-3) and make the Arrow illegal, leaving Piercing
 * as the only damaging option — the puzzle would score depth 0 and the gate
 * would correctly reject it (trap #2). Behind the target, the Arrow's path is
 * clear and the ray still runs through it.
 *
 * Slack, not arithmetic: 11 + 16 = 27 against 25 health, so it cannot be solved
 * by counting to an exact number. The greedy line ends on 2 health — the
 * near-miss that makes it worth a retry.
 *
 * Vocabulary 2 (a line attack hits everyone in its path; rooted cannot move).
 * Tier-0 fate. 2v1, per trap #9.
 */
export const PUZZLE_018: PuzzleDefinition = {
  id: 'puzzle-018',
  title: 'Puzzle #18 — Through and Through',
  goalText: 'Defeat the enemy Wizard within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'piercing',
      position: { x: 0, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 3, stacks: 1 }],
    },
    // 11 health: survives nothing on this rank except being left alone. Piercing
    // Shot's 12 is exactly what kills it.
    { id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'dagger_toss', position: { x: 6, y: 4 }, currentHealth: 11 },
    { id: 'targ', side: 'enemy', slug: 'wizard', specialSlug: 'freeze', position: { x: 4, y: 4 }, currentHealth: 25 },
  ],
  // Both player units act before the enemy, so the Wizard never interferes with
  // the line — it is a target and an obstacle, not a participant.
  initiativeOrder: ['p1', 'p2', 'targ'],
};
