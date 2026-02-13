"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment from parent directory or local
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env.production') });
exports.config = {
    // Server
    port: parseInt(process.env.PORT ||
        process.env.RAILWAY_PORT ||
        process.env.UPLOAD_API_PORT ||
        (process.env.NODE_ENV === 'production' ? '8080' : '4000'), 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    // R2 Configuration (for thumbnails)
    r2: {
        endpoint: process.env.R2_ENDPOINT || '',
        accessKey: process.env.R2_ACCESS_KEY || '',
        secretKey: process.env.R2_SECRET_KEY || '',
        bucket: process.env.R2_BUCKET || 'foto',
        publicUrl: process.env.R2_PUBLIC_URL?.replace(/"/g, '') || '',
    },
    // Upload limits
    upload: {
        maxFileSize: 200 * 1024 * 1024, // 200MB
        maxFiles: 50,
        allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/heic',
            'image/heif',
        ],
    },
    // Thumbnail sizes
    thumbnails: {
        small: { width: 400, height: 400 },
        medium: { width: 800, height: 800 },
        large: { width: 1200, height: 1200 },
    },
    // Auth
    apiKey: process.env.UPLOAD_API_KEY || '',
    // Database (for registering photos)
    databaseUrl: process.env.DATABASE_URL || '',
};
// Validate required config
function validateConfig() {
    const required = [
        { key: 'R2_ENDPOINT', value: exports.config.r2.endpoint },
        { key: 'R2_ACCESS_KEY', value: exports.config.r2.accessKey },
        { key: 'R2_SECRET_KEY', value: exports.config.r2.secretKey },
        { key: 'UPLOAD_API_KEY', value: exports.config.apiKey },
    ];
    const missing = required.filter((r) => !r.value);
    if (missing.length > 0) {
        console.warn('⚠️  Missing environment variables:', missing.map((m) => m.key).join(', '));
    }
}
//# sourceMappingURL=index.js.map