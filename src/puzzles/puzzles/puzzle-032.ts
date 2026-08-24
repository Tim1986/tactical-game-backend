import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #32 — "Cold Comfort" (ANSWER: COLD SNAP — the first PASSIVE puzzle).
 *
 * No puzzle in the rotation has ever set a passive on a player unit. This one
 * turns on PAS-6: Opportunist deals +4 against a target suffering ANY status,
 * and a Ranger deals +5 instead.
 *
 * The enemy Warlock is on 27. Ice Blast for 10 and Longshot for 15 comes to 25
 * and leaves it standing on 2 — the whole puzzle is those two points. Cold Snap
 * is the WEAKER opener at 9, and it freezes: the Warlock is then a target
 * "suffering a status", the Ranger's Opportunist wakes up, and Longshot lands
 * for 20 instead of 15.
 *
 * Read the Ranger's card on the intro screen — the passive is printed there, and
 * it is the only thing on the board that explains why the smaller spell is the
 * right one.
 *
 * NOT a Freeze answer despite the frozen status, and the board is built to make
 * that unambiguous: both enemies act AFTER both your units, so skipping the
 * Warlock's slot is worth exactly nothing here. The status is a key, not a
 * disable — which is the lesson, and it is new to the rotation.
 *
 * Slack: 9 + 20 against 27. Vocabulary 2 (Opportunist; a frozen unit counts as
 * suffering a status). Tier-0 fate. 2v1.
 *
 * Retune 2026-08-24: Wizard to (0,4) [was (2,4)], Warlock to (7,4) [was (6,4)],
 * HP 27 -> 29 (cold_snap 9 + opportunist Longshot 20, exact). Random 13.5% -> 4.5%.
 */
export const PUZZLE_032: PuzzleDefinition = {
  id: 'puzzle-032',
  title: 'Puzzle #32 — Cold Comfort',
  goalText: 'Defeat the enemy Warlock within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'wizard', specialSlug: 'cold_snap', position: { x: 0, y: 4 } },
    // The passive is the puzzle. Ranger Opportunist is +5, not +4 (PAS-6).
    { id: 'p2', side: 'player', slug: 'ranger', specialSlug: 'longshot', passiveSlug: 'opportunist', position: { x: 1, y: 2 } },
    { id: 'targ', side: 'enemy', slug: 'warlock', specialSlug: 'drain', position: { x: 7, y: 4 }, currentHealth: 29 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ'],
};
