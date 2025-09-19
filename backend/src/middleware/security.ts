/**
 * Security Middleware and Utilities
 * Best practices: Input validation, CSRF protection, rate limiting, security headers
 */

import { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { body, validationResult } from 'express-validator'
import { config } from '../config/env.js'
import { SecurityError, RateLimitError, ValidationError } from '../utils/errors.js'

// Extended Request interface for security middleware
interface SecurityRequest extends Request {
  id?: string;
  user?: {
    id: string;
    [key: string]: any;
  };
  session?: {
    [key: string]: any;
  };
}

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow for file uploads
  crossOriginResourcePolicy: {
    policy: "cross-origin"
  }
})

// Rate limiting configurations
export const createRateLimit = (options: {
  windowMs: number
  max: number
  message?: string
  skipSuccessfulRequests?: boolean
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message || 'Too many requests',
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: SecurityRequest, res: any) => {
      throw new RateLimitError(options.message)
    }
  })
}

// General rate limit
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.RATE_LIMIT_GENERAL_MAX,
  message: 'Too many requests from this IP'
})

// Auth rate limit (stricter)
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.RATE_LIMIT_AUTH_MAX,
  message: 'Too many authentication attempts'
})

// File upload rate limit
export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many upload requests'
})

// Input sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Basic XSS protection
  const sanitizeString = (str: string): string => {
    return str
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
  }

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj)
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject)
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key])
        }
      }
      return sanitized
    }

    return obj
  }

  if (req.body) {
    req.body = sanitizeObject(req.body)
  }

  if (req.query) {
    req.query = sanitizeObject(req.query)
  }

  next()
}

// CSRF protection for state-changing operations
export const csrfProtection = (req: SecurityRequest, res: Response, next: NextFunction) => {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  const token = req.headers['x-csrf-token'] || req.body._token
  const sessionToken = req.session?.csrfToken

  if (!token || !sessionToken || token !== sessionToken) {
    throw new SecurityError('Invalid CSRF token')
  }

  next()
}

// Request size limits
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: SecurityRequest, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10)
    const maxBytes = parseSize(maxSize)

    if (contentLength > maxBytes) {
      throw new ValidationError('Request too large')
    }

    next()
  }
}

// Parse size string to bytes
function parseSize(size: string): number {
  const units = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/)

  if (!match) throw new Error('Invalid size format')

  const value = parseFloat(match[1])
  const unit = (match[2] || 'b') as keyof typeof units

  return Math.floor(value * units[unit])
}

// File upload security
export const fileUploadSecurity = {
  // Allowed MIME types
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/pdf',
    'application/json',
    'application/zip',
    'application/x-zip-compressed'
  ],

  // Dangerous file extensions
  dangerousExtensions: [
    '.exe', '.bat','.js','.msi', '.dll'
  ],

  // Validate file upload
  validateFile: (file: Express.Multer.File, requestId?: string) => {
    // Check MIME type
    if (!fileUploadSecurity.allowedMimeTypes.includes(file.mimetype)) {
      throw new SecurityError(`File type not allowed: ${file.mimetype}`)
    }

    // Check file extension
    const ext = file.originalname.toLowerCase().split('.').pop()
    if (ext && fileUploadSecurity.dangerousExtensions.includes(`.${ext}`)) {
      throw new SecurityError(`Dangerous file extension: .${ext}`)
    }

    // Check file size
    if (file.size > config.MAX_FILE_SIZE) {
      throw new ValidationError('File too large')
    }

    return true
  }
}

// Request validation error handler - DEPRECATED: Use handleValidationErrors from httpResponses.ts
// This function is kept for backward compatibility but should be phased out
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    const details = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }))

    throw new ValidationError('Validation failed', details)
  }

  next()
}

// Common validation rules
export const validators = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase, uppercase, and number'),

  strongPassword: body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain lowercase, uppercase, number, and special character'),

  uuid: (field: string) => body(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`),

  filename: body('filename')
    .isLength({ min: 1, max: 255 })
    .withMessage('Filename must be 1-255 characters')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Filename contains invalid characters'),

  positiveInteger: (field: string) => body(field)
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`),

  safeString: (field: string, maxLength: number = 255) => body(field)
    .isLength({ max: maxLength })
    .withMessage(`${field} must be ${maxLength} characters or less`)
    .matches(/^[a-zA-Z0-9\s._-]*$/)
    .withMessage(`${field} contains invalid characters`)
}

// Security audit logging
export const securityAuditLog = (
  event: string,
  req: SecurityRequest,
  details: Record<string, any> = {}
) => {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id || 'anonymous',
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ...details
  }

  // Log to security audit system
  console.log('[SECURITY AUDIT]', JSON.stringify(logData))
}

// IP whitelist/blacklist middleware
export const createIPFilter = (options: {
  whitelist?: string[]
  blacklist?: string[]
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip

    if (options.blacklist?.includes(clientIP)) {
      securityAuditLog('ip_blacklisted', req, { ip: clientIP })
      throw new SecurityError('Access denied')
    }

    if (options.whitelist && !options.whitelist.includes(clientIP)) {
      securityAuditLog('ip_not_whitelisted', req, { ip: clientIP })
      throw new SecurityError('Access denied')
    }

    next()
  }
}

// Request ID middleware for tracing
export const addRequestId = (req: SecurityRequest, res: Response, next: NextFunction) => {
  req.id = req.headers['x-request-id'] as string ||
           `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  res.setHeader('X-Request-ID', req.id)
  next()
}

// Export all security middleware as a convenient bundle
export const securityMiddleware = {
  headers: securityHeaders,
  rateLimit: {
    general: generalRateLimit,
    auth: authRateLimit,
    upload: uploadRateLimit,
    custom: createRateLimit
  },
  input: {
    sanitize: sanitizeInput,
    validate: handleValidationErrors,
    validators
  },
  csrf: csrfProtection,
  fileUpload: fileUploadSecurity,
  requestSize: requestSizeLimit,
  ipFilter: createIPFilter,
  requestId: addRequestId,
  audit: securityAuditLog
}