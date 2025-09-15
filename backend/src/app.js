import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

import { serverConfig } from '../config/index.js';
import { setupMiddleware } from './middleware/index.js';
import { setupRoutes } from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initializeServices } from './services/index.js';
import logger from './utils/logger.js';

const app = express();

// Initialize services
await initializeServices();

// Basic middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (serverConfig.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}

// CORS
app.use(cors({
  origin: serverConfig.cors.origins,
  credentials: true
}));

// Security
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: serverConfig.nodeEnv === 'production' ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Custom middleware
setupMiddleware(app);

// Rate limiting
if (serverConfig.nodeEnv !== 'test') {
  const rateLimitRedisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  await rateLimitRedisClient.connect().catch(err =>
    logger.error('Redis connection failed:', err)
  );

  const _generalLimiter = rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => rateLimitRedisClient.sendCommand(args),
      prefix: 'rl:general:'
    }),
    windowMs: serverConfig.rateLimit.general.windowMs,
    max: serverConfig.rateLimit.general.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return req.path.startsWith('/api/health') ||
             req.path.startsWith('/api-docs') ||
             req.path.startsWith('/api/upload');
    }
  });

  app.use(_generalLimiter);
}

// Routes
setupRoutes(app);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;