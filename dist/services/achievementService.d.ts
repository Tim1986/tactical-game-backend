export interface UserAchievement {
    slug: string;
    name: string;
    description: string;
    iconKey: string;
    sortOrder: number;
    unlockedAt: string | null;
}
export declare function getAchievementsForUser(userId: string): Promise<UserAchievement[]>;
export declare function evaluateAchievements(userId: string): Promise<string[]>;
export declare function drainPendingAchievements(userId: string): Promise<{
    slug: string;
    name: string;
    description: string;
    iconKey: string;
}[]>;
//# sourceMappingURL=achievementService.d.ts.map