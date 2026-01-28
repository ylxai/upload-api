import { Router, Request, Response } from 'express'
import { config } from '../config/index.js'

const router = Router()

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (_req: Request, res: Response) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    storage: 'unknown',
    r2: 'unknown',
  }

  // R2 storage is used for originals + thumbnails
  checks.storage = config.r2.publicUrl ? 'r2' : 'not configured'

  // Check R2 config
  if (config.r2.endpoint && config.r2.accessKey && config.r2.secretKey) {
    checks.r2 = 'configured'
  } else {
    checks.r2 = 'not configured'
  }

  const allOk = checks.storage === 'r2' && checks.r2 !== 'not configured'

  res.status(allOk ? 200 : 503).json(checks)
})

/**
 * GET /health/storage
 * Check storage space
 */
router.get('/storage', async (_req: Request, res: Response) => {
  res.json({
    storage: 'r2',
    bucket: config.r2.bucket,
    publicUrl: config.r2.publicUrl,
  })
})

export default router
