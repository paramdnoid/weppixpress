import * as dotenv from 'dotenv';

dotenv.config();

export const serverConfig = {
  port: process.env.PORT || 3002,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:5173']
  },
  rateLimit: {
    general: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX) || 500
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '100mb',
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/*', 'video/*', 'audio/*']
  }
};