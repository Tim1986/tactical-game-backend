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

export function getLineTiles(from: BoardPosition, to: BoardPosition, maxRange: number): BoardPosition[] {
  const tiles: BoardPosition[] = [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) return tiles;
  const normX = dx / steps;
  const normY = dy / steps;
  for (let i = 1; i <= Math.min(steps, maxRange); i++) {
    const x = Math.round(from.x + normX * i);
    const y = Math.round(from.y + normY * i);
    if (!isInBounds({ x, y })) break;
    tiles.push({ x, y });
  }
  return tiles;
}

export function positionsEqual(a: BoardPosition, b: BoardPosition): boolean {
  return a.x === b.x && a.y === b.y;
}
