/**
 * Sentry crash/error reporting (SEN1). Deliberately minimal and privacy-first:
 *
 *  - Reports CRASHES AND ERRORS ONLY. `tracesSampleRate: 0` means no
 *    performance tracing and no behavioural/analytics data leaves the server —
 *    the "no-tracking" ethos (GAMEPLAN SEN1). If product analytics is ever
 *    wanted, that is a separate, explicit owner decision.
 *  - INERT WITHOUT A DSN. With `SENTRY_DSN` unset, init is a no-op and every
 *    capture helper does nothing, so local dev and any un-provisioned
 *    deployment behave exactly as before this file existed.
 *
 * The owner provisions one Sentry project for the backend and sets SENTRY_DSN
 * on Railway; nothing here carries a secret.
 */
import * as Sentry from '@sentry/node';
import { config } from '../config/index.js';

let enabled = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // no DSN → stay inert
  Sentry.init({
    dsn,
    environment: config.nodeEnv,
    release: process.env.RAILWAY_GIT_COMMIT_SHA ?? undefined,
    tracesSampleRate: 0, // errors only — never performance/behavioural data
  });
  enabled = true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

/** Report a handled error with optional structured context. No-op if disabled. */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

/** Flush buffered events before the process exits (uncaughtException path). */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!enabled) return;
  try { await Sentry.flush(timeoutMs); } catch { /* best-effort on the way out */ }
}
