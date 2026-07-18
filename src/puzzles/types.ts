/**
 * puzzles/types.ts — Data shape for daily puzzles.
 *
 * A puzzle is a fully deterministic mid-battle snapshot: every unit's HP,
 * position, cooldowns, statuses, and fortune meter are pinned, and the
 * initiative order is fixed. Same moves → same outcome, for every player.
 * See PUZZLES_AND_INVITES.md (mobile repo) for the design doc.
 */

import type { BoardPosition, ActiveStatusEffect } from '../types/matchState.js';

export type PuzzleGoal = 'eliminate_all' | 'eliminate_target';

export interface PuzzleUnitSpec {
  /** Stable per-puzzle id — used in initiativeOrder and targetUnitId. */
  id: string;
  side: 'player' | 'enemy';
  /** Base class slug (fighter, rogue, …). */
  slug: string;
  position: BoardPosition;
  /** Omit for full health. Damaged units are the puzzle. */
  currentHealth?: number;
  /** Chosen special (defaults to the class's first specialOption). */
  specialSlug?: string;
  /** Chosen passive slug from the class's passiveOptions. */
  passiveSlug?: string;
  /** Ability slug → remaining cooldown. Specials default to READY (0). */
  cooldowns?: Record<string, number>;
  /** Pre-applied statuses (burns with 1 turn left are great material). */
  statusEffects?: Array<Pick<ActiveStatusEffect, 'slug' | 'turnsRemaining' | 'stacks'>>;
  /** Pinned fortune meter, 0–0.99. Default 0. Design lever for planned dodges. */
  fortuneMeter?: number;
}

export interface PuzzleDefinition {
  /** Unique id, e.g. 'puzzle-001' now, 'YYYY-MM-DD' once daily rotation ships. */
  id: string;
  title: string;
  /** One-line goal banner shown in the match UI. */
  goalText: string;
  goal: PuzzleGoal;
  /** For eliminate_target: the PuzzleUnitSpec id that must die. */
  targetUnitId?: string;
  /** Player unit-turns allowed (each unit acting once = one turn). */
  maxPlayerTurns: number;
  units: PuzzleUnitSpec[];
  /** PuzzleUnitSpec ids in initiative order. Must start with a player unit. */
  initiativeOrder: string[];
}
