import sharp from 'sharp'
import { config } from '../config/index.js'
import { uploadToR2, buildThumbnailKey } from './r2.js'

interface ThumbnailResult {
  size: 'small' | 'medium' | 'large'
  format: 'jpeg' | 'webp'
  url: string
  key: string
  width: number
  height: number
}

interface ProcessResult {
  original: {
    width: number
    height: number
    format: string
  }
  thumbnails: ThumbnailResult[]
}

/**
 * Extract image metadata
 */
export async function extractMetadata(buffer: Buffer): Promise<{
  width: number
  height: number
  format: string
}> {
  const metadata = await sharp(buffer).metadata()
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
  }
}

/**
 * Validate image buffer (magic bytes)
 */
export async function validateImage(
  buffer: Buffer,
  _mimeType: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { fileTypeFromBuffer } = await import('file-type')
    const detected = await fileTypeFromBuffer(buffer)

    if (!detected) {
      return { valid: false, error: 'Could not detect file type' }
    }

    const allowedMimes = config.upload.allowedMimeTypes
    if (!allowedMimes.includes(detected.mime)) {
      return { valid: false, error: `Invalid file type: ${detected.mime}` }
    }

    // Basic sharp validation
    await sharp(buffer).metadata()

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid image',
    }
  }
}

/**
 * Generate single thumbnail
 */
async function generateThumbnail(
  buffer: Buffer,
  maxSize: number,
  format: 'jpeg' | 'webp'
): Promise<{ buffer: Buffer; width: number; height: number }> {
  let pipeline = sharp(buffer)
    .rotate() // Auto-rotate based on EXIF
    .resize(maxSize, maxSize, {
      fit: 'inside',
      withoutEnlargement: true,
    })

  if (format === 'webp') {
    pipeline = pipeline.webp({ quality: 85 })
  } else {
    pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true })
  }

  const outputBuffer = await pipeline.toBuffer()
  const metadata = await sharp(outputBuffer).metadata()

  return {
    buffer: outputBuffer,
    width: metadata.width || 0,
    height: metadata.height || 0,
  }
}

/**
 * Process image and generate all thumbnails
 */
export async function processImage(
  buffer: Buffer,
  filename: string,
  type: 'portfolio' | 'events' | 'slideshow',
  eventId: string | null = null
): Promise<ProcessResult> {
  // Extract original metadata
  const originalMeta = await extractMetadata(buffer)

  const thumbnails: ThumbnailResult[] = []
  const sizes: Array<'small' | 'medium' | 'large'> = [
    'small',
    'medium',
    'large',
  ]
  const formats: Array<'jpeg' | 'webp'> = ['jpeg', 'webp']

  // Generate thumbnails for each size and format
  for (const size of sizes) {
    const maxDimension = config.thumbnails[size].width

    for (const format of formats) {
      try {
        const {
          buffer: thumbBuffer,
          width,
          height,
        } = await generateThumbnail(buffer, maxDimension, format)

        const key = buildThumbnailKey(type, eventId, filename, size, format)
        const contentType = format === 'webp' ? 'image/webp' : 'image/jpeg'

        const { url } = await uploadToR2(thumbBuffer, key, contentType)

        thumbnails.push({
          size,
          format,
          url,
          key,
          width,
          height,
        })
      } catch (error) {
        console.error(`Failed to generate ${size} ${format} thumbnail:`, error)
      }
    }
  }

  return {
    original: originalMeta,
    thumbnails,
  }
}

/**
 * Get best thumbnail URL for each size (prefer WebP)
 */
export function getThumbnailUrls(thumbnails: ThumbnailResult[]): {
  small: string | null
  medium: string | null
  large: string | null
} {
  const getUrl = (size: 'small' | 'medium' | 'large'): string | null => {
    const webp = thumbnails.find((t) => t.size === size && t.format === 'webp')
    if (webp) return webp.url

    const jpeg = thumbnails.find((t) => t.size === size && t.format === 'jpeg')
    return jpeg?.url || null
  }

  return {
    small: getUrl('small'),
    medium: getUrl('medium'),
    large: getUrl('large'),
  }
}
