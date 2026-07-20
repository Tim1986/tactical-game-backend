import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { Errors } from '../utils/response.js';

export function requireAppVersion(req: Request, res: Response, next: NextFunction): void {
  const required = config.game.requiredAppVersion;
  if (!required) { next(); return; }
  const clientVersion = req.headers['x-app-version'] as string | undefined;
  if (!clientVersion || clientVersion !== required) {
    Errors.upgradeRequired(res, required);
    return;
  }
  next();
}
