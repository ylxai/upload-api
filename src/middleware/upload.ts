import multer from 'multer'
import { Request } from 'express'
import { config } from '../config/index.js'

/**
 * File filter - validate mime type
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}`))
  }
}

/**
 * Multer configuration - memory storage (buffer)
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles,
  },
  fileFilter,
})

/**
 * Single file upload middleware
 */
export const uploadSingle = upload.single('file')

/**
 * Multiple files upload middleware
 */
export const uploadMultiple = upload.array('files', config.upload.maxFiles)

/**
 * Error handler for multer errors
 */
export function handleMulterError(error: Error): {
  status: number
  message: string
} {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return {
          status: 413,
          message: `File too large. Maximum size: ${config.upload.maxFileSize / 1024 / 1024}MB`,
        }
      case 'LIMIT_FILE_COUNT':
        return {
          status: 400,
          message: `Too many files. Maximum: ${config.upload.maxFiles}`,
        }
      case 'LIMIT_UNEXPECTED_FILE':
        return {
          status: 400,
          message: 'Unexpected file field',
        }
      default:
        return {
          status: 400,
          message: error.message,
        }
    }
  }

  return {
    status: 400,
    message: error.message || 'Upload failed',
  }
}
