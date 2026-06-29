export declare class AlreadyInQueueError extends Error {
    constructor();
}
export declare class NotInQueueError extends Error {
    constructor();
}
export declare class ActiveMatchExistsError extends Error {
    constructor();
}
export declare class TeamNotFoundError extends Error {
    constructor();
}
export declare class ChallengeError extends Error {
    constructor(message: string);
}
export declare function enterQueue(userId: string, teamId: string): Promise<{
    position: number;
}>;
export declare function leaveQueue(userId: string): Promise<void>;
export declare function getQueueStatus(userId: string): Promise<{
    inQueue: boolean;
    enteredAt?: string;
    elo?: number;
    searchRange?: number;
    waitSeconds?: number;
}>;
export declare function sendChallenge(challengerId: string, challengerTeamId: string, opponentId: string): Promise<void>;
export declare function runMatchmakingJob(): Promise<void>;
export declare function runDeadlineEnforcer(): Promise<void>;
//# sourceMappingURL=matchmakingService.d.ts.map