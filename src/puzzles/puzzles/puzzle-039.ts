import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #39 — "Walk It Off" (TEMPO — the target patches itself, #47's channel).
 *
 * The enemy Fighter is on 13 with First Aid and takes its slot between your two
 * units. Ice Blast is the biggest number and the trap; Freeze skips the slot and
 * the 18 never lands.
 *
 * The variation from #47 and #29 is the finisher's problem: here the Rogue starts
 * north of the Fighter and has to come around to reach it, so the player is
 * managing an approach at the same time as the tempo question. Same lesson, more
 * to hold in your head at once.
 *
 * Slack: 16 against 13. Vocabulary 2. Tier-0 fate. 2v1, per trap #9.
 */
export const PUZZLE_039: PuzzleDefinition = {
  id: 'puzzle-039',
  title: 'Puzzle #39 — Walk It Off',
  goalText: 'Defeat the enemy Fighter within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 1, y: 3 } },
    { id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'expose', position: { x: 4, y: 6 } },
    { id: 'targ', side: 'enemy', slug: 'fighter', specialSlug: 'second_wind', position: { x: 4, y: 3 }, currentHealth: 13 },
  ],
  initiativeOrder: ['p1', 'targ', 'p2'],
};
