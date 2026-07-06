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
export declare function getReachableTiles(from: BoardPosition, range: number, units: UnitInstance[], excludeUnitInstanceId: string): BoardPosition[];
export declare function getTilesInRange(from: BoardPosition, range: number): BoardPosition[];
export declare function getUnitsInRadius(center: BoardPosition, radius: number, units: UnitInstance[]): UnitInstance[];
export declare function calculatePushDestination(unitPos: BoardPosition, pusherPos: BoardPosition, distance: number): BoardPosition;
export declare function calculatePullDestination(unitPos: BoardPosition, pullerPos: BoardPosition, distance: number): BoardPosition;
export declare function getLineTiles(from: BoardPosition, to: BoardPosition, maxRange: number): BoardPosition[];
export declare function positionsEqual(a: BoardPosition, b: BoardPosition): boolean;
//# sourceMappingURL=boardUtils.d.ts.map