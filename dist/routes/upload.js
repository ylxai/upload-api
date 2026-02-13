"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const upload_js_1 = require("../middleware/upload.js");
const image_processor_js_1 = require("../services/image-processor.js");
const storage_js_1 = require("../services/storage.js");
const db_js_1 = require("../services/db.js");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_js_1.authenticate);
/**
 * POST /upload/portfolio
 * Upload single photo to portfolio
 */
router.post('/portfolio', (req, res, _next) => {
    (0, upload_js_1.uploadSingle)(req, res, (err) => {
        void (async () => {
            if (err) {
                const { status, message } = (0, upload_js_1.handleMulterError)(err);
                return res.status(status).json({ error: message });
            }
            try {
                const file = req.file;
                if (!file) {
                    return res.status(400).json({ error: 'No file provided' });
                }
                // Validate image
                const validation = await (0, image_processor_js_1.validateImage)(file.buffer, file.mimetype);
                if (!validation.valid) {
                    return res.status(400).json({ error: validation.error });
                }
                // Generate unique filename
                const filename = (0, storage_js_1.generateUniqueFilename)(file.originalname);
                // Save original to VPS
                const { url: originalUrl } = await (0, storage_js_1.saveOriginal)(file.buffer, 'portfolio', null, filename, file.mimetype);
                // Process and generate thumbnails (upload to R2)
                const processResult = await (0, image_processor_js_1.processImage)(file.buffer, filename, 'portfolio', null);
                const thumbnailUrls = (0, image_processor_js_1.getThumbnailUrls)(processResult.thumbnails);
                const photoId = (0, uuid_1.v4)();
                await (0, db_js_1.insertPortfolioPhoto)({
                    id: photoId,
                    filename: file.originalname,
                    originalUrl: originalUrl,
                    thumbnailUrl: thumbnailUrls.medium || originalUrl,
                    thumbnailSmallUrl: thumbnailUrls.small,
                    thumbnailMediumUrl: thumbnailUrls.medium,
                    thumbnailLargeUrl: thumbnailUrls.large,
                });
                // Return result
                res.json({
                    success: true,
                    photo: {
                        id: photoId,
                        filename: file.originalname,
                        original_url: originalUrl,
                        thumbnail_url: thumbnailUrls.medium,
                        thumbnail_small_url: thumbnailUrls.small,
                        thumbnail_medium_url: thumbnailUrls.medium,
                        thumbnail_large_url: thumbnailUrls.large,
                        width: processResult.original.width,
                        height: processResult.original.height,
                        size: file.size,
                    },
                });
            }
            catch (error) {
                console.error('Portfolio upload error:', error);
                res.status(500).json({
                    error: error instanceof Error ? error.message : 'Upload failed',
                });
            }
        })();
    });
});
/**
 * POST /upload/portfolio/batch
 * Upload multiple photos to portfolio
 */
router.post('/portfolio/batch', (req, res) => {
    (0, upload_js_1.uploadMultiple)(req, res, (err) => {
        void (async () => {
            if (err) {
                const { status, message } = (0, upload_js_1.handleMulterError)(err);
                return res.status(status).json({ error: message });
            }
            try {
                const files = req.files;
                if (!files || files.length === 0) {
                    return res.status(400).json({ error: 'No files provided' });
                }
                const results = [];
                for (const file of files) {
                    try {
                        // Validate image
                        const validation = await (0, image_processor_js_1.validateImage)(file.buffer, file.mimetype);
                        if (!validation.valid) {
                            results.push({
                                filename: file.originalname,
                                success: false,
                                error: validation.error,
                            });
                            continue;
                        }
                        // Generate unique filename
                        const filename = (0, storage_js_1.generateUniqueFilename)(file.originalname);
                        // Save original to VPS
                        const { url: originalUrl } = await (0, storage_js_1.saveOriginal)(file.buffer, 'portfolio', null, filename, file.mimetype);
                        // Process and generate thumbnails
                        const processResult = await (0, image_processor_js_1.processImage)(file.buffer, filename, 'portfolio', null);
                        const thumbnailUrls = (0, image_processor_js_1.getThumbnailUrls)(processResult.thumbnails);
                        const photoId = (0, uuid_1.v4)();
                        await (0, db_js_1.insertPortfolioPhoto)({
                            id: photoId,
                            filename: file.originalname,
                            originalUrl: originalUrl,
                            thumbnailUrl: thumbnailUrls.medium || originalUrl,
                            thumbnailSmallUrl: thumbnailUrls.small,
                            thumbnailMediumUrl: thumbnailUrls.medium,
                            thumbnailLargeUrl: thumbnailUrls.large,
                        });
                        results.push({
                            filename: file.originalname,
                            success: true,
                            photo: {
                                id: photoId,
                                original_url: originalUrl,
                                thumbnail_url: thumbnailUrls.medium,
                                thumbnail_small_url: thumbnailUrls.small,
                                thumbnail_medium_url: thumbnailUrls.medium,
                                thumbnail_large_url: thumbnailUrls.large,
                                width: processResult.original.width,
                                height: processResult.original.height,
                                size: file.size,
                            },
                        });
                    }
                    catch (error) {
                        results.push({
                            filename: file.originalname,
                            success: false,
                            error: error instanceof Error ? error.message : 'Failed',
                        });
                    }
                }
                const successCount = results.filter((r) => r.success).length;
                const failCount = results.filter((r) => !r.success).length;
                res.json({
                    success: true,
                    message: `Uploaded ${successCount} photos${failCount > 0 ? `, ${failCount} failed` : ''}`,
                    results,
                    summary: {
                        total: files.length,
                        success: successCount,
                        failed: failCount,
                    },
                });
            }
            catch (error) {
                console.error('Batch upload error:', error);
                res.status(500).json({
                    error: error instanceof Error ? error.message : 'Upload failed',
                });
            }
        })();
    });
});
/**
 * POST /upload/event/:eventId
 * Upload photo to specific event
 */
