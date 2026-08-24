import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #25 — "The Mender" (TEMPO — an ally heals the target, #15's channel).
 *
 * The enemy Cleric acts between your two units and will put 27 back on the
 * Warlock, which is more than either of your units can take off. Freeze skips
 * its slot entirely (TRN-6) and the heal never comes.
 *
 * Trap #1 is the load-bearing constraint here and the reason the Cleric is at
 * FULL health: the brain's triage scores a heal per target, and a wounded Cleric
 * values its own skin above its charge's — a hurt one would patch ITSELF and the
 * puzzle's premise would quietly evaporate. Trap #3 is why the answer is Freeze
 * and not a knife: 50 health is more than any single action on this board.
 *
 * Trap #2 shaped the geometry: the Cleric is deliberately NOT standing between
 * the Ranger and the Warlock. On that line it would block the shot, the direct
 * attack would be illegal, freezing would become the only legal move, and the
 * puzzle would score depth 0 and be correctly rejected.
 *
 * Slack: 15 against 13. Vocabulary 2. Tier-0 fate. 2v2.
 *
 * Retune 2026-08-24: Wizard starts at (0,5) [was (2,5)] — Freeze now needs a
 * move first; random win rate 8.5% -> 2.5% (<5% bar).
 */

export const PUZZLE_025: PuzzleDefinition = {
  id: 'puzzle-025',
  title: 'Puzzle #25 — The Mender',
  goalText: 'Defeat the enemy Warlock within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 0, y: 5 } },
    { id: 'p2', side: 'player', slug: 'ranger', specialSlug: 'longshot', position: { x: 1, y: 2 } },
    { id: 'targ', side: 'enemy', slug: 'warlock', specialSlug: 'drain', position: { x: 5, y: 3 }, currentHealth: 13 },
    // Full health on purpose (trap #1), and off the Ranger's line (trap #2).
    { id: 'mend', side: 'enemy', slug: 'cleric', specialSlug: 'heal', position: { x: 5, y: 5 } },
  ],
  initiativeOrder: ['p1', 'mend', 'p2', 'targ'],
};
