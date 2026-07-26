import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import * as userService from '../services/userService.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, sendError, Errors } from '../utils/response.js';

export const userRouter = Router();

// All user routes require authentication
userRouter.use(requireAuth);

// Account deletion re-verifies the password, so throttle it like an auth route
// to prevent brute-forcing via this endpoint.
const deleteAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' } },
});

const DeleteMeSchema = z.object({ password: z.string().min(1, 'Password is required') });

const UpdateMeSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores')
    .optional(),
});

// ---------------------------------------------------------------
// GET /users/me
// ---------------------------------------------------------------
userRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  const user = await userService.getMe(req.user!.id);
  if (!user) {
    Errors.notFound(res, 'User');
    return;
  }
  sendSuccess(res, user);
});

// ---------------------------------------------------------------
// PUT /users/me
// ---------------------------------------------------------------
userRouter.put('/me', async (req: Request, res: Response): Promise<void> => {
  const parsed = UpdateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, 'Invalid update data', parsed.error.flatten());
    return;
  }

  if (!parsed.data.username) {
    Errors.validation(res, 'At least one field must be provided');
    return;
  }

  try {
    await userService.updateUsername(req.user!.id, parsed.data.username);
    const updated = await userService.getMe(req.user!.id);
    sendSuccess(res, updated);
  } catch (err) {
    if (err instanceof userService.UsernameConflictError) {
      Errors.conflict(res, err.message);
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------
// DELETE /users/me  — permanently delete the authenticated account
// Body: { password }. Re-auth required.
// ---------------------------------------------------------------
userRouter.delete('/me', deleteAccountLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = DeleteMeSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, 'Password is required', parsed.error.flatten());
    return;
  }

  try {
    await userService.deleteAccount(req.user!.id, parsed.data.password);
    sendSuccess(res, { message: 'Account deleted' });
  } catch (err) {
    if (err instanceof userService.AccountDeletionAuthError) {
      sendError(res, 401, 'INVALID_PASSWORD', 'Password is incorrect');
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------
// GET /users/:id/profile  (public)
// ---------------------------------------------------------------
userRouter.get('/:id/profile', async (req: Request, res: Response): Promise<void> => {
  const profile = await userService.getPublicProfile(req.params.id);
  if (!profile) {
    Errors.notFound(res, 'User');
    return;
  }
  sendSuccess(res, profile);
});
