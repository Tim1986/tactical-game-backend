import type { PuzzleDefinition } from '../types.js';
/**
 * Puzzle #15 — "Cut the Lifeline" (v2 texture: TEMPO).
 *
 * The enemy Cleric acts BETWEEN your two units and will heal the wounded
 * Ranger out of reach of your Barbarian's axe. Chipping the Ranger — the play
 * everyone tries — is exactly what triggers the heal and wastes the puzzle.
 * Freeze the Cleric instead: a frozen unit's initiative slot is skipped
 * entirely (rulebook TRN-6), so the heal never comes and the axe finishes.
 *
 * Why it clears the v2 bar where batch #1 did not: the Wizard CAN hit the goal
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
export declare const PUZZLE_015: PuzzleDefinition;
//# sourceMappingURL=puzzle-015.d.ts.map