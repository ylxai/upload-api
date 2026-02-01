import { Pool } from 'pg'
import { config } from '../config/index.js'

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
})

export async function query<T>(text: string, params: any[] = []): Promise<T[]> {
  const result = await pool.query(text, params)
  return result.rows as T[]
}

export async function insertPortfolioPhoto(input: {
  id: string
  filename: string
  originalUrl: string
  thumbnailUrl: string
  thumbnailSmallUrl: string | null
  thumbnailMediumUrl: string | null
  thumbnailLargeUrl: string | null
}): Promise<void> {
  await query(
    `INSERT INTO portfolio_photos (
      id, filename, original_url, thumbnail_url,
      thumbnail_small_url, thumbnail_medium_url, thumbnail_large_url,
      created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,now(),now()
    )`,
    [
      input.id,
      input.filename,
      input.originalUrl,
      input.thumbnailUrl,
      input.thumbnailSmallUrl,
      input.thumbnailMediumUrl,
      input.thumbnailLargeUrl,
    ]
  )
}

export async function insertEventPhoto(input: {
  id: string
  eventId: string
  filename: string
  originalUrl: string
  thumbnailUrl: string | null
  thumbnailSmallUrl: string | null
  thumbnailMediumUrl: string | null
  thumbnailLargeUrl: string | null
  width: number
  height: number
  size: number
  mimeType: string
}): Promise<void> {
  await query(
    `INSERT INTO photos (
      id, event_id, filename, original_url,
      thumbnail_url, thumbnail_small_url, thumbnail_medium_url, thumbnail_large_url,
      width, height, file_size, mime_type, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),now()
    )`,
    [
      input.id,
      input.eventId,
      input.filename,
      input.originalUrl,
      input.thumbnailUrl,
      input.thumbnailSmallUrl,
      input.thumbnailMediumUrl,
      input.thumbnailLargeUrl,
      input.width,
      input.height,
      input.size,
      input.mimeType,
    ]
  )
}

export async function insertHeroSlide(input: {
  id: string
  imageUrl: string
  thumbnailUrl: string | null
}): Promise<void> {
  await query(
    `INSERT INTO hero_slideshow (
      id, image_url, thumbnail_url, created_at, updated_at
    ) VALUES ($1,$2,$3,now(),now())`,
    [input.id, input.imageUrl, input.thumbnailUrl]
  )
}

export async function closeDb(): Promise<void> {
  await pool.end()
}
