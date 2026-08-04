import { BoardPosition, BOARD_WIDTH, BOARD_HEIGHT, UnitInstance } from '../types/matchState.js';

/**
 * The four extreme corner tiles are removed from the board (60-tile cross).
 * Must stay in lockstep with backend/src/ai/geometry.ts's isCorner — that
 * module is the canonical definition; this one is duplicated here only
 * because game/ code can't import from ai/ without an awkward dependency
 * direction. If you change one, change both.
 */
export function isCorner(x: number, y: number): boolean {
  return (x === 0 || x === BOARD_WIDTH - 1) && (y === 0 || y === BOARD_HEIGHT - 1);
}

export function isInBounds(pos: BoardPosition): boolean {
  return (
    pos.x >= 0 && pos.x < BOARD_WIDTH &&
    pos.y >= 0 && pos.y < BOARD_HEIGHT &&
    !isCorner(pos.x, pos.y)
  );
}

export function chebyshevDistance(a: BoardPosition, b: BoardPosition): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function manhattanDistance(a: BoardPosition, b: BoardPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function getUnitAtPosition(units: UnitInstance[], pos: BoardPosition): UnitInstance | undefined {
  return units.find((u) => u.isAlive && u.position.x === pos.x && u.position.y === pos.y);
}

export function isTileOccupied(units: UnitInstance[], pos: BoardPosition): boolean {
  return getUnitAtPosition(units, pos) !== undefined;
}

export function getReachableTiles(from: BoardPosition, range: number, units: UnitInstance[], excludeUnitInstanceId: string): BoardPosition[] {
  const reachable: BoardPosition[] = [];
  for (let x = 0; x < BOARD_WIDTH; x++) {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      const pos = { x, y };
      if (!isInBounds(pos)) continue;
      if (chebyshevDistance(from, pos) <= range && chebyshevDistance(from, pos) > 0) {
        const occupant = getUnitAtPosition(units, pos);
        if (!occupant || occupant.instanceId === excludeUnitInstanceId) reachable.push(pos);
      }
    }
  }
  return reachable;
}

export function getTilesInRange(from: BoardPosition, range: number): BoardPosition[] {
  const tiles: BoardPosition[] = [];
  for (let x = 0; x < BOARD_WIDTH; x++) {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      const pos = { x, y };
      if (!isInBounds(pos)) continue;
      if (chebyshevDistance(from, pos) <= range) tiles.push(pos);
    }
  }
  return tiles;
}

export function getUnitsInRadius(center: BoardPosition, radius: number, units: UnitInstance[]): UnitInstance[] {
  return units.filter((u) => u.isAlive && chebyshevDistance(center, u.position) <= radius);
}

export function getOrthogonalAdjacentUnits(center: BoardPosition, units: UnitInstance[]): UnitInstance[] {
  return units.filter((u) => u.isAlive && manhattanDistance(center, u.position) === 1);
}

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
export function isInAoe(center: BoardPosition, pos: BoardPosition, radius: number, shape?: 'chebyshev' | 'orthogonal' | 'ring'): boolean {
  if (shape === 'orthogonal') return manhattanDistance(center, pos) === 1;
  if (shape === 'ring') {
    return chebyshevDistance(center, pos) <= radius && chebyshevDistance(center, pos) > 0;
  }
  return chebyshevDistance(center, pos) <= radius;
}

export function calculatePushDestination(unitPos: BoardPosition, pusherPos: BoardPosition, distance: number): BoardPosition {
  const dx = unitPos.x - pusherPos.x;
  const dy = unitPos.y - pusherPos.y;
  const normX = dx === 0 ? 0 : dx / Math.abs(dx);
  const normY = dy === 0 ? 0 : dy / Math.abs(dy);
  const newX = Math.max(0, Math.min(BOARD_WIDTH - 1, unitPos.x + normX * distance));
  const newY = Math.max(0, Math.min(BOARD_HEIGHT - 1, unitPos.y + normY * distance));
  return { x: Math.round(newX), y: Math.round(newY) };
}

export function calculatePullDestination(unitPos: BoardPosition, pullerPos: BoardPosition, distance: number): BoardPosition {
  const dx = pullerPos.x - unitPos.x;
  const dy = pullerPos.y - unitPos.y;
  const normX = dx === 0 ? 0 : dx / Math.abs(dx);
  const normY = dy === 0 ? 0 : dy / Math.abs(dy);
  const maxSteps = Math.max(Math.abs(dx), Math.abs(dy)) - 1;
  const actualSteps = Math.min(distance, maxSteps);
  const newX = Math.max(0, Math.min(BOARD_WIDTH - 1, unitPos.x + normX * actualSteps));
  const newY = Math.max(0, Math.min(BOARD_HEIGHT - 1, unitPos.y + normY * actualSteps));
  return { x: Math.round(newX), y: Math.round(newY) };
}

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
export function getLineTiles(from: BoardPosition, to: BoardPosition, maxRange: number): BoardPosition[] {
  const tiles: BoardPosition[] = [];
  const stepX = Math.sign(to.x - from.x);
  const stepY = Math.sign(to.y - from.y);
  if (stepX === 0 && stepY === 0) return tiles;
  for (let i = 1; i <= maxRange; i++) {
    const x = from.x + stepX * i;
    const y = from.y + stepY * i;
    if (!isInBounds({ x, y })) break;
    tiles.push({ x, y });
  }
  return tiles;
}

export function positionsEqual(a: BoardPosition, b: BoardPosition): boolean {
  return a.x === b.x && a.y === b.y;
}
