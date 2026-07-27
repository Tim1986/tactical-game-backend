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

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
