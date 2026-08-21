import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #22 — "Both Hands" (BLOCKED PATH with TWO doors — only one is real).
 *
 * The escalation of #19/#21: the enemy Warlock is walled by two bodies, and the
 * shot only opens one of them. Killing the wrong one leaves the Rogue exactly as
 * stranded as killing neither — the Brute's square is four steps from the Rogue,
 * the Acolyte's is six, and the Rogue has four.
 *
 * So the puzzle adds a DISCRIMINATION on top of the blocked-path idea: not "spend
 * the shot on a door instead of the target", but "work out which of two doors is
 * the one you can actually walk through". Distance, not damage, decides it — and
 * the Acolyte is the softer, more tempting target of the two.
 *
 * Slack: 16 against 13. Vocabulary 1. Tier-0 fate. 2v3.
 */
export const PUZZLE_022: PuzzleDefinition = {
  id: 'puzzle-022',
  title: 'Puzzle #22 — Both Hands',
  goalText: 'Defeat the enemy Warlock within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'pinning', position: { x: 2, y: 1 } },
    { id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'expose', position: { x: 2, y: 4 } },
    { id: 'targ', side: 'enemy', slug: 'warlock', specialSlug: 'drain', position: { x: 6, y: 4 }, currentHealth: 13 },
    // The reachable door: kill this and the Rogue walks (5,4) in three steps.
    { id: 'brut', side: 'enemy', slug: 'fighter', specialSlug: 'shield_bash', position: { x: 5, y: 4 }, currentHealth: 10 },
    // The tempting door: softer, but its square is six steps away — opening it
    // strands the Rogue exactly as thoroughly as opening nothing.
    { id: 'acol', side: 'enemy', slug: 'wizard', specialSlug: 'cold_snap', position: { x: 6, y: 6 }, currentHealth: 8 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'brut', 'acol'],
};
