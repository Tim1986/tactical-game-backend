import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess } from '../utils/response.js';
import { getLeaderboard, refreshLeaderboardSnapshot } from '../services/leaderboardService.js';

export const leaderboardRouter = Router();
leaderboardRouter.use(requireAuth);

// GET /leaderboard — current top 10
leaderboardRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  const entries = await getLeaderboard();
  sendSuccess(res, { leaderboard: entries });
});

// POST /leaderboard/refresh — trigger manual snapshot (admin use / cron)
leaderboardRouter.post('/refresh', async (_req: Request, res: Response): Promise<void> => {
  await refreshLeaderboardSnapshot();
  sendSuccess(res, { refreshed: true });
});
