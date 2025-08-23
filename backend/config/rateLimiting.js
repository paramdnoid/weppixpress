import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import logger from '../utils/logger.js';

let rateLimitRedisClient = null;

export async function initializeRateLimiting() {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  rateLimitRedisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  await rateLimitRedisClient.connect().catch(console.error);
  return rateLimitRedisClient;
}

export function createRateLimiters() {
  if (process.env.NODE_ENV === 'test') {
    return {
      generalLimiter: (req, res, next) => next(),
      authLimiter: (req, res, next) => next(),
      uploadLimiter: (req, res, next) => next()
    };
  }

  const generalLimiter = rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => rateLimitRedisClient.sendCommand(args),
      prefix: 'rl:general:'
    }),
    windowMs: 1 * 60 * 1000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return req.path.startsWith('/api/health') || 
             req.path.startsWith('/api-docs');
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
      res.status(429).json({
        error: {
          message: 'Too many requests, please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60
        }
      });
    }
  });

  const authLimiter = rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => rateLimitRedisClient.sendCommand(args),
      prefix: 'rl:auth:'
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      logger.warn('Auth rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      res.status(429).json({
        error: {
          message: 'Too many authentication attempts. Please try again in 15 minutes.',
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          retryAfter: 900
        }
      });
    }
  });

  const uploadLimiter = rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => rateLimitRedisClient.sendCommand(args),
      prefix: 'rl:upload:'
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX) || 20,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          message: 'Upload rate limit exceeded.',
          code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
          retryAfter: 900
        }
      });
    }
  });

  return { generalLimiter, authLimiter, uploadLimiter };
}

export async function closeRateLimiting() {
  if (rateLimitRedisClient) {
    await rateLimitRedisClient.quit();
  }
}