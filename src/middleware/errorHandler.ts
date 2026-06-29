import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { Errors } from '../utils/response.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express requires all 4 params even if next is unused
  _next: NextFunction
): void {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  Errors.internal(res);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.path}`,
    },
  });
}
