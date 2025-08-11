import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import compression from 'compression';

// Redis client für Rate Limiting und Session Store
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
  }
});

// Enhanced security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  originAgentCluster: true,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  permittedCrossDomainPolicies: false
});

// Advanced Rate Limiting configurations
export const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Please wait before making more requests',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  };

  return rateLimit({
    ...defaults,
    ...options,
    store: new RedisStore({
      client: redisClient,
      prefix: options.prefix || 'rl:'
    }),
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  });
};

// Specific rate limiters for different endpoints
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  prefix: 'rl:auth:',
  skipSuccessfulRequests: true
});

export const apiLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 60,
  prefix: 'rl:api:'
});

export const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: 'rl:upload:'
});

// CORS configuration with dynamic origin validation
export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

// Input sanitization middleware
export const sanitizeInput = [
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ key }) => {
      console.warn(`Sanitized prohibited character in ${key}`);
    }
  }),
  xss(),
  hpp({
    whitelist: ['sort', 'filter', 'page', 'limit']
  })
];

// Compression middleware
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
});