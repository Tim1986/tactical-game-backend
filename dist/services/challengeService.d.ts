export declare class ChallengeNotFoundError extends Error {
    constructor();
}
export declare class ChallengeAccessError extends Error {
    constructor();
}
export declare class ChallengeError extends Error {
    constructor(message: string);
}
interface ChallengeRow {
    id: string;
    challenger_id: string;
    challenger_username: string;
    opponent_id: string;
    opponent_username: string;
    challenger_team_id: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    match_id: string | null;
    created_at: string;
    expires_at: string;
}
export declare function issueChallenge(challengerId: string, challengerTeamId: string, opponentUsername: string): Promise<{
    challengeId: string;
    opponentUsername: string;
    status: string;
}>;
export declare function acceptChallenge(challengeId: string, acceptingUserId: string, acceptingTeamId: string): Promise<{
    matchId: string;
}>;
export declare function declineChallenge(challengeId: string, decliningUserId: string): Promise<void>;
export declare function getChallenges(userId: string): Promise<{
    received: ChallengeRow[];
    sent: ChallengeRow[];
}>;
export {};
//# sourceMappingURL=challengeService.d.ts.map