export declare const config: {
    readonly nodeEnv: string;
    readonly port: number;
    readonly isDevelopment: boolean;
    readonly build: {
        commit: string;
        commitFull: string;
        branch: string;
        dirty: boolean;
        builtAt: string | null;
    };
    readonly db: {
        readonly url: string;
    };
    readonly jwt: {
        readonly accessSecret: string;
        readonly refreshSecret: string;
        readonly accessExpiry: string;
        readonly refreshExpiry: string;
    };
    readonly expo: {
        readonly accessToken: string;
    };
    readonly rateLimit: {
        readonly auth: {
            readonly max: number;
            readonly windowMs: number;
        };
        readonly api: {
            readonly max: number;
            readonly windowMs: number;
        };
    };
    readonly game: {
        readonly turnDeadlineHours: number;
        readonly matchmakingIntervalSeconds: number;
        readonly matchmakingInitialRange: number;
        readonly matchmakingRangeIncrement: number;
        readonly requiredAppVersion: string | null;
    };
    readonly web: {
        readonly origin: string;
        readonly appStoreUrl: string;
        readonly playStoreUrl: string;
        readonly downloadFallbackUrl: string;
        readonly appScheme: string;
        readonly supportEmail: string;
        readonly iosAppId: string;
        readonly androidPackage: string;
        readonly androidSha256: string;
    };
    readonly email: {
        readonly resendApiKey: string;
        readonly fromAddress: string;
        readonly supportInbox: string;
    };
};
//# sourceMappingURL=index.d.ts.map