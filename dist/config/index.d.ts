export declare const config: {
    readonly nodeEnv: string;
    readonly port: number;
    readonly isDevelopment: boolean;
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
    };
};
//# sourceMappingURL=index.d.ts.map