/**
 * Environment Configuration with Validation and Type Safety
 * Best practices: Centralized config, validation, type safety, defaults
 */

import Joi from 'joi'

// Schema for environment validation
const envSchema = Joi.object({
  // Server
  PORT: Joi.number().integer().min(1000).max(65535).default(3001),
  NODE_ENV: Joi.string().valid('development', 'test', 'production', 'local').default('development'),

  // URLs
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  BACKEND_URL: Joi.string().uri().default('http://localhost:3001/api'),

  // Database - Required for security
  DB_HOST: Joi.string().min(1).default('localhost'),
  DB_USER: Joi.string().min(1).required(),
  DB_PASS: Joi.string().min(1).required().messages({
    'string.empty': 'Database password is required for security!',
    'any.required': 'Database password must be set!'
  }),
  DB_NAME: Joi.string().min(1).default('file_manager'),
  DB_CONNECTION_LIMIT: Joi.number().integer().min(1).max(100).default(20),
  DB_SSL: Joi.boolean().default(true), // Force SSL by default
  DB_SSL_REJECT_UNAUTHORIZED: Joi.boolean().default(true),

  // JWT - Required
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT secret must be at least 32 characters long!',
    'any.required': 'JWT secret is required!'
  }),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT refresh secret must be at least 32 characters long!',
    'any.required': 'JWT refresh secret is required!'
  }),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  JWT_ISSUER: Joi.string().default('weppixpress'),
  JWT_AUDIENCE: Joi.string().default('weppixpress-api'),

  // Email - Required
  EMAIL_FROM: Joi.string().email().required(),
  SMTP_PORT: Joi.number().integer().min(1).max(65535).default(587),
  SMTP_HOST: Joi.string().min(1).required(),
  SMTP_USER: Joi.string().min(1).required(),
  SMTP_PASS: Joi.string().min(1).required().messages({
    'string.empty': 'SMTP password is required!',
    'any.required': 'SMTP password must be set!'
  }),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:5173'),

  // File Storage
  UPLOAD_DIR: Joi.string().min(1).default('/var/www/weppixpress/uploads'),
  MAX_FILE_SIZE: Joi.number().integer().min(1).default(104857600),
  MAX_FILES_PER_REQUEST: Joi.number().integer().min(1).max(100).default(10),
  UPLOAD_MAX_CONCURRENT_WRITES: Joi.number().integer().min(1).max(50).default(8),
  UPLOAD_MAX_SESSIONS_PER_USER: Joi.number().integer().min(1).max(1000).default(50),
  UPLOAD_MAX_FILES_PER_SESSION: Joi.number().integer().min(1).max(1000000).default(200000),

  // Redis
  REDIS_URL: Joi.string().uri().optional(),

  // Security
  RATE_LIMIT_GENERAL_MAX: Joi.number().integer().min(1).max(10000).default(200),
  RATE_LIMIT_AUTH_MAX: Joi.number().integer().min(1).max(1000).default(20),
}).unknown() // Allow other environment variables

// Parse and validate environment
function validateEnv() {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    const missingVars = error.details.map(detail =>
      `  ${detail.path.join('.')}: ${detail.message}`
    ).join('\n')

    throw new Error(
      `❌ Invalid environment configuration:\n${missingVars}\n\n` +
      `📝 Please check your .env file against .env.example\n` +
      `🔒 Ensure all required secrets are set securely!`
    )
  }

  return value
}

// Export validated config
export const config = validateEnv()

// Helper functions
export const isProduction = () => config.NODE_ENV === 'production'
export const isDevelopment = () => config.NODE_ENV === 'development'
export const isTest = () => config.NODE_ENV === 'test'

// Security warnings for development
if (isDevelopment()) {
  const warnings: string[] = []

  if (config.DB_PASS === '' || config.DB_PASS === 'password') {
    warnings.push('⚠️  Using default/empty database password!')
  }

  if (config.JWT_SECRET.length < 64) {
    warnings.push('⚠️  JWT secret should be at least 64 characters!')
  }

  if (!config.DB_SSL && config.NODE_ENV !== 'local') {
    warnings.push('⚠️  Database SSL is disabled!')
  }

  if (config.UPLOAD_DIR.startsWith('../')) {
    warnings.push('⚠️  Using relative upload directory path!')
  }

  if (warnings.length > 0) {
    console.warn('\n🚨 SECURITY WARNINGS:\n' + warnings.join('\n') + '\n')
  }
}

export default config