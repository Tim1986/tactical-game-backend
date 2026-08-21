import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #19 — "The Doorway" (v2 texture: BLOCKED PATH / spend the shot that
 * opens the road, not the one that scores).
 *
 * Rulebook source: MOV-3, unused until now — "You can NEVER move through an
 * enemy unit's tile. Enemies block movement completely — there is no way around
 * except an open path." Paired with MOV-1, where a diagonal costs two steps, so
 * going around is genuinely more expensive than it looks.
 *
 * The enemy Sorcerer is pinned against the east edge with its Acolyte standing
 * directly in front of it. Your Rogue has the damage to end this on its own —
 * 16 against the Sorcerer's 14 — and cannot get to it. Every tile adjacent to
 * the Sorcerer is either the Acolyte's, or five steps away around the body when
 * the Rogue has four. The Ranger's Arrow, meanwhile, has a clean shot at the
 * Sorcerer for 11: the biggest number it can put on the goal target, and three
 * short of what the job needs.
 *
 * So the Ranger must shoot the ACOLYTE instead — a shot that does nothing at all
 * to the goal target, and opens the doorway the Rogue walks through.
 *
 * v2 shape: goal-greedy takes the 11 into the Sorcerer, the Rogue arrives at a
 * sealed door with nothing to hit, and the Sorcerer lives on 3. That near-miss
 * is the retry hook — the player can see how close it was and not yet see why.
 *
 * Why the cost is invisible to damage, per trap #15: the price of the greedy
 * shot is not that it deals less — it deals MORE — it is that the road stays
 * shut. Traps whose punishment is "your damage gets nullified" are seen through
 * by goal-greedy, which scores damage actually dealt; this one is paid entirely
 * in geometry.
 *
 * Narrow by construction:
 *  - The Acolyte sits on the ONLY adjacent tile the Rogue can reach. The other
 *    two, (7,3) and (7,5), are five steps around the body against four movement,
 *    and a diagonal does not shorten it (MOV-1). Kill the Acolyte and the same
 *    tile is three steps of open rank.
 *  - The Ranger is placed OFF the rank at (4,2) so it is never on a straight
 *    line with the Acolyte and the Sorcerer together. Standing behind the
 *    Acolyte would have made the Arrow illegal by line of sight (ABL-3) and left
 *    shooting the Acolyte as the only legal action — depth 0, correctly rejected
 *    (trap #2).
 *  - The Acolyte is on 10 against the Arrow's 11: one shot exactly opens it.
 *    Pinning Shot's 7 does not, so there is no second way to spend the turn.
 *
 * Slack, not arithmetic: the Rogue's 16 against 14 health. The puzzle cannot be
 * solved by counting, because counting says the Ranger's shot is worth more.
 *
 * Vocabulary 1 (enemies block movement). Tier-0 fate. 2v2.
 */
export const PUZZLE_019: PuzzleDefinition = {
  id: 'puzzle-019',
  title: 'Puzzle #19 — The Doorway',
  goalText: 'Defeat the enemy Sorcerer within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    // Off the rank on purpose: no straight line through the Acolyte to the
    // Sorcerer, so both shots stay legal and greedy has a real option to take.
    { id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'pinning', position: { x: 4, y: 2 } },
    // Four movement. Every route to the Sorcerer is five steps while the
    // Acolyte stands; three the moment it falls.
    { id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'expose', position: { x: 3, y: 4 } },
    { id: 'targ', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 7, y: 4 }, currentHealth: 14 },
    // 10 health: the Arrow's 11 opens the door, Pinning Shot's 7 does not.
    { id: 'blok', side: 'enemy', slug: 'wizard', specialSlug: 'cold_snap', position: { x: 6, y: 4 }, currentHealth: 10 },
  ],
  // Both player units act before either enemy, so the door never moves on its
  // own — the Acolyte is a wall, not a participant.
  initiativeOrder: ['p1', 'p2', 'targ', 'blok'],
};
