import fs from 'fs/promises'
import path from 'path'
import { config } from '../config/index.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  const baseName = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 50)
  const timestamp = Date.now()
  const uniqueId = uuidv4().substring(0, 8)

  return `${baseName}-${timestamp}-${uniqueId}${ext}`
}

/**
 * Build storage path for original files on VPS
 */
export function buildStoragePath(
  type: 'portfolio' | 'events' | 'slideshow',
  eventId: string | null,
  filename: string
): string {
  if (type === 'events' && eventId) {
    return path.join(
      config.storagePath,
      'events',
      eventId,
      'originals',
      filename
    )
  }

  return path.join(config.storagePath, type, 'originals', filename)
}

/**
 * Build public URL for original files
 */
export function buildStorageUrl(
  type: 'portfolio' | 'events' | 'slideshow',
  eventId: string | null,
  filename: string
): string {
  if (type === 'events' && eventId) {
    return `${config.storageUrl}/events/${eventId}/originals/${filename}`
  }

  return `${config.storageUrl}/${type}/originals/${filename}`
}

/**
 * Save original file to VPS storage
 */
export async function saveOriginal(
  buffer: Buffer,
  type: 'portfolio' | 'events' | 'slideshow',
  eventId: string | null,
  filename: string
): Promise<{ path: string; url: string }> {
  const filePath = buildStoragePath(type, eventId, filename)
  const dirPath = path.dirname(filePath)

  // Ensure directory exists
  await ensureDir(dirPath)

  // Write file
  await fs.writeFile(filePath, buffer)

  // Build URL
  const url = buildStorageUrl(type, eventId, filename)

  return { path: filePath, url }
}

/**
 * Delete original file from VPS storage
 */
export async function deleteOriginal(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch (error) {
    console.error('Failed to delete file:', filePath, error)
  }
}

/**
 * Get file stats
 */
export async function getFileStats(filePath: string): Promise<{
  size: number
  created: Date
  modified: Date
} | null> {
  try {
    const stats = await fs.stat(filePath)
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    }
  } catch {
    return null
  }
}
