export type NotificationType = 'YOUR_TURN' | 'MATCH_FOUND' | 'MATCH_COMPLETED' | 'CHALLENGE_RECEIVED' | 'CHALLENGE_ACCEPTED';
export declare function notifyUser(userId: string, type: NotificationType, data?: Record<string, string>): Promise<void>;
export declare function notifyMatchPlayers(playerOneId: string, playerTwoId: string, type: NotificationType, data?: Record<string, string>): Promise<void>;
//# sourceMappingURL=notificationService.d.ts.map