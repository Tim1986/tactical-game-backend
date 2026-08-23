import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #26 — "The Narrow Shelf" (BLOCKED PATH, slow finisher).
 *
 * The same MOV-3 lock as #19/#21/#22, tightened by giving the job to a
 * Barbarian: three movement instead of the Rogue's four, so the box does not
 * need to be as deep. The enemy Cleric is wedged against the east edge with a
 * Wisp on the only square the Barbarian can reach; every other square that
 * would let Whirlwind touch it is four steps away against three.
 *
 * ⚠ REBUILT 2026-08-22 for the RING Whirlwind. Whirlwind used to hit only the
 * 4 cardinal tiles, so the Barbarian at (4,2) had to stand on (6,2) — the
 * Wisp's square — and the block was airtight. As an 8-tile ring it can also
 * strike from the DIAGONALS (6,1) and (6,3), both three steps from (4,2), so
 * the Wisp stopped mattering and the puzzle collapsed to goal-greedy. The
 * Barbarian therefore starts at (3,2): from there (6,2) is exactly three steps
 * and (6,1)/(6,3) are four, so the Wisp's square is once again the ONLY tile
 * that puts the Cleric inside the ring.
 *
 * The Arrow is the whole puzzle. It must be spent on the WISP (11 against 10 —
 * Pinning Shot's 7 will not do it), which opens the shelf for a 16-damage
 * Whirlwind. Spend it on the Cleric instead and the Barbarian has nowhere to
 * stand.
 *
 * Why chip damage cannot substitute: the Cleric sits at 14 of 50, under the
 * brain's 40% heal threshold, so it restores 27 the moment it gets a turn.
 * Both player units act before it (initiative below), so the kill has to land
 * as one burst on turn 1 or not at all.
 *
 * Note the Barbarian's Whirlwind is safe to use here only because nothing of
 * yours ends up adjacent to it (ABL-10: every area ability hits allies too) —
 * and "adjacent" now means all 8 tiles. The Ranger at (4,5) is three away from
 * the Barbarian's landing square, so it stays clear.
 *
 * Slack: 16 against 14, not an exact sum. Vocabulary 1. Tier-0 fate. 2v2.
 */
export const PUZZLE_026: PuzzleDefinition = {
  id: 'puzzle-026',
  title: 'Puzzle #26 — The Narrow Shelf',
  goalText: 'Defeat the enemy Cleric within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'pinning', position: { x: 4, y: 5 } },
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 3, y: 2 } },
    { id: 'targ', side: 'enemy', slug: 'cleric', specialSlug: 'heal', position: { x: 7, y: 2 }, currentHealth: 14 },
    // 10 health: the Arrow's 11 opens the shelf, Pinning Shot's 7 does not.
    { id: 'blok', side: 'enemy', slug: 'wizard', specialSlug: 'cold_snap', position: { x: 6, y: 2 }, currentHealth: 10 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'blok'],
};
