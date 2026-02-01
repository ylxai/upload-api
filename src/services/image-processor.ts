import sharp from 'sharp'
import { config } from '../config/index.js'
import { uploadToR2, buildThumbnailKey } from './r2.js'

// =============================================================================
// Sharp Memory Optimization Configuration
// =============================================================================

// Configure Sharp for better memory management
// Limit concurrent operations to prevent memory spikes
sharp.concurrency(2)

// Cache settings - reduce memory usage for large files
sharp.cache({ memory: 256, files: 20, items: 100 })

// Threshold for considering a file as "large" (10MB)
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024

// =============================================================================
// Types
// =============================================================================

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

interface ThumbnailConfig {
  size: 'small' | 'medium' | 'large'
  maxDimension: number
  format: 'jpeg' | 'webp'
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create optimized Sharp instance based on file size
 * Uses sequential read for large files to reduce memory usage
 */
function createSharpInstance(buffer: Buffer): sharp.Sharp {
  const isLargeFile = buffer.length > LARGE_FILE_THRESHOLD

  return sharp(buffer, {
    // For large files, use sequential read to reduce memory
    sequentialRead: isLargeFile,
    // Limit input pixels for security (100 megapixels max)
    limitInputPixels: 100 * 1024 * 1024,
    // Don't fail on truncated files
    failOn: 'error',
  })
}

/**
 * Extract image metadata with optimized Sharp instance
 */
export async function extractMetadata(buffer: Buffer): Promise<{
  width: number
  height: number
  format: string
}> {
  const metadata = await createSharpInstance(buffer).metadata()
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

    // Basic sharp validation with optimized instance
    await createSharpInstance(buffer).metadata()

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid image',
    }
  }
}

/**
 * Generate single thumbnail with memory optimization
 * Uses clone() to share input buffer across operations
 */
async function generateThumbnailOptimized(
  sharpInstance: sharp.Sharp,
  maxSize: number,
  format: 'jpeg' | 'webp'
): Promise<{ buffer: Buffer; width: number; height: number }> {
  // Clone the sharp instance to reuse decoded image data
  let pipeline = sharpInstance
    .clone()
    .rotate() // Auto-rotate based on EXIF
    .resize(maxSize, maxSize, {
      fit: 'inside',
      withoutEnlargement: true,
      // Use faster resize kernel for thumbnails
      kernel: 'lanczos3',
    })

  if (format === 'webp') {
    pipeline = pipeline.webp({
      quality: 85,
      // Use smart subsample for better compression
      smartSubsample: true,
      // Reduce memory during encoding
      effort: 4,
    })
  } else {
    pipeline = pipeline.jpeg({
      quality: 85,
      mozjpeg: true,
      // Progressive JPEG for better perceived loading
      progressive: true,
    })
  }

  // Get buffer with metadata in single operation
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })

  return {
    buffer: data,
    width: info.width,
    height: info.height,
  }
}

/**
 * Process image and generate all thumbnails with optimized memory usage
 * 
 * Optimizations:
 * 1. Single Sharp instance cloned for all thumbnails (shares decoded data)
 * 2. Sequential processing to limit memory peaks
 * 3. Immediate upload and release of thumbnail buffers
 * 4. Configurable concurrency via sharp.concurrency()
 */
