import compression from 'compression';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import xss from 'xss-clean';
import helmet from 'helmet';
import cors from 'cors';

// ---- Redis client for Rate Limiting ----
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 1000) }
});
redisClient.on('error', (err) => {
  // Avoid crashing on transient redis errors
  console.warn('Redis client error (rate limiting will fallback):', err?.message);
});
(async () => {
  try { if (!redisClient.isOpen) await redisClient.connect(); } catch (_) { /* no-op */ }
})();

// ---- Security Headers (Helmet) ----
export const securityHeaders = helmet({
  // Keep defaults, but allow our API and frontends to work without strict CSP by default.
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' },
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
});

// ---- Advanced Rate Limiter factory ----
export function createRateLimiter(options = {}) {
  const defaults = {
    windowMs: 60 * 1000, // 1 min
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}:${req.headers['x-forwarded-for'] || ''}`,
    handler: (req, res /*, next */) => {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        code: 'RATE_LIMITED'
      });
    }
  };

  return rateLimit({
    ...defaults,
    ...options,
    store: new RedisStore({
      // `rate-limit-redis` v4 supports a `sendCommand` fn; most setups also accept a `client`
      // We pass the redis client for compatibility
      client: redisClient,
      prefix: options.prefix || 'rl:'
    }),
    skip: (req) => {
      // Always allow health checks
      if (req.path === '/health') return true;
      return typeof options.skip === 'function' ? options.skip(req) : false;
    }
  });
}

// ---- Specific limiters ----
export const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: 'rl:upload:'
});

export const authLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  prefix: 'rl:auth:'
});

// ---- CORS configuration with dynamic origin validation ----
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true); // permissive if unset
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

export const corsMiddleware = cors(corsOptions);

// ---- Input sanitization middleware ----
export const inputSanitizers = [
  xss(),
  hpp({ whitelist: ['sort', 'filter', 'page', 'limit', 'fields', 'tags'] })
];

// ---- Compression middleware ----
export const compressionMiddleware = compression({
  filter: (req, res) => {
    // Allow disabling compression for specific requests
    if (req.headers['x-no-compress']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
});

// ---- Suspicious request guard ----
const suspiciousPatterns = [
  /\b(select\s+\*|union\s+select|drop\s+table)\b/i,
  /<script\b[^>]*>/i,
  /\.{2}\//, // path traversal
  /\b(eval|Function\()\b/,
  /%3C\s*script/i
];

export function suspiciousRequestGuard(req, res, next) {
  try {
    const userAgent = req.get('User-Agent') || '';
    const requestUrl = req.url || '';
    const requestBody = JSON.stringify(req.body || {});

    const isSuspicious = suspiciousPatterns.some((p) =>
      p.test(requestUrl) || p.test(requestBody) || p.test(userAgent)
    );

    if (isSuspicious) {
      console.warn(`Blocked suspicious request from ${req.ip}: ${requestUrl}`);
      return res.status(400).json({ success: false, error: 'Invalid request format' });
    }

    return next();
  } catch (_) {
    // Never break the pipeline from this guard
    return next();
  }
}

// ---- Security logger ----
export function securityLogger(req, res, next) {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function sendPatched(body) {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    };

    if (res.statusCode >= 400) {
      console.warn('Security Log:', logData);
    }

    return originalSend.call(this, body);
  };

  next();
}

export default {
  redisClient,
  securityHeaders,
  createRateLimiter,
  uploadLimiter,
  authLimiter,
  corsOptions,
  corsMiddleware,
  inputSanitizers,
  compressionMiddleware,
  suspiciousRequestGuard,
  securityLogger
};
