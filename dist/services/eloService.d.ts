export interface EloResult {
    newWinnerElo: number;
    newLoserElo: number;
    winnerDelta: number;
    loserDelta: number;
}
export declare function calculateElo(winnerElo: number, loserElo: number): EloResult;
export declare const XP_PER_MATCH = 50;
export declare const XP_WIN_BONUS = 100;
export declare function calculateXpGain(won: boolean): number;
export declare function calculateLevel(totalXp: number): number;
//# sourceMappingURL=eloService.d.ts.map