"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueFilename = generateUniqueFilename;
exports.buildOriginalKey = buildOriginalKey;
exports.saveOriginal = saveOriginal;
const uuid_1 = require("uuid");
const r2_js_1 = require("./r2.js");
/**
 * Generate unique filename
 */
function generateUniqueFilename(originalName) {
    const ext = originalName.includes('.')
        ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase()
        : '';
    const baseName = originalName
        .replace(ext, '')
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .substring(0, 50);
    const timestamp = Date.now();
    const uniqueId = (0, uuid_1.v4)().substring(0, 8);
    return `${baseName}-${timestamp}-${uniqueId}${ext}`;
}
/**
 * Build storage key for original files in R2
 */
function buildOriginalKey(type, eventId, filename) {
    if (type === 'events' && eventId) {
        return `events/${eventId}/originals/${filename}`;
    }
    return `${type}/originals/${filename}`;
}
/**
 * Save original file to R2 storage
 */
async function saveOriginal(buffer, type, eventId, filename, contentType) {
    const key = buildOriginalKey(type, eventId, filename);
    const { url } = await (0, r2_js_1.uploadToR2)(buffer, key, contentType);
    return { url, key };
}
//# sourceMappingURL=storage.js.map