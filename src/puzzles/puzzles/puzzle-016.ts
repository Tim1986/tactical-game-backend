import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #16 — "Cut the Lifeline" (v2 texture: TEMPO).
 *
 * The enemy Cleric acts BETWEEN your two units and will heal the wounded
 * Ranger out of reach of your Barbarian's axe. Chipping the Ranger — the play
 * everyone tries — is exactly what triggers the heal and wastes the puzzle.
 * Freeze the Cleric instead: a frozen unit's initiative slot is skipped
 * entirely (rulebook TRN-6), so the heal never comes and the axe finishes.
 *
 * Why it clears the v2 bar where batch puzzle-901 did not: the Wizard CAN hit the goal
 * target from where it stands, so "damage the goal" is the highest-scoring
 * first move and a goal-aware greedy player takes it — and loses. The winning
 * first move deals ZERO damage to the goal target.
 *
 * Note the Cleric is at FULL health on purpose: a wounded Cleric heals ITSELF
 * (the brain's triage bonus outbids helping an ally), which quietly breaks the
 * whole tempo premise. Verified by tracing the brain, not assumed.
 *
 * Vocabulary 2 (an enemy can heal; frozen skips a turn). Tier-0 fate. 2v2.
 */
export const PUZZLE_016: PuzzleDefinition = {
  id: 'puzzle-016',
  title: 'Puzzle #16 — Cut the Lifeline',
  goalText: 'Defeat the enemy Ranger within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1',   side: 'player', slug: 'wizard',    specialSlug: 'freeze', position: { x: 2, y: 2 } },
    { id: 'p2',   side: 'player', slug: 'barbarian', specialSlug: 'roar',   position: { x: 6, y: 5 } },
    // introRelevant: the goal says kill the Ranger, but the puzzle IS this
    // heal — freeze the Cleric or the damage is undone. Without its card the
    // intended line is unguessable, which is the bar for showing an enemy.
    { id: 'heal', side: 'enemy',  slug: 'cleric',    specialSlug: 'heal',   position: { x: 5, y: 4 }, introRelevant: true },
    { id: 'targ', side: 'enemy',  slug: 'ranger',    specialSlug: 'pinning', position: { x: 6, y: 4 }, currentHealth: 11 },
  ],
  initiativeOrder: ['p1', 'heal', 'p2', 'targ'],
};
