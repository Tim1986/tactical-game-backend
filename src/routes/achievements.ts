import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess } from '../utils/response.js';
import { getAchievementsForUser, drainPendingAchievements } from '../services/achievementService.js';

export const achievementRouter = Router();

achievementRouter.use(requireAuth);

// GET /achievements/me — all achievements, unlocked and locked
achievementRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  const achievements = await getAchievementsForUser(req.user!.id);
  sendSuccess(res, { achievements });
});

// POST /achievements/pending — drain unshown achievement notifications
// Client calls this after a match ends. Returns newly unlocked achievements
// and marks them as notified so they won't appear again.
achievementRouter.post('/pending', async (req: Request, res: Response): Promise<void> => {
  const pending = await drainPendingAchievements(req.user!.id);
  sendSuccess(res, { achievements: pending });
});
