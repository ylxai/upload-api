"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = apiKeyAuth;
exports.bearerAuth = bearerAuth;
exports.authenticate = authenticate;
const index_js_1 = require("../config/index.js");
/**
 * API Key authentication middleware
 */
function apiKeyAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        res.status(401).json({ error: 'Missing API key' });
        return;
    }
    if (apiKey !== index_js_1.config.apiKey) {
        res.status(403).json({ error: 'Invalid API key' });
        return;
    }
    next();
}
/**
 * Optional: Bearer token auth (for future JWT support)
 */
function bearerAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
    }
    const token = authHeader.substring(7);
    // For now, just check against API key
    // Later can implement JWT verification
    if (token !== index_js_1.config.apiKey) {
        res.status(403).json({ error: 'Invalid token' });
        return;
    }
    next();
}
/**
 * Combined auth - accepts either API key or Bearer token
 */
function authenticate(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers.authorization;
    // Check API key first
    if (apiKey && apiKey === index_js_1.config.apiKey) {
        next();
        return;
    }
    // Check Bearer token
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token === index_js_1.config.apiKey) {
            next();
            return;
        }
    }
    res.status(401).json({ error: 'Unauthorized' });
}
//# sourceMappingURL=auth.js.map