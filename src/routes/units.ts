import { Router, Request, Response } from 'express';
import * as unitService from '../services/unitService.js';
import * as userService from '../services/userService.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, Errors } from '../utils/response.js';

export const unitRouter = Router();

unitRouter.use(requireAuth);

// ---------------------------------------------------------------
// GET /units
// Returns all unit definitions available to this player based on
// their current account level. Also returns the full ability
// definitions for those units so the client can render tooltips.
// ---------------------------------------------------------------
unitRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const me = await userService.getMe(req.user!.id);
  if (!me) {
    Errors.unauthorized(res);
    return;
  }

  const { units, abilities } = await unitService.getUnlockedUnits(me.accountLevel);
  sendSuccess(res, { units, abilities });
});