router.post('/event/:eventId', (req, res) => {
    (0, upload_js_1.uploadSingle)(req, res, (err) => {
        void (async () => {
            if (err) {
                const { status, message } = (0, upload_js_1.handleMulterError)(err);
                return res.status(status).json({ error: message });
            }
            try {
                const { eventId } = req.params;
                const file = req.file;
                if (!file) {
                    return res.status(400).json({ error: 'No file provided' });
                }
                if (!eventId) {
                    return res.status(400).json({ error: 'Event ID required' });
                }
                // Validate image
                const validation = await (0, image_processor_js_1.validateImage)(file.buffer, file.mimetype);
                if (!validation.valid) {
                    return res.status(400).json({ error: validation.error });
                }
                // Generate unique filename
                const filename = (0, storage_js_1.generateUniqueFilename)(file.originalname);
                // Save original to VPS
                const { url: originalUrl } = await (0, storage_js_1.saveOriginal)(file.buffer, 'events', eventId, filename, file.mimetype);
                // Process and generate thumbnails
                const processResult = await (0, image_processor_js_1.processImage)(file.buffer, filename, 'events', eventId);
                const thumbnailUrls = (0, image_processor_js_1.getThumbnailUrls)(processResult.thumbnails);
                const photoId = (0, uuid_1.v4)();
                await (0, db_js_1.insertEventPhoto)({
                    id: photoId,
                    eventId: eventId,
                    filename: file.originalname,
                    originalUrl: originalUrl,
                    thumbnailUrl: thumbnailUrls.medium,
                    thumbnailSmallUrl: thumbnailUrls.small,
                    thumbnailMediumUrl: thumbnailUrls.medium,
                    thumbnailLargeUrl: thumbnailUrls.large,
                    width: processResult.original.width,
                    height: processResult.original.height,
                    size: file.size,
                    mimeType: file.mimetype,
                });
                res.json({
                    success: true,
                    photo: {
                        id: photoId,
                        event_id: eventId,
                        filename: file.originalname,
                        original_url: originalUrl,
                        thumbnail_url: thumbnailUrls.medium,
                        thumbnail_small_url: thumbnailUrls.small,
                        thumbnail_medium_url: thumbnailUrls.medium,
                        thumbnail_large_url: thumbnailUrls.large,
                        width: processResult.original.width,
                        height: processResult.original.height,
                        size: file.size,
                    },
                });
            }
            catch (error) {
                console.error('Event upload error:', error);
                res.status(500).json({
                    error: error instanceof Error ? error.message : 'Upload failed',
                });
            }
        })();
    });
});
/**
 * POST /upload/event/:eventId/batch
 * Upload multiple photos to event
 */
