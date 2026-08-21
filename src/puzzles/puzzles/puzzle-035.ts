import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #35 — "Out of Reach" (ANSWER: PINNING SHOT — root the healer where it
 * stands).
 *
 * Freeze, Shadow Grasp and Purify are all closed as answers (Fable, 2026-08-21),
 * and no 2-turn puzzle may root a PLAYER unit any more. This roots an ENEMY,
 * which no puzzle has ever done as its winning move.
 *
 * The enemy Mender is three tiles from its charge and Heal only reaches two. It
 * does not need to be silenced — it needs to be unable to take one step. Pinning
 * Shot roots it where it stands (STA-3: a rooted unit cannot move but may still
 * act) and the step never happens.
 *
 * That distinction is the whole puzzle and it is new to the rotation. #15 and
 * #25 answer the same threat by skipping the healer's slot outright; here the
 * healer keeps its turn and is welcome to it, because from where it is standing
 * there is nothing it can do with it.
 *
 * The greedy line is the Arrow into the Warlock for 11 — the biggest number on
 * the goal target, and the reason it loses: the Mender walks up, returns 27, and
 * the Rogue's 16 is nowhere near enough. Pinning Shot puts 7 into the MENDER and
 * nothing at all into the Warlock, which is why goal-greedy will not look at it.
 *
 * The Mender is at FULL health (trap #1: a wounded Cleric prioritises its own
 * skin and would never have walked over), and off the Ranger's line to the
 * Warlock (trap #2: on it, the Arrow would be illegal and the puzzle would score
 * depth 0).
 *
 * Slack: 16 against 14. Vocabulary 2 (rooted stops movement, not actions; Heal
 * reaches 2 tiles). Tier-0 fate. 2v2.
 */
export const PUZZLE_035: PuzzleDefinition = {
  id: 'puzzle-035',
  title: 'Puzzle #35 — Out of Reach',
  goalText: 'Defeat the enemy Warlock within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'pinning', position: { x: 1, y: 2 } },
    { id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'expose', position: { x: 4, y: 6 } },
    { id: 'targ', side: 'enemy', slug: 'warlock', specialSlug: 'drain', position: { x: 5, y: 4 }, currentHealth: 14 },
    // Three tiles from its charge, and Heal reaches two. One step is all it
    // needs — and one step is exactly what Pinning Shot takes away.
    { id: 'mend', side: 'enemy', slug: 'cleric', specialSlug: 'heal', position: { x: 5, y: 7 } },
  ],
  initiativeOrder: ['p1', 'mend', 'p2', 'targ'],
};
