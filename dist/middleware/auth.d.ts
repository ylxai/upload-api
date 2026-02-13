import { Request, Response, NextFunction } from 'express';
/**
 * API Key authentication middleware
 */
export declare function apiKeyAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Optional: Bearer token auth (for future JWT support)
 */
export declare function bearerAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Combined auth - accepts either API key or Bearer token
 */
export declare function authenticate(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map