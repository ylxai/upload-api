import { Router, Request, Response } from 'express'
import { config } from '../config/index.js'
import { getSharpStats } from '../services/image-processor.js'

const router = Router()

// =============================================================================
// Cache Control Constants
// =============================================================================

// Health check cache: short TTL for load balancers (10 seconds)
const HEALTH_CACHE_MAX_AGE = 10

// Storage info cache: longer TTL since it rarely changes (5 minutes)
const STORAGE_CACHE_MAX_AGE = 300

// Stats cache: moderate TTL for monitoring dashboards (30 seconds)
const STATS_CACHE_MAX_AGE = 30

// =============================================================================
// Cache Header Helpers
// =============================================================================

/**
 * Set cache headers for responses
 * @param res - Express response object
 * @param maxAge - Cache max-age in seconds
 * @param isPrivate - Whether cache should be private (default: false)
 */
function setCacheHeaders(
  res: Response,
  maxAge: number,
  isPrivate: boolean = false
): void {
  const cacheControl = isPrivate
    ? `private, max-age=${maxAge}`
    : `public, max-age=${maxAge}, s-maxage=${maxAge}`

  res.set({
    'Cache-Control': cacheControl,
    // Stale-while-revalidate: serve stale content while fetching fresh
    'CDN-Cache-Control': `max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
    // Cloudflare specific
    'Cloudflare-CDN-Cache-Control': `max-age=${maxAge}`,
    // ETag for conditional requests
    'Vary': 'Accept-Encoding',
  })
}

/**
 * Set no-cache headers for dynamic responses
 */
function setNoCacheHeaders(res: Response): void {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  })
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /health
 * Health check endpoint for load balancers and monitoring
 * 
 * Cache: 10 seconds - allows load balancers to cache while still detecting issues quickly
 */
router.get('/', async (_req: Request, res: Response) => {
  const checks = {
    status: 'ok' as 'ok' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    uptimeHuman: formatUptime(process.uptime()),
    version: '1.0.0',
    storage: 'unknown' as string,
    r2: 'unknown' as string,
  }

  // R2 storage is used for originals + thumbnails
  checks.storage = config.r2.publicUrl ? 'r2' : 'not configured'

  // Check R2 config
  if (config.r2.endpoint && config.r2.accessKey && config.r2.secretKey) {
    checks.r2 = 'configured'
  } else {
    checks.r2 = 'not configured'
    checks.status = 'degraded'
  }

  const allOk = checks.storage === 'r2' && checks.r2 === 'configured'
  const statusCode = allOk ? 200 : 503

  // Set appropriate cache headers based on status
  if (allOk) {
    setCacheHeaders(res, HEALTH_CACHE_MAX_AGE)
  } else {
    // Don't cache unhealthy responses
    setNoCacheHeaders(res)
  }

  res.status(statusCode).json(checks)
})

/**
 * GET /health/live
 * Kubernetes liveness probe - minimal check
 * 
 * Cache: No cache - must always be fresh for orchestrators
 */
router.get('/live', (_req: Request, res: Response) => {
  setNoCacheHeaders(res)
  res.status(200).json({ status: 'alive', timestamp: Date.now() })
})

/**
 * GET /health/ready
 * Kubernetes readiness probe - checks if ready to serve traffic
 * 
 * Cache: No cache - must always be fresh for orchestrators
 */
router.get('/ready', (_req: Request, res: Response) => {
  const isReady =
    config.r2.endpoint &&
    config.r2.accessKey &&
    config.r2.secretKey &&
    config.apiKey

  setNoCacheHeaders(res)

  if (isReady) {
    res.status(200).json({ status: 'ready', timestamp: Date.now() })
  } else {
    res.status(503).json({ status: 'not ready', timestamp: Date.now() })
  }
})

/**
 * GET /health/storage
 * Storage configuration info
 * 
 * Cache: 5 minutes - storage config rarely changes
 */
router.get('/storage', async (_req: Request, res: Response) => {
  setCacheHeaders(res, STORAGE_CACHE_MAX_AGE)

  res.json({
    storage: 'r2',
    bucket: config.r2.bucket,
    publicUrl: config.r2.publicUrl,
    limits: {
      maxFileSize: `${config.upload.maxFileSize / 1024 / 1024}MB`,
      maxFiles: config.upload.maxFiles,
      concurrentLimit: config.upload.concurrentLimit,
      allowedTypes: config.upload.allowedMimeTypes,
    },
    thumbnails: {
      small: `${config.thumbnails.small.width}x${config.thumbnails.small.height}`,
      medium: `${config.thumbnails.medium.width}x${config.thumbnails.medium.height}`,
      large: `${config.thumbnails.large.width}x${config.thumbnails.large.height}`,
    },
  })
})

/**
 * GET /health/stats
 * Runtime statistics including Sharp memory usage
 * 
 * Cache: 30 seconds - useful for monitoring dashboards
 */
router.get('/stats', (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage()
  const sharpStats = getSharpStats()

  setCacheHeaders(res, STATS_CACHE_MAX_AGE, true) // Private cache for stats

  res.json({
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      heapUsed: formatBytes(memoryUsage.heapUsed),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      external: formatBytes(memoryUsage.external),
      rss: formatBytes(memoryUsage.rss),
      arrayBuffers: formatBytes(memoryUsage.arrayBuffers),
    },
    memoryRaw: {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
    },
    sharp: {
      concurrency: sharpStats.concurrency,
      cache: {
        memory: {
          current: formatBytes(sharpStats.cache.memory.current),
          high: formatBytes(sharpStats.cache.memory.high),
          max: formatBytes(sharpStats.cache.memory.max),
        },
        files: sharpStats.cache.files,
        items: sharpStats.cache.items,
      },
      counters: sharpStats.counters,
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  })
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format uptime to human readable string
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

export default router
