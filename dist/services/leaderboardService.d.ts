export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    elo: number;
    winCount: number;
    matchCount: number;
    snapshotDate: string;
}
/**
 * pg returns TIMESTAMP columns as Date objects, not strings. This row type used
 * to declare `snapshotted_at: string`, which the compiler believed, so
 * `.split('T')` shipped and threw `r.snapshotted_at.split is not a function` on
 * every call. Because the only caller is a fire-and-forget achievement check,
 * that surfaced as the whole server dying after each completed match. Accept
 * both shapes and normalise.
 */
export declare function isoDate(v: Date | string): string;
export declare function getLeaderboard(): Promise<LeaderboardEntry[]>;
export declare function refreshLeaderboardSnapshot(): Promise<void>;
export declare function isUserInTopN(userId: string, n: number): Promise<boolean>;
//# sourceMappingURL=leaderboardService.d.ts.map