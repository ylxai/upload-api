import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { config } from '../config/index.js'

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: config.r2.endpoint,
  credentials: {
    accessKeyId: config.r2.accessKey,
    secretAccessKey: config.r2.secretKey,
  },
})

/**
 * Upload file to R2
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )

  const url = `${config.r2.publicUrl}/${key}`
  return { url, key }
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: config.r2.bucket,
      Key: key,
    })
  )
}

/**
 * Build storage key for thumbnails
 */
export function buildThumbnailKey(
  type: 'portfolio' | 'events' | 'slideshow',
  eventId: string | null,
  filename: string,
  size: 'small' | 'medium' | 'large',
  format: 'jpeg' | 'webp'
): string {
  const baseName = filename.replace(/\.[^.]+$/, '')
  const ext = format === 'webp' ? 'webp' : 'jpg'

  if (type === 'events' && eventId) {
    return `events/${eventId}/thumbnails/${baseName}-${size}.${ext}`
  }

  return `${type}/thumbnails/${baseName}-${size}.${ext}`
}
