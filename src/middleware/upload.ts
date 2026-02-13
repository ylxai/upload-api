import multer from 'multer'
import { Request } from 'express'
import os from 'os'
import path from 'path'
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
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, os.tmpdir())
    },
    filename: (_req, file, cb) => {
      const timestamp = Date.now()
      const random = Math.random().toString(36).slice(2, 8)
      const ext = path.extname(file.originalname)
      cb(null, `upload-${timestamp}-${random}${ext}`)
    },
  }),
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
export function handleMulterError(error: unknown): {
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

  if (error instanceof Error) {
    return {
      status: 400,
      message: error.message || 'Upload failed',
    }
  }

  return {
    status: 400,
    message: 'Upload failed',
  }
}
