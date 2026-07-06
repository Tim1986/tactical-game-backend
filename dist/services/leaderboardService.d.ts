export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    elo: number;
    winCount: number;
    matchCount: number;
    snapshotDate: string;
}
export declare function getLeaderboard(): Promise<LeaderboardEntry[]>;
export declare function refreshLeaderboardSnapshot(): Promise<void>;
export declare function isUserInTopN(userId: string, n: number): Promise<boolean>;
//# sourceMappingURL=leaderboardService.d.ts.map