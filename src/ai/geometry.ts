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
// Displacement geometry lives in the engine so brain and executor share ONE
// implementation. boardUtils imports only types, so there is no cycle even
// though game/turnProcessor imports this module.
import { calculatePushOptions, calculatePullOptions } from '../game/boardUtils.js';

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
    pos.x >= 0 &&
    pos.x < BOARD_SIZE &&
    pos.y >= 0 &&
    pos.y < BOARD_SIZE &&
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
 * Step count along a ray (line-ability range). Each tile along the ray costs 1,
 * including diagonals. Returns Infinity if the points are not on a true line.
 */
export function stepCount(a: BoardPosition, b: BoardPosition): number {
  if (!isAligned(a, b)) return Infinity;
  return chebyshevDistance(a, b);
}

/** Unit step direction from a toward b (sign vector). */
export function rayStep(a: BoardPosition, b: BoardPosition): BoardPosition {
  return { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) };
}

/** Tiles strictly between a and b along a true line (empty array if not aligned). */
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

export function aliveUnitAt(
  pos: BoardPosition,
  units: UnitInstance[],
): UnitInstance | undefined {
  return units.find((u) => u.isAlive && samePos(u.position, pos));
}

/**
 * Line of sight for single-target abilities.
 * Only aligned (true-line) pairs can ever be blocked; a living unit on any
 * intervening tile blocks. `ignoreIds` should include the caster and target
 * (and lets the caller model a hypothetical caster position — the caster's
 * stale recorded tile then can't block its own shot).
 */
export function hasLineOfSight(
  casterPos: BoardPosition,
  targetPos: BoardPosition,
  allUnits: UnitInstance[],
  ignoreIds: string[] = [],
  terrain?: TerrainState,
): boolean {
  if (!isAligned(casterPos, targetPos)) return true;
  for (const tile of tilesBetween(casterPos, targetPos)) {
    // CAMPAIGN-ONLY: a wall on an intervening tile blocks sight exactly like a
    // living unit (ENCOUNTER_SPEC A2). Arena states carry no terrain.
    if (isTerrainBlocked(terrain, tile)) return false;
    const blocker = allUnits.find(
      (u) =>
        u.isAlive &&
        !ignoreIds.includes(u.instanceId) &&
        samePos(u.position, tile),
    );
    if (blocker) return false;
  }
  return true;
}

/** Is this tile a campaign wall? `undefined` terrain = never (arena). */
export function isTerrainBlocked(terrain: TerrainState | undefined, pos: BoardPosition): boolean {
  return !!terrain?.blocked?.some((b) => b.x === pos.x && b.y === pos.y);
}

/**
 * CAMPAIGN-ONLY wall-opaque sight (ENCOUNTER_SPEC A2): true when a WALL sits
 * on the straight line between a and b. Units never matter here. Used for
 * placed-AoE center sight and the from-center effect spread — both care about
 * walls only. Non-aligned pairs are never blocked (same alignment rule as
 * unit LoS, ABL-3). With no terrain this is always false (arena-inert).
 */
export function wallsBlockLine(a: BoardPosition, b: BoardPosition, terrain?: TerrainState): boolean {
  if (!terrain?.blocked?.length) return false;
  if (!isAligned(a, b)) return false;
  for (const tile of tilesBetween(a, b)) {
    if (isTerrainBlocked(terrain, tile)) return true;
  }
  return false;
}

/**
 * The engine (processUseAbility) enforces LOS server-side for single-target
 * abilities WITHOUT a push effect (push abilities like Fear are exempt,
 * mirroring the client's targeting UI). Line, AoE, and self abilities are
 * LOS-free by design. This flag keeps the brain's targeting in lockstep with
 * that engine rule — if the engine rule changes, change both together.
 */
export const LOS_ENFORCED = true;

