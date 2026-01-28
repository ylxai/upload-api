import { Router, Request, Response } from 'express'
import { config } from '../config/index.js'

const router = Router()

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
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