export async function processImage(
  buffer: Buffer,
  filename: string,
  type: 'portfolio' | 'events' | 'slideshow',
  eventId: string | null = null
): Promise<ProcessResult> {
  // Create single optimized Sharp instance
  const sharpInstance = createSharpInstance(buffer)

  // Extract original metadata first
  const metadata = await sharpInstance.metadata()
  const originalMeta = {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
  }

  const thumbnails: ThumbnailResult[] = []

  // Define all thumbnail configurations
  const thumbnailConfigs: ThumbnailConfig[] = [
    { size: 'small', maxDimension: config.thumbnails.small.width, format: 'webp' },
    { size: 'small', maxDimension: config.thumbnails.small.width, format: 'jpeg' },
    { size: 'medium', maxDimension: config.thumbnails.medium.width, format: 'webp' },
    { size: 'medium', maxDimension: config.thumbnails.medium.width, format: 'jpeg' },
    { size: 'large', maxDimension: config.thumbnails.large.width, format: 'webp' },
    { size: 'large', maxDimension: config.thumbnails.large.width, format: 'jpeg' },
  ]

  // Process thumbnails sequentially to limit memory usage
  // For very high throughput, this can be changed to batch processing
  for (const thumbConfig of thumbnailConfigs) {
    try {
      const { buffer: thumbBuffer, width, height } = await generateThumbnailOptimized(
        sharpInstance,
        thumbConfig.maxDimension,
        thumbConfig.format
      )

      const key = buildThumbnailKey(type, eventId, filename, thumbConfig.size, thumbConfig.format)
      const contentType = thumbConfig.format === 'webp' ? 'image/webp' : 'image/jpeg'

      // Upload immediately to release buffer memory
      const { url } = await uploadToR2(thumbBuffer, key, contentType)

      thumbnails.push({
        size: thumbConfig.size,
        format: thumbConfig.format,
        url,
        key,
        width,
        height,
      })

      // Hint to GC that this buffer can be collected
      // (thumbBuffer goes out of scope here)
    } catch (error) {
      console.error(
        `Failed to generate ${thumbConfig.size} ${thumbConfig.format} thumbnail:`,
        error
      )
    }
  }

  return {
    original: originalMeta,
    thumbnails,
  }
}

/**
 * Process image with parallel thumbnail generation
 * Use this for better throughput when memory is not a concern
 * 
 * @param buffer - Image buffer
 * @param filename - Original filename
 * @param type - Upload type
 * @param eventId - Optional event ID
 * @param concurrency - Max parallel thumbnail operations (default: 2)
 */
export async function processImageParallel(
  buffer: Buffer,
  filename: string,
  type: 'portfolio' | 'events' | 'slideshow',
  eventId: string | null = null,
  concurrency: number = 2
): Promise<ProcessResult> {
  const sharpInstance = createSharpInstance(buffer)

  const metadata = await sharpInstance.metadata()
  const originalMeta = {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
  }

  const thumbnailConfigs: ThumbnailConfig[] = [
    { size: 'small', maxDimension: config.thumbnails.small.width, format: 'webp' },
    { size: 'small', maxDimension: config.thumbnails.small.width, format: 'jpeg' },
    { size: 'medium', maxDimension: config.thumbnails.medium.width, format: 'webp' },
    { size: 'medium', maxDimension: config.thumbnails.medium.width, format: 'jpeg' },
    { size: 'large', maxDimension: config.thumbnails.large.width, format: 'webp' },
    { size: 'large', maxDimension: config.thumbnails.large.width, format: 'jpeg' },
  ]

  // Process in batches for controlled parallelism
  const thumbnails: ThumbnailResult[] = []
  
  for (let i = 0; i < thumbnailConfigs.length; i += concurrency) {
    const batch = thumbnailConfigs.slice(i, i + concurrency)
    
    const batchResults = await Promise.allSettled(
      batch.map(async (thumbConfig) => {
        const { buffer: thumbBuffer, width, height } = await generateThumbnailOptimized(
          sharpInstance,
          thumbConfig.maxDimension,
          thumbConfig.format
        )

        const key = buildThumbnailKey(type, eventId, filename, thumbConfig.size, thumbConfig.format)
        const contentType = thumbConfig.format === 'webp' ? 'image/webp' : 'image/jpeg'
        const { url } = await uploadToR2(thumbBuffer, key, contentType)

        return {
          size: thumbConfig.size,
          format: thumbConfig.format,
          url,
          key,
          width,
          height,
        } as ThumbnailResult
      })
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        thumbnails.push(result.value)
      } else {
        console.error('Failed to generate thumbnail:', result.reason)
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

/**
 * Get Sharp memory statistics (useful for monitoring)
 */
export function getSharpStats(): {
  cache: {
    memory: { current: number; high: number; max: number }
    files: { current: number; max: number }
    items: { current: number; max: number }
  }
  concurrency: number
  counters: ReturnType<typeof sharp.counters>
} {
  const cacheStats = sharp.cache()
  return {
    cache: {
      memory: cacheStats.memory,
      files: cacheStats.files,
      items: cacheStats.items,
    },
    concurrency: sharp.concurrency(),
    counters: sharp.counters(),
  }
}

/**
 * Clear Sharp cache (call during memory pressure)
 */
export function clearSharpCache(): void {
  sharp.cache(false)
  sharp.cache({ memory: 256, files: 20, items: 100 })
}
