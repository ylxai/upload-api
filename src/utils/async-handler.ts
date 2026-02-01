/**
 * Async route handler utilities for Express
 * Eliminates the need for try-catch blocks and void IIFE patterns
 */

import { Request, Response, NextFunction, RequestHandler } from 'express'

/**
 * Type for async request handler function
 */
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>

/**
 * Wraps an async route handler to properly catch errors
 * and pass them to Express error handling middleware
 *
 * @param handler - Async route handler function
 * @returns Express RequestHandler that catches async errors
 *
 * @example
 * ```ts
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await fetchUsers()
 *   res.json(users)
 * }))
 * ```
 */
export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

/**
 * Type for multer callback handler
 */
type MulterCallbackHandler = (
  req: Request,
  res: Response,
  file?: Express.Multer.File,
  files?: Express.Multer.File[]
) => Promise<void | Response>

/**
 * Creates an async handler for multer upload callbacks
 * Handles the common pattern of processing files after multer upload
 *
 * @param uploadMiddleware - Multer upload middleware (single or array)
 * @param handler - Async handler to process the uploaded files
 * @returns Express RequestHandler
 *
 * @example
 * ```ts
 * router.post('/upload', withUpload(uploadSingle, async (req, res, file) => {
 *   if (!file) {
 *     return res.status(400).json({ error: 'No file provided' })
 *   }
 *   // Process file...
 *   res.json({ success: true })
 * }))
 * ```
 */
export function withUpload(
  uploadMiddleware: RequestHandler,
  handler: MulterCallbackHandler
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (err: unknown) => {
      if (err) {
        return next(err)
      }

      const file = req.file
      const files = req.files as Express.Multer.File[] | undefined

      Promise.resolve(handler(req, res, file, files)).catch(next)
    })
  }
}

/**
 * Combines multiple middleware into a single middleware chain
 *
 * @param middlewares - Array of middleware functions
 * @returns Combined middleware function
 *
 * @example
 * ```ts
 * const protectedUpload = combineMiddleware([
 *   authenticate,
 *   rateLimit,
 *   uploadSingle
 * ])
 * router.post('/upload', protectedUpload, handler)
 * ```
 */
export function combineMiddleware(
  middlewares: RequestHandler[]
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const runMiddleware = (index: number): void => {
      if (index >= middlewares.length) {
        return next()
      }

      const middleware = middlewares[index]
      middleware(req, res, (err?: unknown) => {
        if (err) {
          return next(err)
        }
        runMiddleware(index + 1)
      })
    }

    runMiddleware(0)
  }
}
