import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #2 — "Cover Her" (THREE TURNS: save your own unit — trap #5, which
 * was arithmetically walled at two turns and is not any more).
 *
 * Trap #5 ruled "protect your own finisher" out of the two-turn format: a dead
 * player unit costs no turn, so the rescue never paid for itself. The doc noted
 * that three turns softens the inequality and told whoever came next to
 * re-derive the numbers rather than assume. Re-derived, it works — because the
 * unit being saved is the only one who can deal its share of the damage, and
 * losing it removes that share permanently.
 *
 * The Sentinel is on 28, seven tiles from the Marksman — beyond her bow's six,
 * inside Longshot's eight. So the archer contributes exactly one shot all
 * puzzle, 15, and the Reaver's 13 has to be the rest. 15 + 13 = 28.
 *
 * The Cur has 13 in its arms and the Reaver is standing on 12. The Cur's slot
 * falls between the Marksman's first turn and the Reaver's only turn, so unless
 * something happens on turn one, the Reaver dies before she ever swings — and
 * with her goes half the puzzle's damage, permanently. The bow kills the Cur in
 * one shot: 11 against 11.
 *
 * Cost channel (trap #15 / #22 / #24): the trap is Longshot, fired early, into
 * the goal — fifteen points of real, visible, scoring progress. The correct
 * opening is an arrow into a completely different enemy, which under
 * `eliminate_target` scores exactly ZERO (trap #24: a kill is only bait when the
 * goal is eliminate_all — here it is deliberately NOT, so the free kill reads as
 * worthless to the scorer and to a greedy human alike).
 *
 * ⚠ THE ARCHER'S BOW CANNOT REACH THE SENTINEL. That is what makes Longshot a
 * one-shot resource rather than an opening move: fire it on turn one and turns
 * two and three have nothing that spans the gap. Seven tiles against a bow of
 * six and a Longshot of eight — a one-tile margin, so re-measure if anything
 * moves.
 *
 * ⚠ THE REAVER IS ON 12 AND THE CUR HITS FOR 13. One point of margin, on
 * purpose: the rescue must be all-or-nothing, or "let her take the hit and swing
 * anyway" becomes a second answer.
 *
 * ⚠ THE SENTINEL IS ROOTED and carries no heal (trap #1). The Cur is a
 * Barbarian for the same reason.
 *
 * Vocabulary 2 (a unit that dies before it acts; a shot you only get once).
 * Tier-0 fate.
 */
export const PUZZLE_002: PuzzleDefinition = {
  id: 'puzzle-002',
  title: 'Puzzle #2 — Cover Her',
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
      // ⚠ ROOTED, and it is load-bearing twice. One step forward puts the
      // Sentinel inside the bow's six, which turns Longshot from a one-shot
      // resource into an opening move. Worse: losing the Reaver GIVES the
      // archer her turns — with the melee dead the player's three turns all
      // belong to the bow, and 15 + 11 + 11 outruns a 28-health target. Rooted,
      // sacrificing the Reaver costs 13 and buys nothing.
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // 12 health against a 13-damage swing: she does not survive the Cur's turn.
    {
      id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'shockwave',
      position: { x: 5, y: 3 }, currentHealth: 12,
      cooldowns: { shockwave: 99 },
    },
    // 28 = 15 + 13, and the 15 exists exactly once.
    {
      id: 'sentinel', side: 'enemy', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 7, y: 4 }, currentHealth: 28,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // 11 health, one arrow. Its slot comes before the Reaver's only turn.
    { id: 'cur', side: 'enemy', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 4, y: 3 }, currentHealth: 11 },
  ],
  initiativeOrder: ['p1', 'cur', 'p2', 'sentinel'],
};
