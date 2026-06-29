import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { Errors } from '../utils/response.js';
import { AccessTokenPayload } from '../types/index.js';

/**
 * requireAuth middleware
 *
 * Verifies the Authorization: Bearer <token> header.
 * On success, sets req.user = { id, username }.
 * On failure, returns 401.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    Errors.unauthorized(res);
    return;
  }

  const token = header.slice(7); // Remove "Bearer "

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;

    req.user = {
      id: payload.sub,
      username: payload.username,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      Errors.unauthorized(res);
      return;
    }
    Errors.unauthorized(res);
  }
}
