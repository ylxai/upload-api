"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToR2 = uploadToR2;
exports.deleteFromR2 = deleteFromR2;
exports.buildThumbnailKey = buildThumbnailKey;
const client_s3_1 = require("@aws-sdk/client-s3");
const index_js_1 = require("../config/index.js");
// Initialize R2 client
const r2Client = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: index_js_1.config.r2.endpoint,
    credentials: {
        accessKeyId: index_js_1.config.r2.accessKey,
        secretAccessKey: index_js_1.config.r2.secretKey,
    },
});
/**
 * Upload file to R2
 */
async function uploadToR2(buffer, key, contentType) {
    await r2Client.send(new client_s3_1.PutObjectCommand({
        Bucket: index_js_1.config.r2.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));
    const url = `${index_js_1.config.r2.publicUrl}/${key}`;
    return { url, key };
}
/**
 * Delete file from R2
 */
async function deleteFromR2(key) {
    await r2Client.send(new client_s3_1.DeleteObjectCommand({
        Bucket: index_js_1.config.r2.bucket,
        Key: key,
    }));
}
/**
 * Build storage key for thumbnails
 */
function buildThumbnailKey(type, eventId, filename, size, format) {
    const baseName = filename.replace(/\.[^.]+$/, '');
    const ext = format === 'webp' ? 'webp' : 'jpg';
    if (type === 'events' && eventId) {
        return `events/${eventId}/thumbnails/${baseName}-${size}.${ext}`;
    }
    return `${type}/thumbnails/${baseName}-${size}.${ext}`;
}
//# sourceMappingURL=r2.js.map