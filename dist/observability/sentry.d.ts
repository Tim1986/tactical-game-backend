export declare function initSentry(): void;
export declare function isSentryEnabled(): boolean;
/** Report a handled error with optional structured context. No-op if disabled. */
export declare function captureError(err: unknown, context?: Record<string, unknown>): void;
/** Flush buffered events before the process exits (uncaughtException path). */
export declare function flushSentry(timeoutMs?: number): Promise<void>;
//# sourceMappingURL=sentry.d.ts.map