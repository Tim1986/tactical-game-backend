import { BoardPosition, UnitInstance } from '../types/matchState.js';
/**
 * The four extreme corner tiles are removed from the board (60-tile cross).
 * Must stay in lockstep with backend/src/ai/geometry.ts's isCorner — that
 * module is the canonical definition; this one is duplicated here only
 * because game/ code can't import from ai/ without an awkward dependency
 * direction. If you change one, change both.
 */
export declare function isCorner(x: number, y: number): boolean;
export declare function isInBounds(pos: BoardPosition): boolean;
export declare function chebyshevDistance(a: BoardPosition, b: BoardPosition): number;
export declare function manhattanDistance(a: BoardPosition, b: BoardPosition): number;
export declare function getUnitAtPosition(units: UnitInstance[], pos: BoardPosition): UnitInstance | undefined;
export declare function isTileOccupied(units: UnitInstance[], pos: BoardPosition): boolean;
export declare function getUnitsInRadius(center: BoardPosition, radius: number, units: UnitInstance[]): UnitInstance[];
export declare function getOrthogonalAdjacentUnits(center: BoardPosition, units: UnitInstance[]): UnitInstance[];
/**
 * SINGLE SOURCE OF TRUTH for AOE blast shape. Both the engine's resolveTargets
 * and the AI brain's hit prediction MUST use this predicate — the whirlwind
 * diagonal bug happened because the two sides each had their own geometry.
 *
 * Which tiles an area ability covers.
 *   chebyshev  — full square, radius R (a radius-1 blast is the 3x3)
 *   orthogonal — the 4 cardinal neighbours only
 *   ring       — the square MINUS its centre: the "eye of the hurricane".
 *                Every AoE in the game hits allies, so the eye is what makes a
 *                large placed blast usable: you aim the calm centre at your own
 *                frontliner and everything around them takes the hit. It is a
 *                SHAPE, not a rules exception — the preview shows the hole, so
 *                it explains itself (see AC_REWORK.md, mixed-friendly-fire).
 */
export declare function isInAoe(center: BoardPosition, pos: BoardPosition, radius: number, shape?: 'chebyshev' | 'orthogonal' | 'ring'): boolean;
/**
 * Every legal destination a PUSH may send the target to.
 *
 * A push travels in ONE CARDINAL direction — never diagonally. A diagonal step
 * costs two tiles of movement in this game (MOV-1), so advancing both axes (as
 * the old calculatePushDestination did) made a "3 tile" diagonal push cover six
 * tiles of ground.
 *
 * When the target sits exactly diagonal from the caster neither axis dominates,
 * so BOTH cardinals are returned and the player picks which way the target is
 * shoved — this is Fear's two-option prompt.
 */
export declare function calculatePushOptions(unitPos: BoardPosition, casterPos: BoardPosition, distance: number, isBlocked?: (p: BoardPosition) => boolean): BoardPosition[];
/**
 * Every legal destination a PULL may draw the target to.
 *
 * The drag spends a budget where a DIAGONAL step costs 2 and an ORTHOGONAL step
 * costs 1, so a diagonal pull can never cover more ground than a straight one
 * (the old code advanced both axes per step: a "2 tile" diagonal pull moved
 * 2-on-x AND 2-on-y, four tiles of ground). It prefers diagonal steps and
 * straightens along the dominant axis when only 1 budget remains.
 *
 * A pull stops one tile short of the caster — it may never land on them. When
 * the drag ends DIAGONALLY adjacent with budget to spare, the last step is a
 * genuine choice between the two tiles that cut the corner (an enemy to your
 * northwest can be drawn to the tile north of you or the tile west of you), so
 * both are returned and the player picks — the same prompt Fear uses for push.
 */
export declare function calculatePullOptions(unitPos: BoardPosition, casterPos: BoardPosition, distance: number, isBlocked?: (p: BoardPosition) => boolean): BoardPosition[];
/**
 * Tiles swept by a line ability: a full-length ray from `from` toward `to`,
 * one of the 8 grid directions, extending the ability's ENTIRE range and
 * stopping only at the board edge or a removed corner.
 *
 * The ray must NOT stop at the tapped tile. Piercing Shot is "damage to every
 * unit in a straight line, up to 6 tiles" — bounding the loop by the distance
 * to the target meant tapping the 2nd unit in a queue of 5 hit only 2 of them
 * (COMBAT_AUDIT C22b item 11). The target tile only picks the DIRECTION.
 */
export declare function getLineTiles(from: BoardPosition, to: BoardPosition, maxRange: number, isBlocked?: (p: BoardPosition) => boolean): BoardPosition[];
export declare function positionsEqual(a: BoardPosition, b: BoardPosition): boolean;
//# sourceMappingURL=boardUtils.d.ts.map