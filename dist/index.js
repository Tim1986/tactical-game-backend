"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sentry_js_1 = require("./observability/sentry.js");
const app_js_1 = require("./app.js");
const index_js_1 = require("./config/index.js");
const pool_js_1 = require("./db/pool.js");
const backgroundJobs_js_1 = require("./jobs/backgroundJobs.js");
const logger_js_1 = require("./utils/logger.js");
async function main() {
    (0, sentry_js_1.initSentry)(); // no-op unless SENTRY_DSN is set
    await (0, pool_js_1.checkDatabaseConnection)();
    const app = (0, app_js_1.createApp)();
    app.listen(index_js_1.config.port, () => {
        logger_js_1.logger.info({ port: index_js_1.config.port, env: index_js_1.config.nodeEnv }, 'Server started');
        // Security tripwire: dev-login is passwordless and must never be reachable in
        // a real deployment. isDevelopment defaults to true when NODE_ENV is unset,
        // so shout loudly if it's on — a deployed instance seeing this is misconfigured.
        if (index_js_1.config.isDevelopment) {
            logger_js_1.logger.warn('⚠️  DEV MODE: /auth/dev-login is ENABLED (passwordless). This must be OFF in production — set NODE_ENV=production.');
        }
        (0, backgroundJobs_js_1.startBackgroundJobs)();
    });
}
// ── Last-resort guards ───────────────────────────────────────────────────────
// Node 20 kills the process on an unhandled promise rejection. Every background
// task here is fire-and-forget (push notifications, achievement evaluation), so
// a single unguarded rejection anywhere in that code takes down a live game
// server for everyone — which is precisely what happened on 2026-08-10, from a
// Date being formatted as a string in leaderboard code nobody was even looking
// at. Those call sites are now individually guarded; this is the backstop for
// the ones nobody has written yet.
//
// Deliberately does NOT exit: a request handler that fails should return a 500,
// not evict every connected player. These are logged at error level so they
// stay visible rather than becoming invisible swallowed failures.
process.on('unhandledRejection', (reason) => {
    logger_js_1.logger.error({ err: reason }, 'UNHANDLED REJECTION — server kept alive, investigate');
    (0, sentry_js_1.captureError)(reason, { kind: 'unhandledRejection' });
});
// An uncaught exception, by contrast, leaves the process in an undefined state.
// Log it and let the platform restart us cleanly.
process.on('uncaughtException', (err) => {
    logger_js_1.logger.fatal({ err }, 'UNCAUGHT EXCEPTION — exiting for a clean restart');
    (0, sentry_js_1.captureError)(err, { kind: 'uncaughtException' });
    // Flush the crash report before the process dies, then exit.
    void (0, sentry_js_1.flushSentry)().finally(() => process.exit(1));
});
main().catch((err) => {
    logger_js_1.logger.error({ err }, 'Failed to start server');
    process.exit(1);
});
//# sourceMappingURL=index.js.map