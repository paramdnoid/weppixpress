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
  crossOriginResourcePolicy: { policy: 'same-origin' },
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
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
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

// Additional security middleware
export const blockSuspiciousRequests = (req, res, next) => {
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS attempts
    /union\s+select/i, // SQL injection
    /exec\s*\(/i, // Code execution
    /eval\s*\(/i, // Code evaluation
    /\$\{.*\}/, // Template injection
    /<%.*%>/, // Server-side template injection
    /javascript:/i, // JS protocol
    /vbscript:/i, // VBS protocol
    /data:text\/html/i, // Data URLs
    /\x00/, // Null bytes
  ];

  const userAgent = req.get('User-Agent') || '';
  const requestUrl = req.url;
  const requestBody = JSON.stringify(req.body);

  // Check for suspicious patterns in request
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(requestUrl) || 
    pattern.test(requestBody) || 
    pattern.test(userAgent)
  );

  if (isSuspicious) {
    console.warn(`Blocked suspicious request from ${req.ip}: ${requestUrl}`);
    return res.status(400).json({ error: 'Invalid request format' });
  }

  next();
};

// Request logging for security monitoring
export const securityLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(body) {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    };

    // Log suspicious activity
    if (res.statusCode >= 400) {
      console.warn('Security Log:', logData);
    }

    originalSend.call(this, body);
  };

  next();
};