router.post('/event/:eventId/batch', (req, res) => {
    (0, upload_js_1.uploadMultiple)(req, res, (err) => {
        void (async () => {
            if (err) {
                const { status, message } = (0, upload_js_1.handleMulterError)(err);
                return res.status(status).json({ error: message });
            }
            try {
                const { eventId } = req.params;
                const files = req.files;
                if (!files || files.length === 0) {
                    return res.status(400).json({ error: 'No files provided' });
                }
                if (!eventId) {
                    return res.status(400).json({ error: 'Event ID required' });
                }
                const results = [];
                for (const file of files) {
                    try {
                        // Validate image
                        const validation = await (0, image_processor_js_1.validateImage)(file.buffer, file.mimetype);
                        if (!validation.valid) {
                            results.push({
                                filename: file.originalname,
                                success: false,
                                error: validation.error,
                            });
                            continue;
                        }
                        // Generate unique filename
                        const filename = (0, storage_js_1.generateUniqueFilename)(file.originalname);
                        // Save original to VPS
                        const { url: originalUrl } = await (0, storage_js_1.saveOriginal)(file.buffer, 'events', eventId, filename, file.mimetype);
                        // Process and generate thumbnails
                        const processResult = await (0, image_processor_js_1.processImage)(file.buffer, filename, 'events', eventId);
                        const thumbnailUrls = (0, image_processor_js_1.getThumbnailUrls)(processResult.thumbnails);
                        const photoId = (0, uuid_1.v4)();
                        await (0, db_js_1.insertEventPhoto)({
                            id: photoId,
                            eventId: eventId,
                            filename: file.originalname,
                            originalUrl: originalUrl,
                            thumbnailUrl: thumbnailUrls.medium,
                            thumbnailSmallUrl: thumbnailUrls.small,
                            thumbnailMediumUrl: thumbnailUrls.medium,
                            thumbnailLargeUrl: thumbnailUrls.large,
                            width: processResult.original.width,
                            height: processResult.original.height,
                            size: file.size,
                            mimeType: file.mimetype,
                        });
                        results.push({
                            filename: file.originalname,
                            success: true,
                            photo: {
                                id: photoId,
                                event_id: eventId,
                                original_url: originalUrl,
                                thumbnail_url: thumbnailUrls.medium,
                                thumbnail_small_url: thumbnailUrls.small,
                                thumbnail_medium_url: thumbnailUrls.medium,
                                thumbnail_large_url: thumbnailUrls.large,
                                width: processResult.original.width,
                                height: processResult.original.height,
                                size: file.size,
                            },
                        });
                    }
                    catch (error) {
                        results.push({
                            filename: file.originalname,
                            success: false,
                            error: error instanceof Error ? error.message : 'Failed',
                        });
                    }
                }
                const successCount = results.filter((r) => r.success).length;
                const failCount = results.filter((r) => !r.success).length;
                res.json({
                    success: true,
                    message: `Uploaded ${successCount} photos${failCount > 0 ? `, ${failCount} failed` : ''}`,
                    results,
                    summary: {
                        total: files.length,
                        success: successCount,
                        failed: failCount,
                    },
                });
            }
            catch (error) {
                console.error('Batch event upload error:', error);
                res.status(500).json({
                    error: error instanceof Error ? error.message : 'Upload failed',
                });
            }
        })();
    });
});
/**
 * POST /upload/slideshow
 * Upload photo for hero slideshow
 */
router.post('/slideshow', (req, res) => {
    (0, upload_js_1.uploadSingle)(req, res, (err) => {
        void (async () => {
            if (err) {
                const { status, message } = (0, upload_js_1.handleMulterError)(err);
                return res.status(status).json({ error: message });
            }
            try {
                const file = req.file;
                if (!file) {
                    return res.status(400).json({ error: 'No file provided' });
                }
                // Validate image
                const validation = await (0, image_processor_js_1.validateImage)(file.buffer, file.mimetype);
                if (!validation.valid) {
                    return res.status(400).json({ error: validation.error });
                }
                // Generate unique filename
                const filename = (0, storage_js_1.generateUniqueFilename)(file.originalname);
                // Save original to VPS
                const { url: originalUrl } = await (0, storage_js_1.saveOriginal)(file.buffer, 'slideshow', null, filename, file.mimetype);
                // Process and generate thumbnails
                const processResult = await (0, image_processor_js_1.processImage)(file.buffer, filename, 'slideshow', null);
                const thumbnailUrls = (0, image_processor_js_1.getThumbnailUrls)(processResult.thumbnails);
                const slideId = (0, uuid_1.v4)();
                await (0, db_js_1.insertHeroSlide)({
                    id: slideId,
                    imageUrl: originalUrl,
                    thumbnailUrl: thumbnailUrls.large,
                });
                res.json({
                    success: true,
                    photo: {
                        id: slideId,
                        filename: file.originalname,
                        original_url: originalUrl,
                        thumbnail_url: thumbnailUrls.large, // Slideshow uses large
                        width: processResult.original.width,
                        height: processResult.original.height,
                        size: file.size,
                    },
                });
            }
            catch (error) {
                console.error('Slideshow upload error:', error);
                res.status(500).json({
                    error: error instanceof Error ? error.message : 'Upload failed',
                });
            }
        })();
    });
});
exports.default = router;
//# sourceMappingURL=upload.js.map