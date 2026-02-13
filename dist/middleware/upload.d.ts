import multer from 'multer';
/**
 * Multer configuration - memory storage (buffer)
 */
export declare const upload: multer.Multer;
/**
 * Single file upload middleware
 */
export declare const uploadSingle: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Multiple files upload middleware
 */
export declare const uploadMultiple: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Error handler for multer errors
 */
export declare function handleMulterError(error: unknown): {
    status: number;
    message: string;
};
//# sourceMappingURL=upload.d.ts.map