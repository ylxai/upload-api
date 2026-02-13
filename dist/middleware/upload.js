"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMultiple = exports.uploadSingle = exports.upload = void 0;
exports.handleMulterError = handleMulterError;
const multer_1 = __importDefault(require("multer"));
const index_js_1 = require("../config/index.js");
/**
 * File filter - validate mime type
 */
const fileFilter = (_req, file, cb) => {
    if (index_js_1.config.upload.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
};
/**
 * Multer configuration - memory storage (buffer)
 */
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: index_js_1.config.upload.maxFileSize,
        files: index_js_1.config.upload.maxFiles,
    },
    fileFilter,
});
/**
 * Single file upload middleware
 */
exports.uploadSingle = exports.upload.single('file');
/**
 * Multiple files upload middleware
 */
exports.uploadMultiple = exports.upload.array('files', index_js_1.config.upload.maxFiles);
/**
 * Error handler for multer errors
 */
function handleMulterError(error) {
    if (error instanceof multer_1.default.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return {
                    status: 413,
                    message: `File too large. Maximum size: ${index_js_1.config.upload.maxFileSize / 1024 / 1024}MB`,
                };
            case 'LIMIT_FILE_COUNT':
                return {
                    status: 400,
                    message: `Too many files. Maximum: ${index_js_1.config.upload.maxFiles}`,
                };
            case 'LIMIT_UNEXPECTED_FILE':
                return {
                    status: 400,
                    message: 'Unexpected file field',
                };
            default:
                return {
                    status: 400,
                    message: error.message,
                };
        }
    }
    if (error instanceof Error) {
        return {
            status: 400,
            message: error.message || 'Upload failed',
        };
    }
    return {
        status: 400,
        message: 'Upload failed',
    };
}
//# sourceMappingURL=upload.js.map