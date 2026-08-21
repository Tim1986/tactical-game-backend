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
  /**
   * ENEMY units only: force this unit onto the intro screen's "The enemy"
   * section, WITH its ability spelled out.
   *
   * The section is hidden by default (see PUZZLES_AND_INVITES.md). Intro
   * vertical space is the scarcest thing in the feature, and a beginner enemy
   * card used to render portrait + class name only — which the goal line and
   * the board both already say, so it cost a scroll and taught nothing. Set
   * this ONLY when a first-time solver genuinely could not find the intended
   * line without knowing what this unit does. #15 is the canonical case: the
   * goal says kill the Ranger, but the puzzle IS the Cleric's heal.
   *
   * Ignored on `expert` puzzles, which show every enemy card regardless —
   * there, sifting the enemy's HP and abilities is itself the puzzle.
   */
  introRelevant?: boolean;
  /**
   * Player units only: specials the player may pick from on the intro screen
   * (obscures the "obvious special = the solution" tell). `specialSlug` is the
   * default selection and MUST be included in the list.
   */
  specialChoices?: string[];
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
  /**
   * Scripted outcomes for blockable dodge rolls, consumed in order — one entry
   * per roll attempt (multi-hit attacks consume one per hit; unblockable and
   * exposed-target attacks consume none). Exhausted script = deterministic
   * HIT: script misses explicitly. This replaces the removed fortune meter as
   * the determinism mechanism — live combat rolls randomly, puzzles do not.
   */
  rollScript: Array<'hit' | 'miss'>;
  /**
   * Player-facing disclosure of the script, shown on the intro screen and the
   * in-match banner (e.g. "Fate is sealed: your next two attacks will land —
   * a third would go wide."). Never hide the script — fairness depends on it.
   */
  fateText: string;
  /**
   * Expert puzzles show FULL enemy detail on the intro (HP + abilities) because
   * the solver's whole point is figuring out which info matters. Beginner/daily
   * puzzles (the default, undefined/false) show enemies minimally — portrait,
   * name, and the TARGET tag only — because for a first-contact "send it to a
   * friend" puzzle, excess info is death. See PUZZLES_AND_INVITES.md "two poles".
   */
  expert?: boolean;
}
