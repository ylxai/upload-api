/**
 * Shared TypeScript interfaces for upload operations
 */

/**
 * Photo metadata after processing
 */
export interface PhotoMetadata {
  id: string
  filename: string
  original_url: string
  thumbnail_url: string | null
  thumbnail_small_url: string | null
  thumbnail_medium_url: string | null
  thumbnail_large_url: string | null
  width: number
  height: number
  size: number
  mime_type: string
}

/**
 * Event photo extends base photo with event-specific fields
 */
export interface EventPhotoMetadata extends PhotoMetadata {
  event_id: string
}

/**
 * Portfolio photo response
 */
export interface PortfolioPhotoResponse {
  success: true
  photo: PhotoMetadata
}

/**
 * Event photo response
 */
export interface EventPhotoResponse {
  success: true
  photo: EventPhotoMetadata
}

/**
 * Slideshow photo response (simplified)
 */
export interface SlideshowPhotoResponse {
  success: true
  photo: Pick<PhotoMetadata, 'id' | 'filename' | 'original_url' | 'thumbnail_url' | 'width' | 'height' | 'size'>
}

/**
 * Result for individual file in batch upload
 */
export interface BatchUploadResult<T = PhotoMetadata> {
  filename: string
  success: boolean
  error?: string
  photo?: T
}

/**
 * Batch upload summary
 */
export interface BatchUploadSummary {
  total: number
  success: number
  failed: number
}

/**
 * Batch upload response
 */
export interface BatchUploadResponse<T = PhotoMetadata> {
  success: true
  message: string
  results: BatchUploadResult<T>[]
  summary: BatchUploadSummary
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string
  message?: string
}

/**
 * Thumbnail URLs object
 */
export interface ThumbnailUrls {
  small: string | null
  medium: string | null
  large: string | null
}

/**
 * Upload type categories
 */
export type UploadType = 'portfolio' | 'events' | 'slideshow'

/**
 * Database insert input for portfolio photos
 */
export interface PortfolioPhotoInput {
  id: string
  filename: string
  originalUrl: string
  thumbnailUrl: string
  thumbnailSmallUrl: string | null
  thumbnailMediumUrl: string | null
  thumbnailLargeUrl: string | null
}

/**
 * Database insert input for event photos
 */
export interface EventPhotoInput {
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
}

/**
 * Database insert input for hero slideshow
 */
export interface HeroSlideInput {
  id: string
  imageUrl: string
  thumbnailUrl: string | null
}
