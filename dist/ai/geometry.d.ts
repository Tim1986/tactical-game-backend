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
import { TerrainState } from '../types/matchState.js';
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
export declare function hasLineOfSight(casterPos: BoardPosition, targetPos: BoardPosition, allUnits: UnitInstance[], ignoreIds?: string[], terrain?: TerrainState): boolean;
/** Is this tile a campaign wall? `undefined` terrain = never (arena). */
export declare function isTerrainBlocked(terrain: TerrainState | undefined, pos: BoardPosition): boolean;
/**
 * CAMPAIGN-ONLY wall-opaque sight (ENCOUNTER_SPEC A2): true when a WALL sits
 * on the straight line between a and b. Units never matter here. Used for
 * placed-AoE center sight and the from-center effect spread — both care about
 * walls only. Non-aligned pairs are never blocked (same alignment rule as
 * unit LoS, ABL-3). With no terrain this is always false (arena-inert).
 */
export declare function wallsBlockLine(a: BoardPosition, b: BoardPosition, terrain?: TerrainState): boolean;
/**
 * The engine (processUseAbility) enforces LOS server-side for single-target
 * abilities WITHOUT a push effect (push abilities like Fear are exempt,
 * mirroring the client's targeting UI). Line, AoE, and self abilities are
 * LOS-free by design. This flag keeps the brain's targeting in lockstep with
 * that engine rule — if the engine rule changes, change both together.
 */
export declare const LOS_ENFORCED = true;
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
export declare function reachableFrom(fromPos: BoardPosition, unit: UnitInstance, allUnits: UnitInstance[], range: number, terrain?: TerrainState): BoardPosition[];
/**
 * Step-by-step path from `fromPos` to `to` under the SAME movement rules as
 * reachableFrom (orthogonal steps; allies passable, enemies hard-block,
 * corners/out-of-bounds block). Returns the tile sequence EXCLUDING the start
 * tile, or null if no legal path exists. This is the one true path used for
 * both validation-adjacent planning and the client's movement animation — the
 * UI must never re-implement its own pathing.
 */
export declare function findPath(fromPos: BoardPosition, to: BoardPosition, unit: UnitInstance, allUnits: UnitInstance[], terrain?: TerrainState): BoardPosition[] | null;
/** Reachable tiles from the unit's current position. */
export declare function reachableTiles(unit: UnitInstance, allUnits: UnitInstance[], range: number, terrain?: TerrainState): BoardPosition[];
/**
 * Resolve a push (e.g., Fear). DELEGATES to the engine's calculatePushOptions
 * so the brain can never predict a landing tile the executor won't produce —
 * this used to walk a sign vector, which allowed a DIAGONAL push the engine
 * (cardinal-only, since a diagonal costs two tiles under MOV-1) never performs.
 * When the target is exactly diagonal both cardinals are legal and the human
 * picks; the brain takes the first, same as the executor's no-choice fallback.
 */
export declare function pushDestination(casterPos: BoardPosition, targetPos: BoardPosition, distance: number, allUnits: UnitInstance[], movingUnitId: string, terrain?: TerrainState): BoardPosition;
/**
 * Resolve a pull (e.g., Rescue, Eldritch Grasp): target slides tile-by-tile
 * directly toward the caster, stopping early at the board edge, a removed
 * corner, an occupied tile, or the caster's own tile (never lands on top of
 * the caster). Returns the final position.
 */
export declare function pullDestination(casterPos: BoardPosition, targetPos: BoardPosition, distance: number, allUnits: UnitInstance[], movingUnitId: string, terrain?: TerrainState): BoardPosition;
//# sourceMappingURL=geometry.d.ts.map