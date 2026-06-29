"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XP_WIN_BONUS = exports.XP_PER_MATCH = void 0;
exports.calculateElo = calculateElo;
exports.calculateXpGain = calculateXpGain;
exports.calculateLevel = calculateLevel;
const K_FACTOR = 32;
function calculateElo(winnerElo, loserElo) {
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
    const winnerDelta = Math.round(K_FACTOR * (1 - expectedWinner));
    const loserDelta = Math.round(K_FACTOR * (0 - expectedLoser));
    return { newWinnerElo: winnerElo + winnerDelta, newLoserElo: Math.max(100, loserElo + loserDelta), winnerDelta, loserDelta };
}
exports.XP_PER_MATCH = 50;
exports.XP_WIN_BONUS = 100;
function calculateXpGain(won) {
    return won ? exports.XP_PER_MATCH + exports.XP_WIN_BONUS : exports.XP_PER_MATCH;
}
function calculateLevel(totalXp) {
    return Math.floor(totalXp / 200) + 1;
}
//# sourceMappingURL=eloService.js.map