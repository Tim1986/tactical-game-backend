export type NotificationType = 'YOUR_TURN' | 'MATCH_FOUND' | 'MATCH_COMPLETED' | 'CHALLENGE_RECEIVED' | 'CHALLENGE_ACCEPTED' | 'ACHIEVEMENT_UNLOCKED';
/**
 * Send a push notification. NEVER REJECTS — and that is a hard guarantee the
 * callers depend on.
 *
 * Every call site is fire-and-forget (`void notifyUser(...)`, often inside
 * setImmediate). An unhandled promise rejection is fatal in Node 20, so any
 * path out of here that throws would take the whole server down — which is
 * exactly how a Date-vs-string bug in the achievement path produced a string of
 * HTTP 502s. The token lookup below is a database call and can fail on its own,
 * so the guard has to wrap the entire body, not just the send.
 */
export declare function notifyUser(userId: string, type: NotificationType, data?: Record<string, string>): Promise<void>;
export declare function notifyMatchPlayers(playerOneId: string, playerTwoId: string, type: NotificationType, data?: Record<string, string>): Promise<void>;
//# sourceMappingURL=notificationService.d.ts.map