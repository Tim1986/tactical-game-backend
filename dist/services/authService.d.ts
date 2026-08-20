import { TokenPair, User, Team } from '../types/index.js';
export declare function issueTokenPair(user: Pick<User, 'id' | 'username'> & {
    tokenVersion: number;
}): TokenPair;
export declare function verifyRefreshToken(token: string): {
    sub: string;
    tokenVersion: number;
};
export interface RegisterInput {
    username: string;
    email: string;
    password: string;
}
export interface RegisterResult {
    user: Pick<User, 'id' | 'username' | 'email' | 'elo' | 'accountLevel'>;
    tokens: TokenPair;
    team: Team;
}
export declare function register(input: RegisterInput): Promise<RegisterResult>;
export interface LoginInput {
    usernameOrEmail: string;
    password: string;
}
export interface LoginResult {
    user: Pick<User, 'id' | 'username' | 'email' | 'elo' | 'accountLevel'>;
    tokens: TokenPair;
}
export declare function login(input: LoginInput): Promise<LoginResult>;
export declare function refresh(token: string): Promise<TokenPair>;
export declare function logoutAll(userId: string): Promise<void>;
export declare function logout(_userId: string): Promise<void>;
/**
 * Start a password reset. ALWAYS resolves without revealing whether the email
 * has an account (prevents enumeration). If the account exists, a 6-digit
 * code is stored (hashed) and emailed.
 */
export declare function requestPasswordReset(email: string): Promise<void>;
/**
 * Complete a password reset: verify the emailed code, set the new password,
 * and revoke every existing session (token_version bump).
 */
export declare function resetPassword(email: string, code: string, newPassword: string): Promise<void>;
export declare function savePushToken(userId: string, token: string, platform: 'ios' | 'android'): Promise<void>;
export declare function devLogin(): Promise<LoginResult>;
export declare class AuthError extends Error {
    constructor(message: string);
}
export declare class ConflictError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=authService.d.ts.map