"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const index_js_1 = require("./config/index.js");
const upload_js_1 = __importDefault(require("./routes/upload.js"));
const health_js_1 = __importDefault(require("./routes/health.js"));
// Validate configuration
(0, index_js_1.validateConfig)();
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
// CORS - allow requests from Vercel frontend
app.use((0, cors_1.default)({
    origin: [
        'https://hafiportrait.photography',
        'https://www.hafiportrait.photography',
        /\.vercel\.app$/,
        'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
}));
// Parse JSON (for non-file requests)
app.use(express_1.default.json());
// Routes
app.use('/health', health_js_1.default);
app.use('/upload', upload_js_1.default);
// Root endpoint
app.get('/', (_req, res) => {
    res.json({
        name: 'Hafiportrait Upload API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/health',
            upload: {
                portfolio: 'POST /upload/portfolio',
                portfolioBatch: 'POST /upload/portfolio/batch',
                event: 'POST /upload/event/:eventId',
                eventBatch: 'POST /upload/event/:eventId/batch',
                slideshow: 'POST /upload/slideshow',
            },
        },
    });
});
// Error handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: index_js_1.config.nodeEnv === 'development' ? err.message : undefined,
    });
});
// Start server
const server = app.listen(index_js_1.config.port, () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   Hafiportrait Upload API');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Port:        ${index_js_1.config.port}`);
    console.log(`   Environment: ${index_js_1.config.nodeEnv}`);
    console.log(`   Storage:     R2 only`);
    console.log(`   R2 Bucket:   ${index_js_1.config.r2.bucket}`);
    console.log('═══════════════════════════════════════════════════════');
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map