import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as challengeService from '../services/challengeService.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, Errors } from '../utils/response.js';

export const challengeRouter = Router();
challengeRouter.use(requireAuth);

const IssueChallengeSchema = z.object({
  opponentUsername: z.string().min(3).max(20),
  teamId: z.string().uuid(),
});

const AcceptChallengeSchema = z.object({
  teamId: z.string().uuid(),
});

// GET /challenges — get pending received + recent sent challenges
challengeRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const { received, sent } = await challengeService.getChallenges(req.user!.id);
  sendSuccess(res, {
    challenges: received.map((c) => ({
      id: c.id,
      fromUserId: c.challenger_id,
      fromUsername: c.challenger_username,
      teamId: c.challenger_team_id,
      status: c.status,
      createdAt: c.created_at,
      expiresAt: c.expires_at,
    })),
    sent: sent.map((c) => ({
      id: c.id,
      toUserId: c.opponent_id,
      toUsername: c.opponent_username,
      teamId: c.challenger_team_id,
      status: c.status,
      matchId: c.match_id,
      createdAt: c.created_at,
    })),
  });
});

// POST /challenges — issue a challenge
challengeRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = IssueChallengeSchema.safeParse(req.body);
  if (!parsed.success) { Errors.validation(res, 'Invalid challenge data', parsed.error.flatten()); return; }
  try {
    const result = await challengeService.issueChallenge(
      req.user!.id,
      parsed.data.teamId,
      parsed.data.opponentUsername
    );
    sendSuccess(res, result);
  } catch (err) {
    if (err instanceof challengeService.ChallengeError) { Errors.conflict(res, err.message); return; }
    throw err;
  }
});

// POST /challenges/:id/accept
challengeRouter.post('/:id/accept', async (req: Request, res: Response): Promise<void> => {
  const parsed = AcceptChallengeSchema.safeParse(req.body);
  if (!parsed.success) { Errors.validation(res, 'Team ID required', parsed.error.flatten()); return; }
  try {
    const result = await challengeService.acceptChallenge(req.params.id, req.user!.id, parsed.data.teamId);
    sendSuccess(res, result);
  } catch (err) {
    if (err instanceof challengeService.ChallengeNotFoundError) { Errors.notFound(res, 'Challenge'); return; }
    if (err instanceof challengeService.ChallengeAccessError) { Errors.forbidden(res); return; }
    if (err instanceof challengeService.ChallengeError) { Errors.conflict(res, err.message); return; }
    throw err;
  }
});

// POST /challenges/:id/decline
challengeRouter.post('/:id/decline', async (req: Request, res: Response): Promise<void> => {
  try {
    await challengeService.declineChallenge(req.params.id, req.user!.id);
    sendSuccess(res, { message: 'Challenge declined' });
  } catch (err) {
    if (err instanceof challengeService.ChallengeNotFoundError) { Errors.notFound(res, 'Challenge'); return; }
    if (err instanceof challengeService.ChallengeAccessError) { Errors.forbidden(res); return; }
    if (err instanceof challengeService.ChallengeError) { Errors.conflict(res, err.message); return; }
    throw err;
  }
});
