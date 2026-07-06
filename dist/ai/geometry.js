"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOS_ENFORCED = exports.BOARD_SIZE = void 0;
exports.manhattanDistance = manhattanDistance;
exports.chebyshevDistance = chebyshevDistance;
exports.samePos = samePos;
exports.isCorner = isCorner;
exports.isInBounds = isInBounds;
exports.isAligned = isAligned;
exports.stepCount = stepCount;
exports.rayStep = rayStep;
exports.tilesBetween = tilesBetween;
exports.aliveUnitAt = aliveUnitAt;
exports.hasLineOfSight = hasLineOfSight;
exports.reachableFrom = reachableFrom;
exports.reachableTiles = reachableTiles;
exports.pushDestination = pushDestination;
exports.pullDestination = pullDestination;
exports.BOARD_SIZE = 8;
function manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
function chebyshevDistance(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
function samePos(a, b) {
    return a.x === b.x && a.y === b.y;
}
/** Exactly (0,0), (7,0), (0,7), (7,7) are invalid tiles. */
function isCorner(x, y) {
    return (x === 0 || x === exports.BOARD_SIZE - 1) && (y === 0 || y === exports.BOARD_SIZE - 1);
}
function isInBounds(pos) {
    return (pos.x >= 0 &&
        pos.x < exports.BOARD_SIZE &&
        pos.y >= 0 &&
        pos.y < exports.BOARD_SIZE &&
        !isCorner(pos.x, pos.y));
}
/** True if a and b sit on one of the 8 true lines (orthogonal or exact diagonal). */
function isAligned(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0)
        return false;
    return dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
}
/**
 * Step count along a ray (line-ability range). Each tile along the ray costs 1,
 * including diagonals. Returns Infinity if the points are not on a true line.
 */
function stepCount(a, b) {
    if (!isAligned(a, b))
        return Infinity;
    return chebyshevDistance(a, b);
}
/** Unit step direction from a toward b (sign vector). */
function rayStep(a, b) {
    return { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) };
}
/** Tiles strictly between a and b along a true line (empty array if not aligned). */
function tilesBetween(a, b) {
    if (!isAligned(a, b))
        return [];
    const step = rayStep(a, b);
    const out = [];
    let cur = { x: a.x + step.x, y: a.y + step.y };
    while (!samePos(cur, b)) {
        out.push({ ...cur });
        cur = { x: cur.x + step.x, y: cur.y + step.y };
    }
    return out;
}
function aliveUnitAt(pos, units) {
    return units.find((u) => u.isAlive && samePos(u.position, pos));
}
/**
 * Line of sight for single-target abilities.
 * Only aligned (true-line) pairs can ever be blocked; a living unit on any
 * intervening tile blocks. `ignoreIds` should include the caster and target
 * (and lets the caller model a hypothetical caster position — the caster's
 * stale recorded tile then can't block its own shot).
 */
function hasLineOfSight(casterPos, targetPos, allUnits, ignoreIds = []) {
    if (!isAligned(casterPos, targetPos))
        return true;
    for (const tile of tilesBetween(casterPos, targetPos)) {
        const blocker = allUnits.find((u) => u.isAlive &&
            !ignoreIds.includes(u.instanceId) &&
            samePos(u.position, tile));
        if (blocker)
            return false;
    }
    return true;
}
/**
 * The engine (processUseAbility) does not validate line of sight server-side
 * today — ranged basic attacks work in practice because the mobile client
 * won't let a human select an LOS-blocked tile, and the brain voluntarily
 * respects hasLineOfSight() above when choosing its own actions (this flag
 * documents that choice; it does not change engine behavior). Flip to true
 * only if/when server-side LOS enforcement is added to processUseAbility.
 */
exports.LOS_ENFORCED = false;
const MOVE_DIRECTIONS = [
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
function reachableFrom(fromPos, unit, allUnits, range) {
    const key = (p) => p.x * exports.BOARD_SIZE + p.y;
    const out = [];
    const visited = new Set([key(fromPos)]);
    let frontier = [fromPos];
    for (let step = 1; step <= range && frontier.length > 0; step++) {
        const next = [];
        for (const pos of frontier) {
            for (const [dx, dy] of MOVE_DIRECTIONS) {
                const n = { x: pos.x + dx, y: pos.y + dy };
                if (!isInBounds(n))
                    continue;
                const k = key(n);
                if (visited.has(k))
                    continue;
                visited.add(k);
                const occupant = allUnits.find((u) => u.isAlive &&
                    u.instanceId !== unit.instanceId &&
                    samePos(u.position, n));
                // Enemy tile: hard block — cannot pass through or land.
                if (occupant && occupant.ownerPlayerId !== unit.ownerPlayerId)
                    continue;
                // Empty or ally tile: movement may continue through it.
                next.push(n);
                // Only empty tiles are valid destinations.
                if (!occupant)
                    out.push(n);
            }
        }
        frontier = next;
    }
    return out;
}
/** Reachable tiles from the unit's current position. */
function reachableTiles(unit, allUnits, range) {
    return reachableFrom(unit.position, unit, allUnits, range);
}
/**
 * Resolve a push (e.g., Fear): target slides tile-by-tile directly away from
 * the caster (sign-vector direction), stopping early at the board edge, a
 * removed corner, or an occupied tile. Returns the final position.
 */
function pushDestination(casterPos, targetPos, distance, allUnits, movingUnitId) {
    const step = rayStep(casterPos, targetPos);
    let cur = { ...targetPos };
    for (let i = 0; i < distance; i++) {
        const next = { x: cur.x + step.x, y: cur.y + step.y };
        if (!isInBounds(next))
            break;
        const occupant = allUnits.find((u) => u.isAlive &&
            u.instanceId !== movingUnitId &&
            samePos(u.position, next));
        if (occupant)
            break;
        cur = next;
    }
    return cur;
}
/**
 * Resolve a pull (e.g., Rescue, Eldritch Grasp): target slides tile-by-tile
 * directly toward the caster, stopping early at the board edge, a removed
 * corner, an occupied tile, or the caster's own tile (never lands on top of
 * the caster). Returns the final position.
 */
function pullDestination(casterPos, targetPos, distance, allUnits, movingUnitId) {
    const step = rayStep(targetPos, casterPos);
    let cur = { ...targetPos };
    for (let i = 0; i < distance; i++) {
        const next = { x: cur.x + step.x, y: cur.y + step.y };
        if (!isInBounds(next))
            break;
        if (samePos(next, casterPos))
            break;
        const occupant = allUnits.find((u) => u.isAlive &&
            u.instanceId !== movingUnitId &&
            samePos(u.position, next));
        if (occupant)
            break;
        cur = next;
    }
    return cur;
}
//# sourceMappingURL=geometry.js.map