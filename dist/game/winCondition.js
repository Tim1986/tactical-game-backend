"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkWinCondition = checkWinCondition;
function checkWinCondition(state, playerOneId, playerTwoId) {
    const p1Alive = state.units.some((u) => u.ownerPlayerId === playerOneId && u.isAlive);
    const p2Alive = state.units.some((u) => u.ownerPlayerId === playerTwoId && u.isAlive);
    if (!p1Alive && !p2Alive)
        return { isOver: true, winnerId: playerTwoId, loserId: playerOneId };
    if (!p1Alive)
        return { isOver: true, winnerId: playerTwoId, loserId: playerOneId };
    if (!p2Alive)
        return { isOver: true, winnerId: playerOneId, loserId: playerTwoId };
    return { isOver: false, winnerId: null, loserId: null };
}
//# sourceMappingURL=winCondition.js.map