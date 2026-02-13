import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/auth.js'
import { config } from '../config/index.js'
import {
  uploadSingle,
  uploadMultiple,
  handleMulterError,
} from '../middleware/upload.js'
import {
  validateImage,
  processImage,
  getThumbnailUrls,
} from '../services/image-processor.js'
import { saveOriginal, generateUniqueFilename } from '../services/storage.js'
import {
  insertEventPhoto,
  insertHeroSlide,
  insertPortfolioPhoto,
} from '../services/db.js'
import { readFileBuffer, deleteFile } from '../services/file-io.js'
import { v4 as uuidv4 } from 'uuid'
import { runWithConcurrency } from '../utils/index.js'
import type {
  PhotoMetadata,
  EventPhotoMetadata,
  BatchUploadResult,
  UploadType,
} from '../types/index.js'

const router = Router()

// All routes require authentication
router.use(authenticate)

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Multer error handling middleware wrapper
 */
function handleUploadError(err: unknown, res: Response): boolean {
  if (err) {
    const { status, message } = handleMulterError(err)
    res.status(status).json({ error: message })
    return true
  }
  return false
}

/**
 * Process single file upload for portfolio/slideshow
 */
async function processSingleUpload(
  file: Express.Multer.File,
  type: UploadType,
  eventId: string | null = null
): Promise<{
  photoId: string
  filename: string
  originalUrl: string
  thumbnailUrls: ReturnType<typeof getThumbnailUrls>
  processResult: Awaited<ReturnType<typeof processImage>>
}> {
  const fileBuffer = await readFileBuffer(file.path)

  // Validate image
  const validation = await validateImage(fileBuffer, file.mimetype)
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image')
  }

  // Generate unique filename
  const filename = generateUniqueFilename(file.originalname)

  // Save original to R2
  const { url: originalUrl } = await saveOriginal(
    fileBuffer,
    type,
    eventId,
    filename,
    file.mimetype
  )

  // Process and generate thumbnails
  const processResult = await processImage(fileBuffer, filename, type, eventId)
  const thumbnailUrls = getThumbnailUrls(processResult.thumbnails)

  return {
    photoId: uuidv4(),
    filename,
    originalUrl,
    thumbnailUrls,
    processResult,
  }
}

/**
 * Build photo metadata response object
 */
function buildPhotoMetadata(
  photoId: string,
  file: Express.Multer.File,
  originalUrl: string,
  thumbnailUrls: ReturnType<typeof getThumbnailUrls>,
  processResult: Awaited<ReturnType<typeof processImage>>
): PhotoMetadata {
  return {
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
    mime_type: file.mimetype,
  }
}

/**
 * Get concurrency limit from config
 */
function getConcurrencyLimit(): number {
  return Math.max(1, Math.min(5, config.upload.concurrentLimit || 2))
}

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /upload/portfolio
 * Upload single photo to portfolio
 */
router.post('/portfolio', (req: Request, res: Response, next: NextFunction) => {
  uploadSingle(req, res, (err: unknown) => {
    if (handleUploadError(err, res)) return

    const file = req.file

    ;(async () => {
      if (!file) {
        return res.status(400).json({ error: 'No file provided' })
      }

      try {
        const { photoId, originalUrl, thumbnailUrls, processResult } =
          await processSingleUpload(file, 'portfolio')

        await insertPortfolioPhoto({
          id: photoId,
          filename: file.originalname,
          originalUrl: originalUrl,
          thumbnailUrl: thumbnailUrls.medium || originalUrl,
          thumbnailSmallUrl: thumbnailUrls.small,
          thumbnailMediumUrl: thumbnailUrls.medium,
          thumbnailLargeUrl: thumbnailUrls.large,
        })

        res.json({
          success: true,
          photo: buildPhotoMetadata(
            photoId,
            file,
            originalUrl,
            thumbnailUrls,
            processResult
          ),
        })
      } catch (error) {
        console.error('Portfolio upload error:', error)
        next(error)
      } finally {
        await deleteFile(file.path)
      }
    })()
  })
})

/**
 * POST /upload/portfolio/batch
 * Upload multiple photos to portfolio
 */
router.post('/portfolio/batch', (req: Request, res: Response, next: NextFunction) => {
  uploadMultiple(req, res, (err: unknown) => {
    if (handleUploadError(err, res)) return

    const files = req.files as Express.Multer.File[]

    ;(async () => {
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' })
      }

      try {
        const results: BatchUploadResult<PhotoMetadata>[] = []

        await runWithConcurrency(files, getConcurrencyLimit(), async (file) => {
          try {
            const { photoId, originalUrl, thumbnailUrls, processResult } =
              await processSingleUpload(file, 'portfolio')

            await insertPortfolioPhoto({
              id: photoId,
              filename: file.originalname,
              originalUrl: originalUrl,
              thumbnailUrl: thumbnailUrls.medium || originalUrl,
              thumbnailSmallUrl: thumbnailUrls.small,
              thumbnailMediumUrl: thumbnailUrls.medium,
              thumbnailLargeUrl: thumbnailUrls.large,
            })

            results.push({
              filename: file.originalname,
              success: true,
              photo: buildPhotoMetadata(
                photoId,
                file,
                originalUrl,
                thumbnailUrls,
                processResult
              ),
            })
          } catch (error) {
            results.push({
              filename: file.originalname,
              success: false,
              error: error instanceof Error ? error.message : 'Failed',
            })
          } finally {
            await deleteFile(file.path)
          }
        })

        const successCount = results.filter((r) => r.success).length
        const failCount = results.filter((r) => !r.success).length

        res.json({
          success: true,
          message: `Uploaded ${successCount} photos${failCount > 0 ? `, ${failCount} failed` : ''}`,
          results,
          summary: {
            total: files.length,
            success: successCount,
            failed: failCount,
          },
        })
      } catch (error) {
        console.error('Batch upload error:', error)
        next(error)
      }
    })()
  })
})