const MOVE_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

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
export function reachableFrom(
  fromPos: BoardPosition,
  unit: UnitInstance,
  allUnits: UnitInstance[],
  range: number,
  terrain?: TerrainState,
): BoardPosition[] {
  const key = (p: BoardPosition) => p.x * BOARD_SIZE + p.y;
  const out: BoardPosition[] = [];
  const visited = new Set<number>([key(fromPos)]);
  let frontier: BoardPosition[] = [fromPos];
  // CAMPAIGN-ONLY: walls hard-block movement; a 'phasing' unit (Wraith) may
  // pass THROUGH a wall but never end on it (ENCOUNTER_SPEC A2).
  const phasing = !!unit.moveFlags?.includes('phasing');

  for (let step = 1; step <= range && frontier.length > 0; step++) {
    const next: BoardPosition[] = [];
    for (const pos of frontier) {
      for (const [dx, dy] of MOVE_DIRECTIONS) {
        const n = { x: pos.x + dx, y: pos.y + dy };
        if (!isInBounds(n)) continue;
        const k = key(n);
        if (visited.has(k)) continue;
        visited.add(k);

        if (isTerrainBlocked(terrain, n)) {
          if (!phasing) continue;      // wall: hard block
          next.push(n);                 // phasing: continue through…
          continue;                     // …but never a destination
        }

        const occupant = allUnits.find(
          (u) =>
            u.isAlive &&
            u.instanceId !== unit.instanceId &&
            samePos(u.position, n),
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

/**
 * Step-by-step path from `fromPos` to `to` under the SAME movement rules as
 * reachableFrom (orthogonal steps; allies passable, enemies hard-block,
 * corners/out-of-bounds block). Returns the tile sequence EXCLUDING the start
 * tile, or null if no legal path exists. This is the one true path used for
 * both validation-adjacent planning and the client's movement animation — the
 * UI must never re-implement its own pathing.
 */
export function findPath(
  fromPos: BoardPosition,
  to: BoardPosition,
  unit: UnitInstance,
  allUnits: UnitInstance[],
): BoardPosition[] | null {
  if (samePos(fromPos, to)) return [];
  const key = (p: BoardPosition) => p.x * BOARD_SIZE + p.y;
  const visited = new Set<number>([key(fromPos)]);
  const parent = new Map<number, BoardPosition>();
  let frontier: BoardPosition[] = [fromPos];

  while (frontier.length > 0) {
    const next: BoardPosition[] = [];
    for (const pos of frontier) {
      for (const [dx, dy] of MOVE_DIRECTIONS) {
        const n = { x: pos.x + dx, y: pos.y + dy };
        if (!isInBounds(n)) continue;
        const k = key(n);
        if (visited.has(k)) continue;
        visited.add(k);

        const occupant = allUnits.find(
          (u) =>
            u.isAlive &&
            u.instanceId !== unit.instanceId &&
            samePos(u.position, n),
        );
        // Enemy tile: hard block — never on a path.
        if (occupant && occupant.ownerPlayerId !== unit.ownerPlayerId) continue;

        parent.set(k, pos);
        if (samePos(n, to)) {
          const path: BoardPosition[] = [];
          let node: BoardPosition = n;
          while (!samePos(node, fromPos)) {
            path.unshift(node);
            node = parent.get(key(node))!;
          }
          return path;
        }
        next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}

/** Reachable tiles from the unit's current position. */
export function reachableTiles(
  unit: UnitInstance,
  allUnits: UnitInstance[],
  range: number,
  terrain?: TerrainState,
): BoardPosition[] {
  return reachableFrom(unit.position, unit, allUnits, range, terrain);
}

/**
 * Blocker predicate matching the engine's: any living unit other than the one
 * being displaced occupies the tile.
 */
function displacementBlocker(allUnits: UnitInstance[], movingUnitId: string, terrain?: TerrainState) {
  return (p: BoardPosition) => isTerrainBlocked(terrain, p) || allUnits.some(
    (u) => u.isAlive && u.instanceId !== movingUnitId && samePos(u.position, p),
  );
}

/**
 * Resolve a push (e.g., Fear). DELEGATES to the engine's calculatePushOptions
 * so the brain can never predict a landing tile the executor won't produce —
 * this used to walk a sign vector, which allowed a DIAGONAL push the engine
 * (cardinal-only, since a diagonal costs two tiles under MOV-1) never performs.
 * When the target is exactly diagonal both cardinals are legal and the human
 * picks; the brain takes the first, same as the executor's no-choice fallback.
 */
export function pushDestination(
  casterPos: BoardPosition,
  targetPos: BoardPosition,
  distance: number,
  allUnits: UnitInstance[],
  movingUnitId: string,
  terrain?: TerrainState,
): BoardPosition {
  return calculatePushOptions(
    targetPos, casterPos, distance, displacementBlocker(allUnits, movingUnitId, terrain),
  )[0];
}

/**
 * Resolve a pull (e.g., Rescue, Eldritch Grasp): target slides tile-by-tile
 * directly toward the caster, stopping early at the board edge, a removed
 * corner, an occupied tile, or the caster's own tile (never lands on top of
 * the caster). Returns the final position.
 */
export function pullDestination(
  casterPos: BoardPosition,
  targetPos: BoardPosition,
  distance: number,
  allUnits: UnitInstance[],
  movingUnitId: string,
  terrain?: TerrainState,
): BoardPosition {
  // DELEGATES to the engine's calculatePullOptions — one budget model (diagonal
  // costs 2), one set of stop conditions, so brain and executor cannot drift.
  // A diagonally-adjacent drag offers two corner-cutting tiles for the human to
  // pick between; the brain takes the first, matching the executor's fallback.
  return calculatePullOptions(
    targetPos, casterPos, distance, displacementBlocker(allUnits, movingUnitId, terrain),
  )[0];
}
