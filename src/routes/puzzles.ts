/**
 * puzzles.ts — Puzzle scores and stats.
 *
 * Deliberately NOT behind `requireAppVersion`: puzzle progress is a personal
 * record, and an outdated client should still be able to save and read its
 * stats rather than silently lose a streak while the player waits to update.
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import {
  getPuzzleSolves, getPuzzleStats, syncPuzzleSolves,
} from '../services/puzzleStatsService.js';

export const puzzleRouter = Router();

puzzleRouter.use(requireAuth);

const SolveSchema = z.object({
  puzzleId: z.string().min(1).max(64),
  attempts: z.number().int().min(0).max(100000),
  stars: z.number().int().min(1).max(5).nullish(),
  solvedOnAttempt: z.number().int().min(1).max(100000).nullish(),
  solvedAt: z.string().datetime().nullish(),
  dailyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

// Bounded so a corrupted or malicious client cannot push an unbounded batch.
// The rotation is single digits today; 500 leaves room for years of growth.
const SyncSchema = z.object({ solves: z.array(SolveSchema).max(500) });

// GET /puzzles/me — this player's per-puzzle records plus derived stats.
puzzleRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  const solves = await getPuzzleSolves(req.user!.id);
  const stats = await getPuzzleStats(req.user!.id);
  sendSuccess(res, { solves, stats });
});

// POST /puzzles/sync — push local records, get the merged truth back.
// Idempotent (see THE MERGE RULE in puzzleStatsService), so the client may
// retry freely after a dropped connection.
puzzleRouter.post('/sync', async (req: Request, res: Response): Promise<void> => {
  const parsed = SyncSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid puzzle sync payload');
    return;
  }
  const { solves, stats } = await syncPuzzleSolves(req.user!.id, parsed.data.solves);
  sendSuccess(res, { solves, stats });
});
