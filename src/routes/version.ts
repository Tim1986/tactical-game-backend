import { Router, Request, Response } from 'express';
import { config } from '../config/index.js';
import { sendSuccess } from '../utils/response.js';

export const versionRouter = Router();

// GET /version — public, no auth, no version middleware
// Returns the currently required app version (null if no gate is active)
versionRouter.get('/', (_req: Request, res: Response): void => {
  sendSuccess(res, { requiredVersion: config.game.requiredAppVersion ?? null });
});
