/**
 * geometry.ts — Board geometry helpers for the DungeonCombat AI and sim harness.
 * Adapted from Fable's standalone geometry.ts to use backend types.
 */

import { BoardPosition, UnitInstance } from '../types/matchState.js';

export const BOARD_SIZE = 8;

export function manhattanDistance(a: BoardPosition, b: BoardPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function chebyshevDistance(a: BoardPosition, b: BoardPosition): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function samePos(a: BoardPosition, b: BoardPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Exactly (0,0), (7,0), (0,7), (7,7) are invalid tiles. */
export function isCorner(x: number, y: number): boolean {
  return (x === 0 || x === BOARD_SIZE - 1) && (y === 0 || y === BOARD_SIZE - 1);
}

export function isInBounds(pos: BoardPosition): boolean {
  return (
    pos.x >= 0 && pos.x < BOARD_SIZE &&
    pos.y >= 0 && pos.y < BOARD_SIZE &&
    !isCorner(pos.x, pos.y)
  );
}

/** True if a and b sit on one of the 8 true lines (orthogonal or exact diagonal). */
export function isAligned(a: BoardPosition, b: BoardPosition): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return false;
  return dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
}

/**
 * Step count along a ray (line-ability range).
 * Each tile along the ray costs 1 including diagonals.
 * Returns Infinity if not on a true line.
 */
export function stepCount(a: BoardPosition, b: BoardPosition): number {
  if (!isAligned(a, b)) return Infinity;
  return chebyshevDistance(a, b);
}

export function rayStep(a: BoardPosition, b: BoardPosition): BoardPosition {
  return { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) };
}

/** Tiles strictly between a and b along a true line. */
export function tilesBetween(a: BoardPosition, b: BoardPosition): BoardPosition[] {
  if (!isAligned(a, b)) return [];
  const step = rayStep(a, b);
  const out: BoardPosition[] = [];
  let cur = { x: a.x + step.x, y: a.y + step.y };
  while (!samePos(cur, b)) {
    out.push({ ...cur });
    cur = { x: cur.x + step.x, y: cur.y + step.y };
  }
  return out;
}

export function aliveUnitAt(pos: BoardPosition, units: UnitInstance[]): UnitInstance | undefined {
  return units.find((u) => u.isAlive && samePos(u.position, pos));
}

/**
 * LOS for single-target abilities on true lines.
 * A living unit on any intervening tile blocks.
 */
export function hasLineOfSight(
  casterPos: BoardPosition,
  targetPos: BoardPosition,
  allUnits: UnitInstance[],
  ignoreIds: string[] = [],
): boolean {
  if (!isAligned(casterPos, targetPos)) return true;
  for (const tile of tilesBetween(casterPos, targetPos)) {
    const blocker = allUnits.find(
      (u) => u.isAlive && !ignoreIds.includes(u.instanceId) && samePos(u.position, tile),
    );
    if (blocker) return false;
  }
  return true;
}

const MOVE_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

/**
 * Tiles reachable from fromPos within `range` movement, via BFS flood-fill.
 *
 * Movement rules:
 *  - ALLY-occupied tiles can be passed through but not landed on.
 *  - ENEMY-occupied tiles block movement entirely (no pass-through, no landing).
 *  - Out-of-bounds tiles and the four removed corners block.
 */
export function reachableFrom(
  fromPos: BoardPosition,
  unit: UnitInstance,
  allUnits: UnitInstance[],
  range: number,
): BoardPosition[] {
  const key = (p: BoardPosition) => p.x * BOARD_SIZE + p.y;
  const out: BoardPosition[] = [];
  const visited = new Set<number>([key(fromPos)]);
  let frontier: BoardPosition[] = [fromPos];

  for (let step = 1; step <= range && frontier.length > 0; step++) {
    const next: BoardPosition[] = [];
    for (const pos of frontier) {
      for (const [dx, dy] of MOVE_DIRECTIONS) {
        const n = { x: pos.x + dx, y: pos.y + dy };
        if (!isInBounds(n)) continue;
        const k = key(n);
        if (visited.has(k)) continue;
        visited.add(k);

        const occupant = allUnits.find(
          (u) => u.isAlive && u.instanceId !== unit.instanceId && samePos(u.position, n),
        );
        // Enemy tile: hard block — cannot pass through or land.
        if (occupant && occupant.ownerPlayerId !== unit.ownerPlayerId) continue;

        // Empty or ally tile: movement may continue through it.
        next.push(n);
        // Only empty tiles are valid destinations.
        if (!occupant) out.push(n);
      }
    }
    frontier = next;
  }
  return out;
}

export function reachableTiles(unit: UnitInstance, allUnits: UnitInstance[], range: number): BoardPosition[] {
  return reachableFrom(unit.position, unit, allUnits, range);
}

/**
 * Push destination: target slides away from caster, stopping at board edge,
 * removed corner, or occupied tile.
 */
export function pushDestination(
  casterPos: BoardPosition,
  targetPos: BoardPosition,
  distance: number,
  allUnits: UnitInstance[],
  movingUnitId: string,
): BoardPosition {
  const step = rayStep(casterPos, targetPos);
  let cur = { ...targetPos };
  for (let i = 0; i < distance; i++) {
    const next = { x: cur.x + step.x, y: cur.y + step.y };
    if (!isInBounds(next)) break;
    if (allUnits.find((u) => u.isAlive && u.instanceId !== movingUnitId && samePos(u.position, next))) break;
    cur = next;
  }
  return cur;
}
