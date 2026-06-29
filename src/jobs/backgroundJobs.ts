import cron from 'node-cron';
import { runMatchmakingJob, runDeadlineEnforcer } from '../services/matchmakingService.js';
import { refreshLeaderboardSnapshot } from '../services/leaderboardService.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export function startBackgroundJobs(): void {
  const matchmakingIntervalMs = config.game.matchmakingIntervalSeconds * 1000;
  const matchmakingJob = setInterval(() => {
    runMatchmakingJob().catch((err: unknown) => { logger.error({ err }, 'Matchmaking job failed'); });
  }, matchmakingIntervalMs);
  logger.info({ intervalSeconds: config.game.matchmakingIntervalSeconds }, 'Matchmaking job started');

  cron.schedule('*/5 * * * *', () => {
    runDeadlineEnforcer().catch((err: unknown) => { logger.error({ err }, 'Deadline enforcer job failed'); });
  });
  logger.info('Deadline enforcer started (every 5 minutes)');

  // Refresh leaderboard snapshot once per day at 00:05 UTC
  cron.schedule('5 0 * * *', () => {
    refreshLeaderboardSnapshot().catch((err: unknown) => { logger.error({ err }, 'Leaderboard refresh failed'); });
  });
  logger.info('Leaderboard daily refresh started (00:05 UTC)');

  process.on('SIGTERM', () => { clearInterval(matchmakingJob); logger.info('Background jobs stopped'); });
  process.on('SIGINT', () => { clearInterval(matchmakingJob); logger.info('Background jobs stopped'); });
}
