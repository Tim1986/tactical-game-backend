import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as matchmakingService from '../services/matchmakingService.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, Errors } from '../utils/response.js';

export const matchmakingRouter = Router();
matchmakingRouter.use(requireAuth);

const EnterQueueSchema = z.object({ teamId: z.string().uuid('Invalid team ID') });
const ChallengeSchema = z.object({ teamId: z.string().uuid('Invalid team ID'), opponentId: z.string().uuid('Invalid opponent ID') });

matchmakingRouter.post('/queue', async (req: Request, res: Response): Promise<void> => {
  const parsed = EnterQueueSchema.safeParse(req.body);
  if (!parsed.success) { Errors.validation(res, 'Invalid queue data', parsed.error.flatten()); return; }
  try {
    const result = await matchmakingService.enterQueue(req.user!.id, parsed.data.teamId);
    sendSuccess(res, { message: 'Entered matchmaking queue', position: result.position }, 201);
  } catch (err) {
    if (err instanceof matchmakingService.AlreadyInQueueError) { Errors.conflict(res, err.message); return; }
    if (err instanceof matchmakingService.ActiveMatchExistsError) { Errors.conflict(res, err.message); return; }
    if (err instanceof matchmakingService.TeamNotFoundError) { Errors.notFound(res, 'Team'); return; }
    throw err;
  }
});

matchmakingRouter.delete('/queue', async (req: Request, res: Response): Promise<void> => {
  try {
    await matchmakingService.leaveQueue(req.user!.id);
    sendSuccess(res, { message: 'Left matchmaking queue' });
  } catch (err) {
    if (err instanceof matchmakingService.NotInQueueError) { Errors.notFound(res, 'Queue entry'); return; }
    throw err;
  }
});

matchmakingRouter.get('/queue', async (req: Request, res: Response): Promise<void> => {
  const status = await matchmakingService.getQueueStatus(req.user!.id);
  sendSuccess(res, status);
});

matchmakingRouter.post('/challenge', async (req: Request, res: Response): Promise<void> => {
  const parsed = ChallengeSchema.safeParse(req.body);
  if (!parsed.success) { Errors.validation(res, 'Invalid challenge data', parsed.error.flatten()); return; }
  try {
    await matchmakingService.sendChallenge(req.user!.id, parsed.data.teamId, parsed.data.opponentId);
    sendSuccess(res, { message: 'Challenge sent' }, 201);
  } catch (err) {
    if (err instanceof matchmakingService.ChallengeError) { Errors.validation(res, err.message); return; }
    if (err instanceof matchmakingService.TeamNotFoundError) { Errors.notFound(res, 'Team'); return; }
    throw err;
  }
});
