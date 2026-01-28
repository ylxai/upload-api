import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth.js'
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
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * POST /upload/portfolio
 * Upload single photo to portfolio
 */
router.post('/portfolio', (req: Request, res: Response, _next) => {
  uploadSingle(req, res, async (err: Error | null) => {
    if (err) {
      const { status, message } = handleMulterError(err)
      return res.status(status).json({ error: message })
    }

    try {
      const file = req.file
      if (!file) {
        return res.status(400).json({ error: 'No file provided' })
      }

      // Validate image
      const validation = await validateImage(file.buffer, file.mimetype)
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error })
      }

      // Generate unique filename
      const filename = generateUniqueFilename(file.originalname)

      // Save original to VPS
      const { url: originalUrl } = await saveOriginal(
        file.buffer,
        'portfolio',
        null,
        filename
      )

      // Process and generate thumbnails (upload to R2)
      const processResult = await processImage(
        file.buffer,
        filename,
        'portfolio',
        null
      )

      const thumbnailUrls = getThumbnailUrls(processResult.thumbnails)

      // Return result
      res.json({
        success: true,
        photo: {
          id: uuidv4(),
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
      })
    } catch (error) {
      console.error('Portfolio upload error:', error)
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Upload failed',
      })
    }
  })
})

/**
 * POST /upload/portfolio/batch
 * Upload multiple photos to portfolio
 */
router.post('/portfolio/batch', (req: Request, res: Response) => {
  uploadMultiple(req, res, async (err: Error | null) => {
    if (err) {
      const { status, message } = handleMulterError(err)
      return res.status(status).json({ error: message })
    }

    try {
      const files = req.files as Express.Multer.File[]
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' })
      }

      const results = []

      for (const file of files) {
        try {
          // Validate image
          const validation = await validateImage(file.buffer, file.mimetype)
          if (!validation.valid) {
            results.push({
              filename: file.originalname,
              success: false,
              error: validation.error,
            })
            continue
          }

          // Generate unique filename
          const filename = generateUniqueFilename(file.originalname)

          // Save original to VPS
          const { url: originalUrl } = await saveOriginal(
            file.buffer,
            'portfolio',
            null,
            filename
          )

          // Process and generate thumbnails
          const processResult = await processImage(
            file.buffer,
            filename,
            'portfolio',
            null
          )

          const thumbnailUrls = getThumbnailUrls(processResult.thumbnails)

          results.push({
            filename: file.originalname,
            success: true,
            photo: {
              id: uuidv4(),
              original_url: originalUrl,
              thumbnail_url: thumbnailUrls.medium,
              thumbnail_small_url: thumbnailUrls.small,
              thumbnail_medium_url: thumbnailUrls.medium,
              thumbnail_large_url: thumbnailUrls.large,
              width: processResult.original.width,
              height: processResult.original.height,
              size: file.size,
            },
          })
        } catch (error) {
          results.push({
            filename: file.originalname,
            success: false,
            error: error instanceof Error ? error.message : 'Failed',
          })
        }
      }

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
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Upload failed',
      })
    }
  })
})

/**
 * POST /upload/event/:eventId
 * Upload photo to specific event
 */
router.post('/event/:eventId', (req: Request, res: Response) => {
  uploadSingle(req, res, async (err: Error | null) => {
    if (err) {
      const { status, message } = handleMulterError(err)
      return res.status(status).json({ error: message })
    }

    try {
      const { eventId } = req.params
      const file = req.file

      if (!file) {
        return res.status(400).json({ error: 'No file provided' })
      }

      if (!eventId) {
        return res.status(400).json({ error: 'Event ID required' })
      }

      // Validate image
      const validation = await validateImage(file.buffer, file.mimetype)
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error })
      }

      // Generate unique filename
      const filename = generateUniqueFilename(file.originalname)

      // Save original to VPS
      const { url: originalUrl } = await saveOriginal(
        file.buffer,
        'events',
        eventId as string,
        filename
      )

      // Process and generate thumbnails
      const processResult = await processImage(
        file.buffer,
        filename,
        'events',
        eventId as string
      )

      const thumbnailUrls = getThumbnailUrls(processResult.thumbnails)

      res.json({
        success: true,
        photo: {
          id: uuidv4(),
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
      })
    } catch (error) {
      console.error('Event upload error:', error)
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Upload failed',
      })
    }
  })
})

/**
 * POST /upload/event/:eventId/batch
 * Upload multiple photos to event
 */
router.post('/event/:eventId/batch', (req: Request, res: Response) => {
  uploadMultiple(req, res, async (err: Error | null) => {
    if (err) {
      const { status, message } = handleMulterError(err)
      return res.status(status).json({ error: message })
    }

    try {
      const { eventId } = req.params
      const files = req.files as Express.Multer.File[]

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' })
      }

      if (!eventId) {
        return res.status(400).json({ error: 'Event ID required' })
      }

      const results = []

      for (const file of files) {
        try {
          // Validate image
          const validation = await validateImage(file.buffer, file.mimetype)
          if (!validation.valid) {
            results.push({
              filename: file.originalname,
              success: false,
              error: validation.error,
            })
            continue
          }

          // Generate unique filename
          const filename = generateUniqueFilename(file.originalname)

          // Save original to VPS
          const { url: originalUrl } = await saveOriginal(
            file.buffer,
            'events',
            eventId as string,
            filename
          )

          // Process and generate thumbnails
          const processResult = await processImage(
            file.buffer,
            filename,
            'events',
            eventId as string
          )

          const thumbnailUrls = getThumbnailUrls(processResult.thumbnails)

          results.push({
            filename: file.originalname,
            success: true,
            photo: {
              id: uuidv4(),
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
          })
        } catch (error) {
          results.push({
            filename: file.originalname,
            success: false,
            error: error instanceof Error ? error.message : 'Failed',
          })
        }
      }

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
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Upload failed',
      })
    }
  })
})

/**
 * POST /upload/slideshow
 * Upload photo for hero slideshow
 */
router.post('/slideshow', (req: Request, res: Response) => {
  uploadSingle(req, res, async (err: Error | null) => {
    if (err) {
      const { status, message } = handleMulterError(err)
      return res.status(status).json({ error: message })
    }

    try {
      const file = req.file
      if (!file) {
        return res.status(400).json({ error: 'No file provided' })
      }

      // Validate image
      const validation = await validateImage(file.buffer, file.mimetype)
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error })
      }

      // Generate unique filename
      const filename = generateUniqueFilename(file.originalname)

      // Save original to VPS
      const { url: originalUrl } = await saveOriginal(
        file.buffer,
        'slideshow',
        null,
        filename
      )

      // Process and generate thumbnails
      const processResult = await processImage(
        file.buffer,
        filename,
        'slideshow',
        null
      )

      const thumbnailUrls = getThumbnailUrls(processResult.thumbnails)

      res.json({
        success: true,
        photo: {
          id: uuidv4(),
          filename: file.originalname,
          original_url: originalUrl,
          thumbnail_url: thumbnailUrls.large, // Slideshow uses large
          width: processResult.original.width,
          height: processResult.original.height,
          size: file.size,
        },
      })
    } catch (error) {
      console.error('Slideshow upload error:', error)
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Upload failed',
      })
    }
  })
})

export default router
