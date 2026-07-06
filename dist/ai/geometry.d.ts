/**
 * geometry.ts — Board geometry helpers for DungeonCombat.
 *
 * Rules implemented here (from FABLE_AI_CONTEXT.md):
 * - 8x8 board, four corner tiles removed → 60-tile cross.
 * - Movement + single/aoe ability RANGE checks use Manhattan distance.
 * - Line abilities use step count along one of the 8 rays (diagonal step = 1).
 * - LOS only applies on the 8 true lines; non-aligned tiles are never blocked.
 * - Movement is pathfound (BFS): allies can be moved through but not landed
 *   on; enemies block movement entirely.
 */
import { BoardPosition, UnitInstance } from './types';
export declare const BOARD_SIZE = 8;
export declare function manhattanDistance(a: BoardPosition, b: BoardPosition): number;
export declare function chebyshevDistance(a: BoardPosition, b: BoardPosition): number;
export declare function samePos(a: BoardPosition, b: BoardPosition): boolean;
/** Exactly (0,0), (7,0), (0,7), (7,7) are invalid tiles. */
export declare function isCorner(x: number, y: number): boolean;
export declare function isInBounds(pos: BoardPosition): boolean;
/** True if a and b sit on one of the 8 true lines (orthogonal or exact diagonal). */
export declare function isAligned(a: BoardPosition, b: BoardPosition): boolean;
/**
 * Step count along a ray (line-ability range). Each tile along the ray costs 1,
 * including diagonals. Returns Infinity if the points are not on a true line.
 */
export declare function stepCount(a: BoardPosition, b: BoardPosition): number;
/** Unit step direction from a toward b (sign vector). */
export declare function rayStep(a: BoardPosition, b: BoardPosition): BoardPosition;
/** Tiles strictly between a and b along a true line (empty array if not aligned). */
export declare function tilesBetween(a: BoardPosition, b: BoardPosition): BoardPosition[];
export declare function aliveUnitAt(pos: BoardPosition, units: UnitInstance[]): UnitInstance | undefined;
/**
 * Line of sight for single-target abilities.
 * Only aligned (true-line) pairs can ever be blocked; a living unit on any
 * intervening tile blocks. `ignoreIds` should include the caster and target
 * (and lets the caller model a hypothetical caster position — the caster's
 * stale recorded tile then can't block its own shot).
 */
export declare function hasLineOfSight(casterPos: BoardPosition, targetPos: BoardPosition, allUnits: UnitInstance[], ignoreIds?: string[]): boolean;
/**
 * The engine (processUseAbility) does not validate line of sight server-side
 * today — ranged basic attacks work in practice because the mobile client
 * won't let a human select an LOS-blocked tile, and the brain voluntarily
 * respects hasLineOfSight() above when choosing its own actions (this flag
 * documents that choice; it does not change engine behavior). Flip to true
 * only if/when server-side LOS enforcement is added to processUseAbility.
 */
export declare const LOS_ENFORCED = false;
/**
 * Tiles reachable from an arbitrary origin within `range` movement, via
 * BFS flood-fill (one orthogonal step = 1 movement; diagonal = 2, which the
 * BFS produces naturally).
 *
 * Movement rules:
 *  - ALLY-occupied tiles can be PASSED THROUGH but not landed on.
 *  - ENEMY-occupied tiles BLOCK movement entirely (no pass-through, no landing).
 *  - Out-of-bounds tiles and the four removed corners block.
 *
 * The `unit` parameter identifies the mover: its own recorded tile counts as
 * free, which also lets planners evaluate movement from a hypothetical
 * position (e.g., Charge planning).
 */
export declare function reachableFrom(fromPos: BoardPosition, unit: UnitInstance, allUnits: UnitInstance[], range: number): BoardPosition[];
/** Reachable tiles from the unit's current position. */
export declare function reachableTiles(unit: UnitInstance, allUnits: UnitInstance[], range: number): BoardPosition[];
/**
 * Resolve a push (e.g., Fear): target slides tile-by-tile directly away from
 * the caster (sign-vector direction), stopping early at the board edge, a
 * removed corner, or an occupied tile. Returns the final position.
 */
export declare function pushDestination(casterPos: BoardPosition, targetPos: BoardPosition, distance: number, allUnits: UnitInstance[], movingUnitId: string): BoardPosition;
/**
 * Resolve a pull (e.g., Rescue, Eldritch Grasp): target slides tile-by-tile
 * directly toward the caster, stopping early at the board edge, a removed
 * corner, an occupied tile, or the caster's own tile (never lands on top of
 * the caster). Returns the final position.
 */
export declare function pullDestination(casterPos: BoardPosition, targetPos: BoardPosition, distance: number, allUnits: UnitInstance[], movingUnitId: string): BoardPosition;
//# sourceMappingURL=geometry.d.ts.map