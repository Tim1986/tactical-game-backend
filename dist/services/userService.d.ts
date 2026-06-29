import { PublicUser, User } from '../types/index.js';
export declare function getMe(userId: string): Promise<(Omit<User, 'passwordHash'> & {
    passwordHash?: never;
}) | null>;
export declare function getPublicProfile(userId: string): Promise<PublicUser | null>;
export declare class UsernameConflictError extends Error {
    constructor();
}
export declare function updateUsername(userId: string, newUsername: string): Promise<void>;
//# sourceMappingURL=userService.d.ts.map