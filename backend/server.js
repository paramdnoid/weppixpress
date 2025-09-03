import { runMigrations } from './database/migrate.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { securityMiddlewareStack } from './middleware/inputSanitization.js';
import { errorMonitoring, requestMonitoring } from './middleware/monitoring.js';
import { apiVersioning, corsPreflightHandler, requestContext, requestTimeout } from './middleware/requestContext.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import fileRoutes from './routes/files.js';
import healthRoutes from './routes/health.js';
import uploadRoutes from './routes/upload.js';
import websiteInfoRoutes from './routes/websiteInfo.js';
import cacheService from './services/cacheService.js';
import databaseService from './services/databaseService.js';
import monitoringService from './services/monitoringService.js';
import { setupSwagger } from './swagger/swagger.js';
import circuitBreakerRegistry from './utils/circuitBreaker.js';
import logger from './utils/logger.js';
import { WebSocketManager } from './services/websocketService.js';
import uploadCleanupService from './services/uploadCleanupService.js';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize application on startup
if (process.env.NODE_ENV !== 'test') {
  await runMigrations();
  await cacheService.initialize();
}

// Performance optimizations
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024 // Only compress responses over 1kb
}));

// Request context and tracking
app.use(requestContext);
app.use(requestMonitoring);
app.use(requestTimeout(5 * 60 * 1000)); // 5 minute timeout for long uploads
app.use(corsPreflightHandler);
app.use(apiVersioning);

// Smart body parsing limits
app.use('/api/upload', express.json({ limit: '50gb' }));
app.use('/api/upload', express.urlencoded({ extended: true, limit: '50gb' }));
app.use(express.json({ limit: '10mb' })); // Smaller limit for non-upload routes
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

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
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(securityMiddlewareStack);

const rateLimitRedisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

if (process.env.NODE_ENV !== 'test') {
  rateLimitRedisClient.connect().catch(console.error);
  
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
             req.path.startsWith('/api-docs') ||
             req.path.startsWith('/api/chunked-upload'); // Skip rate limiting for chunked uploads
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
    max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX) || 1000, // Increased for chunked uploads
    handler: (req, res) => {
      res.status(429).json({
        error: {
          message: 'Upload rate limit exceeded. Please try again later.',
          code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
          retryAfter: 900
        }
      });
    }
  });

  app.use(generalLimiter);
  app.use('/api/auth', authLimiter);
  app.use('/api/upload', uploadLimiter);
  app.use('/api/chunked-upload', uploadLimiter);
}

setupSwagger(app);

// Serve dashboard static files with optimized caching
app.use('/dashboard', express.static(path.join(__dirname, 'public/dashboard'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Dashboard route
app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard/index.html'));
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/website-info', websiteInfoRoutes);

app.use(notFound);
app.use(errorMonitoring);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend + WS running on http://localhost:${PORT}`);
  console.log(`📚 API Docs available at http://localhost:${PORT}/api-docs`);
});

// Optimize server performance settings
server.requestTimeout = 0;    // disable per-request timeout
server.headersTimeout = 0;    // allow slow multipart headers for big forms
server.keepAliveTimeout = 65_000; // keep-alive > typical proxy idle
server.maxHeadersCount = 2000; // increase header limit for complex requests

// Enable TCP_NODELAY for better real-time performance
server.on('connection', (socket) => {
  socket.setNoDelay(true);
  socket.setKeepAlive(true, 60000); // Keep alive for 60 seconds
});

const wsManager = new WebSocketManager(server);

// Make WebSocket manager globally available for controllers
global.wsManager = wsManager;

// Start upload cleanup service
if (process.env.NODE_ENV !== 'test') {
  uploadCleanupService.start();
}

app.get('/api/ws/stats', (_req, res) => {
  res.json(wsManager.getStats());
});

app.get('/api/security/info', (_req, res) => {
  res.json({
    securityFeatures: {
      helmet: 'enabled',
      cors: 'configured',
      rateLimiting: 'redis-based',
      inputSanitization: 'xss-clean, hpp, mongo-sanitize',
      compression: 'gzip',
      logging: 'gdpr-compliant'
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/cache/health', async (_req, res) => {
  const health = await cacheService.healthCheck();
  res.json(health);
});

app.get('/api/database/health', async (_req, res) => {
  const health = await databaseService.healthCheck();
  res.json(health);
});

app.get('/api/system/health', async (_req, res) => {
  const health = await monitoringService.getHealthStatus();
  res.json(health);
});

app.get('/api/system/metrics', async (req, res) => {
  const timeRange = req.query.range || 'last_hour';
  const report = monitoringService.getPerformanceReport(timeRange);
  res.json(report);
});

app.get('/api/system/errors', async (_req, res) => {
  try {
    const data =
      (typeof monitoringService.getErrorMetrics === 'function' && await monitoringService.getErrorMetrics()) ||
      (typeof monitoringService.getRecentErrors === 'function' && await monitoringService.getRecentErrors()) ||
      [];
    res.json(data);
  } catch (_e) {
    res.json([]);
  }
});

app.get('/api/system/circuit-breakers', async (_req, res) => {
  const metrics = circuitBreakerRegistry.getAllMetrics();
  const healthStatus = circuitBreakerRegistry.getHealthStatus();
  res.json({
    metrics,
    healthStatus
  });
});

app.post('/api/system/circuit-breakers/reset', async (req, res) => {
  const { serviceName } = req.body;
  
  if (serviceName) {
    const breaker = circuitBreakerRegistry.getBreaker(serviceName);
    breaker.reset();
    res.json({ message: `Circuit breaker for ${serviceName} reset` });
  } else {
    circuitBreakerRegistry.resetAll();
    res.json({ message: 'All circuit breakers reset' });
  }
});

// Global error handlers for unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason.message || reason,
    stack: reason.stack,
    promise: promise.toString()
  });
  
  // In production, you might want to gracefully shutdown
  if (process.env.NODE_ENV === 'production') {
    console.error('Unhandled promise rejection. Shutting down gracefully...');
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  console.error('Uncaught exception. Shutting down...');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

async function gracefulShutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);
  
  try {
    // Stop monitoring
    monitoringService.stopMonitoring();
    
    // Close WebSocket connections
    wsManager.close();
    
    // Close server
    server.close(async () => {
      console.log('HTTP server closed');
      
      try {
        await cacheService.close();
        await databaseService.close();
        if (rateLimitRedisClient) {
          await rateLimitRedisClient.quit();
        }
        
        console.log('All connections closed. Process terminated');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
