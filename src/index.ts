import { createApp } from './app.js';
import { config } from './config/index.js';
import { checkDatabaseConnection } from './db/pool.js';
import { startBackgroundJobs } from './jobs/backgroundJobs.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  await checkDatabaseConnection();
  const app = createApp();
  app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
    // Security tripwire: dev-login is passwordless and must never be reachable in
    // a real deployment. isDevelopment defaults to true when NODE_ENV is unset,
    // so shout loudly if it's on — a deployed instance seeing this is misconfigured.
    if (config.isDevelopment) {
      logger.warn('⚠️  DEV MODE: /auth/dev-login is ENABLED (passwordless). This must be OFF in production — set NODE_ENV=production.');
    }
    startBackgroundJobs();
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
  logger.error({ err: reason }, 'UNHANDLED REJECTION — server kept alive, investigate');
});

// An uncaught exception, by contrast, leaves the process in an undefined state.
// Log it and let the platform restart us cleanly.
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'UNCAUGHT EXCEPTION — exiting for a clean restart');
  process.exit(1);
});

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
