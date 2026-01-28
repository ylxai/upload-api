import { v4 as uuidv4 } from 'uuid'
import { uploadToR2 } from './r2.js'

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = originalName.includes('.')
    ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase()
    : ''
  const baseName = originalName
    .replace(ext, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 50)
  const timestamp = Date.now()
  const uniqueId = uuidv4().substring(0, 8)

  return `${baseName}-${timestamp}-${uniqueId}${ext}`
}

/**
 * Build storage key for original files in R2
 */
export function buildOriginalKey(
  type: 'portfolio' | 'events' | 'slideshow',
  eventId: string | null,
  filename: string
): string {
  if (type === 'events' && eventId) {
    return `events/${eventId}/originals/${filename}`
  }

  return `${type}/originals/${filename}`
}

/**
 * Save original file to R2 storage
 */
export async function saveOriginal(
  buffer: Buffer,
  type: 'portfolio' | 'events' | 'slideshow',
  eventId: string | null,
  filename: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  const key = buildOriginalKey(type, eventId, filename)
  const { url } = await uploadToR2(buffer, key, contentType)

  return { url, key }
}
