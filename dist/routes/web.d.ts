import { Request, Response } from 'express';
export declare const WEB_ROOT: string;
export declare const webRouter: import("express-serve-static-core").Router;
/** Serve the branded 404 page — call this from app.ts AFTER all API routers. */
export declare function webNotFound(_req: Request, res: Response): void;
//# sourceMappingURL=web.d.ts.map