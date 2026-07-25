import { Router, Request, Response } from 'express';
import { config } from '../config/index.js';
import { sendSuccess } from '../utils/response.js';

export const versionRouter = Router();

// GET /version — public, no auth, no version middleware
// Returns the required app version (null if no gate is active) plus the build
// stamp of the running server, so you can confirm which commit is deployed.
versionRouter.get('/', (_req: Request, res: Response): void => {
  sendSuccess(res, {
    requiredVersion: config.game.requiredAppVersion ?? null,
    commit: config.build.commit,
    branch: config.build.branch,
    dirty: config.build.dirty,
    builtAt: config.build.builtAt,
  });
});
