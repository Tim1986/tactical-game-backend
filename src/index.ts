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
    startBackgroundJobs();
  });
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
// trigger redeploy
