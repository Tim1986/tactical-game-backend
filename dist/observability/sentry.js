"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSentry = initSentry;
exports.isSentryEnabled = isSentryEnabled;
exports.captureError = captureError;
exports.flushSentry = flushSentry;
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
const Sentry = __importStar(require("@sentry/node"));
const index_js_1 = require("../config/index.js");
let enabled = false;
function initSentry() {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn)
        return; // no DSN → stay inert
    Sentry.init({
        dsn,
        environment: index_js_1.config.nodeEnv,
        release: process.env.RAILWAY_GIT_COMMIT_SHA ?? undefined,
        tracesSampleRate: 0, // errors only — never performance/behavioural data
    });
    enabled = true;
}
function isSentryEnabled() {
    return enabled;
}
/** Report a handled error with optional structured context. No-op if disabled. */
function captureError(err, context) {
    if (!enabled)
        return;
    Sentry.captureException(err, context ? { extra: context } : undefined);
}
/** Flush buffered events before the process exits (uncaughtException path). */
async function flushSentry(timeoutMs = 2000) {
    if (!enabled)
        return;
    try {
        await Sentry.flush(timeoutMs);
    }
    catch { /* best-effort on the way out */ }
}
//# sourceMappingURL=sentry.js.map