"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMetadata = extractMetadata;
exports.validateImage = validateImage;
exports.processImage = processImage;
exports.getThumbnailUrls = getThumbnailUrls;
const sharp_1 = __importDefault(require("sharp"));
const index_js_1 = require("../config/index.js");
const r2_js_1 = require("./r2.js");
/**
 * Extract image metadata
 */
async function extractMetadata(buffer) {
    const metadata = await (0, sharp_1.default)(buffer).metadata();
    return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
    };
}
/**
 * Validate image buffer (magic bytes)
 */
async function validateImage(buffer, _mimeType) {
    try {
        const { fileTypeFromBuffer } = await import('file-type');
        const detected = await fileTypeFromBuffer(buffer);
        if (!detected) {
            return { valid: false, error: 'Could not detect file type' };
        }
        const allowedMimes = index_js_1.config.upload.allowedMimeTypes;
        if (!allowedMimes.includes(detected.mime)) {
            return { valid: false, error: `Invalid file type: ${detected.mime}` };
        }
        // Basic sharp validation
        await (0, sharp_1.default)(buffer).metadata();
        return { valid: true };
    }
    catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Invalid image',
        };
    }
}
/**
 * Generate single thumbnail
 */
async function generateThumbnail(buffer, maxSize, format) {
    let pipeline = (0, sharp_1.default)(buffer)
        .rotate() // Auto-rotate based on EXIF
        .resize(maxSize, maxSize, {
        fit: 'inside',
        withoutEnlargement: true,
    });
    if (format === 'webp') {
        pipeline = pipeline.webp({ quality: 85 });
    }
    else {
        pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
    }
    const outputBuffer = await pipeline.toBuffer();
    const metadata = await (0, sharp_1.default)(outputBuffer).metadata();
    return {
        buffer: outputBuffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
    };
}
/**
 * Process image and generate all thumbnails
 */
async function processImage(buffer, filename, type, eventId = null) {
    // Extract original metadata
    const originalMeta = await extractMetadata(buffer);
    const thumbnails = [];
    const sizes = [
        'small',
        'medium',
        'large',
    ];
    const formats = ['jpeg', 'webp'];
    // Generate thumbnails for each size and format
    for (const size of sizes) {
        const maxDimension = index_js_1.config.thumbnails[size].width;
        for (const format of formats) {
            try {
                const { buffer: thumbBuffer, width, height, } = await generateThumbnail(buffer, maxDimension, format);
                const key = (0, r2_js_1.buildThumbnailKey)(type, eventId, filename, size, format);
                const contentType = format === 'webp' ? 'image/webp' : 'image/jpeg';
                const { url } = await (0, r2_js_1.uploadToR2)(thumbBuffer, key, contentType);
                thumbnails.push({
                    size,
                    format,
                    url,
                    key,
                    width,
                    height,
                });
            }
            catch (error) {
                console.error(`Failed to generate ${size} ${format} thumbnail:`, error);
            }
        }
    }
    return {
        original: originalMeta,
        thumbnails,
    };
}
/**
 * Get best thumbnail URL for each size (prefer WebP)
 */
function getThumbnailUrls(thumbnails) {
    const getUrl = (size) => {
        const webp = thumbnails.find((t) => t.size === size && t.format === 'webp');
        if (webp)
            return webp.url;
        const jpeg = thumbnails.find((t) => t.size === size && t.format === 'jpeg');
        return jpeg?.url || null;
    };
    return {
        small: getUrl('small'),
        medium: getUrl('medium'),
        large: getUrl('large'),
    };
}
//# sourceMappingURL=image-processor.js.map