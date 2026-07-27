import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import * as challengeService from '../services/challengeService.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, Errors } from '../utils/response.js';

export const challengeRouter = Router();
challengeRouter.use(requireAuth);

const inviteLimiter = rateLimit({ windowMs: 24 * 60 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => req.user?.id ?? req.ip ?? 'unknown' });

const IssueChallengeSchema = z.object({
  opponentUsername: z.string().min(3).max(20),
  teamId: z.string().uuid(),
});

const AcceptChallengeSchema = z.object({
  teamId: z.string().uuid(),
});

// GET /challenges — get pending received + recent sent challenges + open sent invites
challengeRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const { received, sent, sentInvites } = await challengeService.getChallenges(req.user!.id);
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
    sentInvites: sentInvites.map((inv) => ({
      token: inv.token,
      status: inv.status,
      matchId: inv.match_id,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
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

// ── Invite (open-token) routes ────────────────────────────────────────────────

const InviteCreateSchema = z.object({ teamId: z.string().uuid() });
const InviteClaimSchema = z.object({ teamId: z.string().uuid() });

// POST /challenges/invite — create an open challenge invite link
challengeRouter.post('/invite', inviteLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = InviteCreateSchema.safeParse(req.body);
  if (!parsed.success) { Errors.validation(res, 'teamId required', parsed.error.flatten()); return; }
  try {
    const result = await challengeService.createInvite(req.user!.id, parsed.data.teamId);
    sendSuccess(res, result);
  } catch (err) {
    if (err instanceof challengeService.InviteError) { Errors.conflict(res, err.message); return; }
    throw err;
  }
});

// GET /challenges/invite/:token — public metadata (challenger username + status)
challengeRouter.get('/invite/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const info = await challengeService.getInviteInfo(req.params.token);
    sendSuccess(res, info);
  } catch (err) {
    if (err instanceof challengeService.InviteNotFoundError) { Errors.notFound(res, 'Invite'); return; }
    throw err;
  }
});

// POST /challenges/invite/:token/claim — authenticated; first claimer wins
challengeRouter.post('/invite/:token/claim', async (req: Request, res: Response): Promise<void> => {
  const parsed = InviteClaimSchema.safeParse(req.body);
  if (!parsed.success) { Errors.validation(res, 'teamId required', parsed.error.flatten()); return; }
  try {
    const result = await challengeService.claimInvite(req.params.token, req.user!.id, parsed.data.teamId);
    sendSuccess(res, result);
  } catch (err) {
    if (err instanceof challengeService.InviteNotFoundError) { Errors.notFound(res, 'Invite'); return; }
    if (err instanceof challengeService.InviteError) { Errors.conflict(res, err.message); return; }
    throw err;
  }
});
