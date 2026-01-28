import { Request, Response, NextFunction } from 'express'
import { config } from '../config/index.js'

/**
 * API Key authentication middleware
 */
export function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'] as string

  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key' })
    return
  }

  if (apiKey !== config.apiKey) {
    res.status(403).json({ error: 'Invalid API key' })
    return
  }

  next()
}

/**
 * Optional: Bearer token auth (for future JWT support)
 */
export function bearerAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return
  }

  const token = authHeader.substring(7)

  // For now, just check against API key
  // Later can implement JWT verification
  if (token !== config.apiKey) {
    res.status(403).json({ error: 'Invalid token' })
    return
  }

  next()
}

/**
 * Combined auth - accepts either API key or Bearer token
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'] as string
  const authHeader = req.headers.authorization

  // Check API key first
  if (apiKey && apiKey === config.apiKey) {
    next()
    return
  }

  // Check Bearer token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    if (token === config.apiKey) {
      next()
      return
    }
  }

  res.status(401).json({ error: 'Unauthorized' })
}
