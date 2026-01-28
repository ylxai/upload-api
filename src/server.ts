import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config, validateConfig } from './config/index.js'
import uploadRoutes from './routes/upload.js'
import healthRoutes from './routes/health.js'

// Validate configuration
validateConfig()

const app = express()

// Security middleware
app.use(helmet())

// CORS - allow requests from Vercel frontend
app.use(
  cors({
    origin: [
      'https://hafiportrait.photography',
      'https://www.hafiportrait.photography',
      /\.vercel\.app$/,
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  })
)

// Parse JSON (for non-file requests)
app.use(express.json())

// Routes
app.use('/health', healthRoutes)
app.use('/upload', uploadRoutes)

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Hafiportrait Upload API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      upload: {
        portfolio: 'POST /upload/portfolio',
        portfolioBatch: 'POST /upload/portfolio/batch',
        event: 'POST /upload/event/:eventId',
        eventBatch: 'POST /upload/event/:eventId/batch',
        slideshow: 'POST /upload/slideshow',
      },
    },
  })
})

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err)
    res.status(500).json({
      error: 'Internal server error',
      message: config.nodeEnv === 'development' ? err.message : undefined,
    })
  }
)

// Start server
const server = app.listen(config.port, () => {
  console.log('═══════════════════════════════════════════════════════')
  console.log('   Hafiportrait Upload API')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`   Port:        ${config.port}`)
  console.log(`   Environment: ${config.nodeEnv}`)
  console.log(`   Storage:     ${config.storagePath}`)
  console.log(`   R2 Bucket:   ${config.r2.bucket}`)
  console.log('═══════════════════════════════════════════════════════')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
