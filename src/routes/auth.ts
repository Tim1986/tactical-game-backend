import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, sendError, Errors } from '../utils/response.js';
import { config } from '../config/index.js';

export const authRouter = Router();

// ---------------------------------------------------------------
// Input schemas (Zod validates all incoming data)
// ---------------------------------------------------------------

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

const LoginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const PushTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  platform: z.enum(['ios', 'android']),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

// ---------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, 'Invalid registration data', parsed.error.flatten());
    return;
  }

  try {
    const result = await authService.register(parsed.data);
    sendSuccess(res, result, 201);
  } catch (err) {
    if (err instanceof authService.ConflictError) {
      Errors.conflict(res, err.message);
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, 'Invalid login data', parsed.error.flatten());
    return;
  }

  try {
    const result = await authService.login(parsed.data);
    sendSuccess(res, result);
  } catch (err) {
    if (err instanceof authService.AuthError) {
      sendError(res, 401, 'INVALID_CREDENTIALS', err.message);
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------
authRouter.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const parsed = RefreshSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, 'Refresh token is required');
    return;
  }

  try {
    const tokens = await authService.refresh(parsed.data.refreshToken);
    sendSuccess(res, { tokens });
  } catch (err) {
    if (err instanceof authService.AuthError) {
      Errors.unauthorized(res);
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------
// POST /auth/forgot-password
// Always 200 — never reveals whether the email has an account.
// ---------------------------------------------------------------
authRouter.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const parsed = ForgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, 'Invalid email address');
    return;
  }
  await authService.requestPasswordReset(parsed.data.email);
  sendSuccess(res, { message: 'If that email has an account, a reset code is on its way.' });
});

// ---------------------------------------------------------------
// POST /auth/reset-password
// ---------------------------------------------------------------
authRouter.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const parsed = ResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, 'Invalid reset data', parsed.error.flatten());
    return;
  }
  try {
    const { email, code, newPassword } = parsed.data;
    await authService.resetPassword(email, code, newPassword);
    sendSuccess(res, { message: 'Password updated. You can now log in.' });
  } catch (err) {
    if (err instanceof authService.AuthError) {
      sendError(res, 400, 'INVALID_RESET_CODE', err.message);
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------
// POST /auth/dev-login  (development only — no password required)
// ---------------------------------------------------------------
authRouter.post('/dev-login', async (req: Request, res: Response): Promise<void> => {
  if (!config.isDevelopment) {
    Errors.notFound(res);
    return;
  }
  const result = await authService.devLogin();
  sendSuccess(res, result);
});

// ---------------------------------------------------------------
// POST /auth/logout  (single device)
// ---------------------------------------------------------------
authRouter.post('/logout', requireAuth, async (req: Request, res: Response): Promise<void> => {
  // Access token is short-lived; client must discard both tokens.
  // Server-side we just acknowledge.
  await authService.logout(req.user!.id);
  sendSuccess(res, { message: 'Logged out' });
});

// ---------------------------------------------------------------
// POST /auth/logout-all  (invalidates all refresh tokens)
// ---------------------------------------------------------------
authRouter.post('/logout-all', requireAuth, async (req: Request, res: Response): Promise<void> => {
  await authService.logoutAll(req.user!.id);
  sendSuccess(res, { message: 'Logged out from all devices' });
});

// ---------------------------------------------------------------
// POST /auth/push-token  (register device push token)
// ---------------------------------------------------------------
authRouter.post('/push-token', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = PushTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, 'Invalid push token data', parsed.error.flatten());
    return;
  }

  await authService.savePushToken(req.user!.id, parsed.data.token, parsed.data.platform);
  sendSuccess(res, { message: 'Push token registered' });
});
