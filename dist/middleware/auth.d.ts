import { Request, Response, NextFunction } from 'express';
/**
 * requireAuth middleware
 *
 * Verifies the Authorization: Bearer <token> header.
 * On success, sets req.user = { id, username }.
 * On failure, returns 401.
 */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map