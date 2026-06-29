import { Response } from 'express';
export declare function sendSuccess<T>(res: Response, data: T, statusCode?: number): void;
export declare function sendError(res: Response, statusCode: number, code: string, message: string, details?: unknown): void;
export declare const Errors: {
    unauthorized: (res: Response) => void;
    forbidden: (res: Response) => void;
    notFound: (res: Response, resource?: string) => void;
    conflict: (res: Response, message: string) => void;
    validation: (res: Response, message: string, details?: unknown) => void;
    internal: (res: Response) => void;
};
//# sourceMappingURL=response.d.ts.map