import { Router, Request, Response } from 'express'
import fs from 'fs/promises'
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

  // Check storage directory
  try {
    await fs.access(config.storagePath)
    checks.storage = 'ok'
  } catch {
    checks.storage = 'error'
  }

  // Check R2 config
  if (config.r2.endpoint && config.r2.accessKey && config.r2.secretKey) {
    checks.r2 = 'configured'
  } else {
    checks.r2 = 'not configured'
  }

  const allOk = checks.storage === 'ok' && checks.r2 !== 'not configured'

  res.status(allOk ? 200 : 503).json(checks)
})

/**
 * GET /health/storage
 * Check storage space
 */
router.get('/storage', async (_req: Request, res: Response) => {
  try {
    const { execSync } = await import('child_process')
    const dfOutput = execSync(`df -h ${config.storagePath}`).toString()
    const lines = dfOutput.trim().split('\n')
    const data = lines[1]?.split(/\s+/) || []

    res.json({
      path: config.storagePath,
      size: data[1] || 'unknown',
      used: data[2] || 'unknown',
      available: data[3] || 'unknown',
      usePercent: data[4] || 'unknown',
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check storage',
    })
  }
})

export default router
