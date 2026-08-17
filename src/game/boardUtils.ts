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

// NOTE: getReachableTiles and getTilesInRange used to live here. Both measured
// range with chebyshevDistance — i.e. a diagonal counted as ONE tile, which
// contradicts MOV-1/ABL-2 (a diagonal is two steps). Neither had a single
// caller, so they were dead code that would have silently reintroduced
// diagonal-is-free movement the moment anyone wired them up. Movement
// reachability is ai/geometry.ts reachableFrom (4-way BFS); ability range is
// manhattanDistance in turnProcessor.

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

/**
 * Slide one tile at a time along a single step vector, stopping before the
 * board edge, a removed corner, or an occupied tile. Shared by push and pull so
 * displacement can only ever stop for the reasons the rulebook lists (ABL-7).
 */
function slide(
  from: BoardPosition,
  step: BoardPosition,
  tiles: number,
  isBlocked: (p: BoardPosition) => boolean,
): BoardPosition {
  let cur: BoardPosition = { x: from.x, y: from.y };
  if (step.x === 0 && step.y === 0) return cur;
  for (let i = 0; i < tiles; i++) {
    const next = { x: cur.x + step.x, y: cur.y + step.y };
    if (!isInBounds(next)) break;
    if (isBlocked(next)) break;
    cur = next;
  }
  return cur;
}

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
export function calculatePushOptions(
  unitPos: BoardPosition,
  casterPos: BoardPosition,
  distance: number,
  isBlocked: (p: BoardPosition) => boolean = () => false,
): BoardPosition[] {
  const dx = unitPos.x - casterPos.x;
  const dy = unitPos.y - casterPos.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx === 0 && absDy === 0) return [{ x: unitPos.x, y: unitPos.y }];
  const dirs: BoardPosition[] =
    absDx > absDy ? [{ x: Math.sign(dx), y: 0 }] :
    absDy > absDx ? [{ x: 0, y: Math.sign(dy) }] :
    [{ x: Math.sign(dx), y: 0 }, { x: 0, y: Math.sign(dy) }];
  const seen = new Set<string>();
  const out: BoardPosition[] = [];
  for (const dir of dirs) {
    const landing = slide(unitPos, dir, distance, isBlocked);
    const key = `${landing.x},${landing.y}`;
    if (!seen.has(key)) { seen.add(key); out.push(landing); }
  }
  return out;
}

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
export function calculatePullOptions(
  unitPos: BoardPosition,
  casterPos: BoardPosition,
  distance: number,
  isBlocked: (p: BoardPosition) => boolean = () => false,
): BoardPosition[] {
  let cur: BoardPosition = { x: unitPos.x, y: unitPos.y };
  let budget = distance;
  while (budget > 0) {
    const dx = casterPos.x - cur.x;
    const dy = casterPos.y - cur.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    // Orthogonally adjacent (or somehow on the caster): as close as a pull goes.
    if (adx + ady <= 1) break;
    // Diagonally adjacent: the final step is the player's choice, resolved below.
    if (adx === 1 && ady === 1) break;
    let step: BoardPosition;
    if (adx !== 0 && ady !== 0) {
      if (budget >= 2) { step = { x: Math.sign(dx), y: Math.sign(dy) }; budget -= 2; }
      else { step = adx >= ady ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) }; budget -= 1; }
    } else {
      step = { x: Math.sign(dx), y: Math.sign(dy) }; budget -= 1;
    }
    const next = { x: cur.x + step.x, y: cur.y + step.y };
    if (!isInBounds(next)) break;
    if (isBlocked(next)) break;
    cur = next;
  }
  const fdx = casterPos.x - cur.x;
  const fdy = casterPos.y - cur.y;
  if (Math.abs(fdx) === 1 && Math.abs(fdy) === 1 && budget >= 1) {
    const corners = [{ x: casterPos.x, y: cur.y }, { x: cur.x, y: casterPos.y }]
      .filter((p) => isInBounds(p) && !isBlocked(p));
    if (corners.length > 0) return corners;
  }
  return [cur];
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
export function getLineTiles(
  from: BoardPosition,
  to: BoardPosition,
  maxRange: number,
  isBlocked: (p: BoardPosition) => boolean = () => false,
): BoardPosition[] {
  const tiles: BoardPosition[] = [];
  const stepX = Math.sign(to.x - from.x);
  const stepY = Math.sign(to.y - from.y);
  if (stepX === 0 && stepY === 0) return tiles;
  for (let i = 1; i <= maxRange; i++) {
    const x = from.x + stepX * i;
    const y = from.y + stepY * i;
    if (!isInBounds({ x, y })) break;
    // CAMPAIGN-ONLY (walls): the ray stops at the first blocked tile — walls
    // eat arrows and flame (ENCOUNTER_SPEC A2). The wall tile itself is not
    // swept. Default predicate never blocks (arena unchanged).
    if (isBlocked({ x, y })) break;
    tiles.push({ x, y });
  }
  return tiles;
}

export function positionsEqual(a: BoardPosition, b: BoardPosition): boolean {
  return a.x === b.x && a.y === b.y;
}
