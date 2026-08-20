import { PublicUser, User } from '../types/index.js';
export declare function getMe(userId: string): Promise<(Omit<User, 'passwordHash'> & {
    passwordHash?: never;
}) | null>;
export declare function getPublicProfile(userId: string): Promise<PublicUser | null>;
export declare class UsernameConflictError extends Error {
    constructor();
}
export declare function updateUsername(userId: string, newUsername: string): Promise<void>;
export declare class AccountDeletionAuthError extends Error {
    constructor();
}
/**
 * Permanently deletes the user's account after re-authenticating with their
 * password. Because `matches` reference users with RESTRICT, the row is
 * retained but all PII is anonymized and `deleted_at` is set — the account can
 * never be logged into again, disappears from the app, and frees its original
 * username/email for reuse. Active matches are forfeited (opponents get the
 * win) and all derived data (teams, queue entries, push tokens, leaderboard
 * snapshots, reset codes) is removed.
 */
export declare function deleteAccount(userId: string, password: string): Promise<void>;
//# sourceMappingURL=userService.d.ts.map