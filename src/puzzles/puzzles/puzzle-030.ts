import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #30 — "Reel and Finish" (PULL — the oldest family, no camouflage).
 *
 * ABL-13: a pull drags the target toward the caster and stops one tile short.
 * The enemy Wizard stands four tiles clear of your Fighter, which is one tile
 * more than the Fighter can cross and still swing. Demon Blast is the Warlock's
 * biggest number at 11 and leaves the Wizard exactly where it was; Shadow Grasp
 * is worth only 9 and hauls it into contact.
 *
 * #24 puts this same idea behind a loadout choice; this one states it plainly,
 * which is the point of having both — the rotation should teach a mechanic
 * openly somewhere before hiding it behind a picker somewhere else.
 *
 * Slack: 9 + 16 against 21. Vocabulary 2. Tier-0 fate. 2v1.
 */
export const PUZZLE_030: PuzzleDefinition = {
  id: 'puzzle-030',
  title: 'Puzzle #30 — Reel and Finish',
  goalText: 'Defeat the enemy Wizard within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'warlock', specialSlug: 'drain',
      // [CAMO SWEEP 2026-08-31] The loadout used to announce the answer: a
      // Warlock holding Grasp IS "this is the pull puzzle", which the two-poles
      // doc names as the tell every post-#1 puzzle reintroduced. Now the player
      // picks, the DEFAULT is the biggest number (Essence Drain's 10) so the
      // pick costs something, and both decoys are live: Drain out-damages Grasp
      // and still cannot close the gap, Fear moves the target the WRONG WAY.
      specialChoices: ['drain', 'fear', 'grasp'],
      position: { x: 2, y: 3 },
    },
    { id: 'p2', side: 'player', slug: 'fighter', specialSlug: 'shield_bash', position: { x: 2, y: 5 } },
    { id: 'targ', side: 'enemy', slug: 'wizard', specialSlug: 'cold_snap', position: { x: 6, y: 4 }, currentHealth: 21 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ'],
};
