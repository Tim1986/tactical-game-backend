"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInBounds = isInBounds;
exports.chebyshevDistance = chebyshevDistance;
exports.manhattanDistance = manhattanDistance;
exports.getUnitAtPosition = getUnitAtPosition;
exports.isTileOccupied = isTileOccupied;
exports.getReachableTiles = getReachableTiles;
exports.getTilesInRange = getTilesInRange;
exports.getUnitsInRadius = getUnitsInRadius;
exports.calculatePushDestination = calculatePushDestination;
exports.calculatePullDestination = calculatePullDestination;
exports.getLineTiles = getLineTiles;
exports.positionsEqual = positionsEqual;
const matchState_js_1 = require("../types/matchState.js");
function isInBounds(pos) {
    return pos.x >= 0 && pos.x < matchState_js_1.BOARD_WIDTH && pos.y >= 0 && pos.y < matchState_js_1.BOARD_HEIGHT;
}
function chebyshevDistance(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
function manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
function getUnitAtPosition(units, pos) {
    return units.find((u) => u.isAlive && u.position.x === pos.x && u.position.y === pos.y);
}
function isTileOccupied(units, pos) {
    return getUnitAtPosition(units, pos) !== undefined;
}
function getReachableTiles(from, range, units, excludeUnitInstanceId) {
    const reachable = [];
    for (let x = 0; x < matchState_js_1.BOARD_WIDTH; x++) {
        for (let y = 0; y < matchState_js_1.BOARD_HEIGHT; y++) {
            const pos = { x, y };
            if (chebyshevDistance(from, pos) <= range && chebyshevDistance(from, pos) > 0) {
                const occupant = getUnitAtPosition(units, pos);
                if (!occupant || occupant.instanceId === excludeUnitInstanceId)
                    reachable.push(pos);
            }
        }
    }
    return reachable;
}
function getTilesInRange(from, range) {
    const tiles = [];
    for (let x = 0; x < matchState_js_1.BOARD_WIDTH; x++) {
        for (let y = 0; y < matchState_js_1.BOARD_HEIGHT; y++) {
            const pos = { x, y };
            if (chebyshevDistance(from, pos) <= range)
                tiles.push(pos);
        }
    }
    return tiles;
}
function getUnitsInRadius(center, radius, units) {
    return units.filter((u) => u.isAlive && chebyshevDistance(center, u.position) <= radius);
}
function calculatePushDestination(unitPos, pusherPos, distance) {
    const dx = unitPos.x - pusherPos.x;
    const dy = unitPos.y - pusherPos.y;
    const normX = dx === 0 ? 0 : dx / Math.abs(dx);
    const normY = dy === 0 ? 0 : dy / Math.abs(dy);
    const newX = Math.max(0, Math.min(matchState_js_1.BOARD_WIDTH - 1, unitPos.x + normX * distance));
    const newY = Math.max(0, Math.min(matchState_js_1.BOARD_HEIGHT - 1, unitPos.y + normY * distance));
    return { x: Math.round(newX), y: Math.round(newY) };
}
function calculatePullDestination(unitPos, pullerPos, distance) {
    const dx = pullerPos.x - unitPos.x;
    const dy = pullerPos.y - unitPos.y;
    const normX = dx === 0 ? 0 : dx / Math.abs(dx);
    const normY = dy === 0 ? 0 : dy / Math.abs(dy);
    const maxSteps = Math.max(Math.abs(dx), Math.abs(dy)) - 1;
    const actualSteps = Math.min(distance, maxSteps);
    const newX = Math.max(0, Math.min(matchState_js_1.BOARD_WIDTH - 1, unitPos.x + normX * actualSteps));
    const newY = Math.max(0, Math.min(matchState_js_1.BOARD_HEIGHT - 1, unitPos.y + normY * actualSteps));
    return { x: Math.round(newX), y: Math.round(newY) };
}
function getLineTiles(from, to, maxRange) {
    const tiles = [];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0)
        return tiles;
    const normX = dx / steps;
    const normY = dy / steps;
    for (let i = 1; i <= Math.min(steps, maxRange); i++) {
        const x = Math.round(from.x + normX * i);
        const y = Math.round(from.y + normY * i);
        if (!isInBounds({ x, y }))
            break;
        tiles.push({ x, y });
    }
    return tiles;
}
function positionsEqual(a, b) {
    return a.x === b.x && a.y === b.y;
}
//# sourceMappingURL=boardUtils.js.map