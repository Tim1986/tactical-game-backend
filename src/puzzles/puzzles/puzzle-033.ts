import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #33 — "The Softer Blow" (v2 texture: OVERKILL / the strong attack ruins the finish).
 *
 * Your Rogue is ROOTED right beside the enemy Ranger with Kill Shot ready — and
 * Kill Shot only works at 22 health or below. The Ranger is on 30, so the
 * Fighter has to soften it first. Shield Bash is the obvious opener: 16
 * unblockable, the biggest number on the board, and it drops the Ranger to 14 —
 * comfortably under the threshold. It also knocks the Ranger two tiles away, and
 * a rooted Rogue cannot follow. The winning move is the WEAKER one: the plain
 * sword for 11, which leaves the Ranger on 19 and standing exactly where it was.
 *
 * v2 shape: the goal-greedy player takes the highest-damage action available and
 * loses. The winning first move deals LESS damage to the goal target than the
 * available alternative — the same shape as "deals zero damage", one step milder.
 *
 * Narrow by construction. The Fighter's only approach tiles are (4,3) and (4,5),
 * so every Shield Bash pushes the Ranger along the north-south axis, two tiles
 * clear of the Rogue. The one tile that would make the bash safe — (3,4),
 * opposite the Rogue, where the push would jam against the Rogue's body and
 * cancel (ABL-14) — is occupied by the enemy Warden. That body is the whole
 * reason the trap cannot be sidestepped.
 *
 * The Rogue is ROOTED, not merely distant: a 2-tile push can never outrun a
 * mobile melee unit, because the tile the target is pushed THROUGH is adjacent
 * to both its old and new positions. Immobility is the only way knockback
 * becomes a real liability.
 *
 * Slack, not arithmetic: sword leaves the Ranger on 19 against a threshold of
 * 22, so the puzzle cannot be solved by counting to an exact number.
 *
 * Vocabulary 3 (Kill Shot has a health threshold; Shield Bash knocks back;
 * rooted cannot move). Tier-0 fate. 2v2.
 */
export const PUZZLE_033: PuzzleDefinition = {
  id: 'puzzle-033',
  title: 'Puzzle #33 — The Softer Blow',
  goalText: 'Defeat the enemy Ranger within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    { id: 'p1', side: 'player', slug: 'fighter', specialSlug: 'shield_bash', position: { x: 4, y: 2 } },
    {
      id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'assassinate',
      position: { x: 5, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 3, stacks: 1 }],
    },
    { id: 'targ', side: 'enemy', slug: 'ranger', specialSlug: 'pinning', position: { x: 4, y: 4 }, currentHealth: 30 },
    { id: 'blok', side: 'enemy', slug: 'fighter', specialSlug: 'second_wind', position: { x: 3, y: 4 } },
  ],
  initiativeOrder: ['p1', 'p2', 'targ', 'blok'],
};
