import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #29 — "Field Dressing" (TEMPO, #47's channel, longer reach).
 *
 * TRN-6: a frozen unit's slot is skipped entirely. The enemy Fighter is on 12
 * with First Aid ready and acts between your two units. The Wizard's Ice Blast
 * is the biggest number on the board and hands the Fighter a turn it uses to put
 * 18 back on; Longshot then falls short.
 *
 * Differs from #47 in the shape of the finish rather than the trap: there the
 * Rogue had to walk into contact, so the Fighter's position mattered. Here the
 * Ranger is already in range from across the board, which strips the puzzle down
 * to the pure tempo question — the geometry has nothing left to say, and the only
 * thing on the table is whether you spend the first turn dealing damage or
 * denying a turn.
 *
 * Slack: 15 against 12. Vocabulary 2. Tier-0 fate. 2v1, per trap #9.
 *
 * Retune 2026-08-24: the Wizard starts at (0,4) [was (3,4)] so Freeze needs a
 * move first — random lines were stumbling into freeze-then-longshot 15% of
 * the time against the <5% bar. Line unchanged, luck removed.
 */
export const PUZZLE_029: PuzzleDefinition = {
  id: 'puzzle-029',
  title: 'Puzzle #29 — Field Dressing',
  goalText: 'Defeat the enemy Fighter within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 0, y: 4 } },
    { id: 'p2', side: 'player', slug: 'ranger', specialSlug: 'longshot', position: { x: 1, y: 2 } },
    { id: 'targ', side: 'enemy', slug: 'fighter', specialSlug: 'second_wind', position: { x: 6, y: 4 }, currentHealth: 12 },
  ],
  initiativeOrder: ['p1', 'targ', 'p2'],
};