/**
 * POST /upload/event/:eventId
 * Upload photo to specific event
 */
router.post('/event/:eventId', (req: Request, res: Response, next: NextFunction) => {
  uploadSingle(req, res, (err: unknown) => {
    if (handleUploadError(err, res)) return

    const file = req.file
    const eventIdParam = req.params.eventId
    const eventId = Array.isArray(eventIdParam) ? eventIdParam[0] : eventIdParam

    ;(async () => {
      if (!file) {
        return res.status(400).json({ error: 'No file provided' })
      }

      if (!eventId) {
        return res.status(400).json({ error: 'Event ID required' })
      }

      try {
        const { photoId, originalUrl, thumbnailUrls, processResult } =
          await processSingleUpload(file, 'events', eventId)

        await insertEventPhoto({
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
        })

        const photo: EventPhotoMetadata = {
          ...buildPhotoMetadata(
            photoId,
            file,
            originalUrl,
            thumbnailUrls,
            processResult
          ),
          event_id: eventId,
        }

        res.json({ success: true, photo })
      } catch (error) {
        console.error('Event upload error:', error)
        next(error)
      } finally {
        await deleteFile(file.path)
      }
    })()
  })
})

/**
 * POST /upload/event/:eventId/batch
 * Upload multiple photos to event
 */
router.post('/event/:eventId/batch', (req: Request, res: Response, next: NextFunction) => {
  uploadMultiple(req, res, (err: unknown) => {
    if (handleUploadError(err, res)) return

    const files = req.files as Express.Multer.File[]
    const eventIdParam = req.params.eventId
    const eventId = Array.isArray(eventIdParam) ? eventIdParam[0] : eventIdParam

    ;(async () => {
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' })
      }

      if (!eventId) {
        return res.status(400).json({ error: 'Event ID required' })
      }

      try {
        const results: BatchUploadResult<EventPhotoMetadata>[] = []

        await runWithConcurrency(files, getConcurrencyLimit(), async (file) => {
          try {
            const { photoId, originalUrl, thumbnailUrls, processResult } =
              await processSingleUpload(file, 'events', eventId)

            await insertEventPhoto({
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
            })

            const photo: EventPhotoMetadata = {
              ...buildPhotoMetadata(
                photoId,
                file,
                originalUrl,
                thumbnailUrls,
                processResult
              ),
              event_id: eventId,
            }

            results.push({
              filename: file.originalname,
              success: true,
              photo,
            })
          } catch (error) {
            results.push({
              filename: file.originalname,
              success: false,
              error: error instanceof Error ? error.message : 'Failed',
            })
          } finally {
            await deleteFile(file.path)
          }
        })

        const successCount = results.filter((r) => r.success).length
        const failCount = results.filter((r) => !r.success).length

        res.json({
          success: true,
          message: `Uploaded ${successCount} photos${failCount > 0 ? `, ${failCount} failed` : ''}`,
          results,
          summary: {
            total: files.length,
            success: successCount,
            failed: failCount,
          },
        })
      } catch (error) {
        console.error('Batch event upload error:', error)
        next(error)
      }
    })()
  })
})

/**
 * POST /upload/slideshow
 * Upload photo for hero slideshow
 */
router.post('/slideshow', (req: Request, res: Response, next: NextFunction) => {
  uploadSingle(req, res, (err: unknown) => {
    if (handleUploadError(err, res)) return

    const file = req.file

    ;(async () => {
      if (!file) {
        return res.status(400).json({ error: 'No file provided' })
      }

      try {
        const { photoId, originalUrl, thumbnailUrls, processResult } =
          await processSingleUpload(file, 'slideshow')

        await insertHeroSlide({
          id: photoId,
          imageUrl: originalUrl,
          thumbnailUrl: thumbnailUrls.large,
        })

        res.json({
          success: true,
          photo: {
            id: photoId,
            filename: file.originalname,
            original_url: originalUrl,
            thumbnail_url: thumbnailUrls.large,
            width: processResult.original.width,
            height: processResult.original.height,
            size: file.size,
            mime_type: file.mimetype,
          },
        })
      } catch (error) {
        console.error('Slideshow upload error:', error)
        next(error)
      } finally {
        await deleteFile(file.path)
      }
    })()
  })
})

export default router
