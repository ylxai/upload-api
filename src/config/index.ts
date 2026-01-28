import dotenv from 'dotenv'
import path from 'path'

// Load environment from parent directory or local
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../../.env.production') })

export const config = {
  // Server
  port: parseInt(process.env.UPLOAD_API_PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Storage paths (VPS local)
  storagePath: process.env.STORAGE_PATH || '/home/eouser/storage',
  storageUrl:
    process.env.STORAGE_URL || 'https://storage.hafiportrait.photography',

  // R2 Configuration (for thumbnails)
  r2: {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKey: process.env.R2_ACCESS_KEY || '',
    secretKey: process.env.R2_SECRET_KEY || '',
    bucket: process.env.R2_BUCKET || 'foto',
    publicUrl: process.env.R2_PUBLIC_URL?.replace(/"/g, '') || '',
  },

  // Upload limits
  upload: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
    maxFiles: 50,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ],
  },

  // Thumbnail sizes
  thumbnails: {
    small: { width: 400, height: 400 },
    medium: { width: 800, height: 800 },
    large: { width: 1200, height: 1200 },
  },

  // Auth
  apiKey: process.env.UPLOAD_API_KEY || '',

  // Database (for registering photos)
  databaseUrl: process.env.DATABASE_URL || '',
}

// Validate required config
export function validateConfig(): void {
  const required = [
    { key: 'R2_ENDPOINT', value: config.r2.endpoint },
    { key: 'R2_ACCESS_KEY', value: config.r2.accessKey },
    { key: 'R2_SECRET_KEY', value: config.r2.secretKey },
    { key: 'UPLOAD_API_KEY', value: config.apiKey },
  ]

  const missing = required.filter((r) => !r.value)

  if (missing.length > 0) {
    console.warn(
      '⚠️  Missing environment variables:',
      missing.map((m) => m.key).join(', ')
    )
  }
}
