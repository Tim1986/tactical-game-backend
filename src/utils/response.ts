import { Response } from 'express';
import { ApiSuccess, ApiError } from '../types/index.js';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  const body: ApiError = {
    success: false,
    error: { code, message, ...(details !== undefined && { details }) },
  };
  res.status(statusCode).json(body);
}

// Common error shortcuts
export const Errors = {
  unauthorized: (res: Response): void =>
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'),

  forbidden: (res: Response): void =>
    sendError(res, 403, 'FORBIDDEN', 'You do not have permission to perform this action'),

  notFound: (res: Response, resource = 'Resource'): void =>
    sendError(res, 404, 'NOT_FOUND', `${resource} not found`),

  conflict: (res: Response, message: string): void =>
    sendError(res, 409, 'CONFLICT', message),

  validation: (res: Response, message: string, details?: unknown): void =>
    sendError(res, 422, 'VALIDATION_ERROR', message, details),

  internal: (res: Response): void =>
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred'),
};
