"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_js_1 = require("../config/index.js");
const router = (0, express_1.Router)();
/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (_req, res) => {
    const checks = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        storage: 'unknown',
        r2: 'unknown',
    };
    // R2 storage is used for originals + thumbnails
    checks.storage = index_js_1.config.r2.publicUrl ? 'r2' : 'not configured';
    // Check R2 config
    if (index_js_1.config.r2.endpoint && index_js_1.config.r2.accessKey && index_js_1.config.r2.secretKey) {
        checks.r2 = 'configured';
    }
    else {
        checks.r2 = 'not configured';
    }
    const allOk = checks.storage === 'r2' && checks.r2 !== 'not configured';
    res.status(allOk ? 200 : 503).json(checks);
});
/**
 * GET /health/storage
 * Check storage space
 */
router.get('/storage', async (_req, res) => {
    res.json({
        storage: 'r2',
        bucket: index_js_1.config.r2.bucket,
        publicUrl: index_js_1.config.r2.publicUrl,
    });
});
exports.default = router;
//# sourceMappingURL=health.js.map