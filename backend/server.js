import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import uploadRoutes from './routes/upload.js';
import healthRoutes from './routes/health.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';

import { errorHandler, notFound } from './middleware/errorHandler.js';
import { setupSwagger } from './swagger/swagger.js';
import { runMigrations } from './database/migrate.js';

import { WebSocketManager } from './websocketHandler.js';

import cacheService from './services/cacheService.js';
import databaseService from './services/databaseService.js';
import logger from './utils/logger.js';
import { requestContext, requestTimeout, corsPreflightHandler, apiVersioning } from './middleware/requestContext.js';
import { requestMonitoring, errorMonitoring } from './middleware/monitoring.js';
import monitoringService from './services/monitoringService.js';
import errorMetricsService from './services/errorMetricsService.js';
import circuitBreakerRegistry from './utils/circuitBreaker.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize application on startup
if (process.env.NODE_ENV !== 'test') {
  await runMigrations();
  await cacheService.initialize();
}

// Request context and tracking
app.use(requestContext);
app.use(requestMonitoring);
app.use(requestTimeout(30000)); // 30 second timeout
app.use(corsPreflightHandler);
app.use(apiVersioning);

app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ extended: true, limit: '50gb' }));
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
      objectSrc: ["'none'"]
    }
  }
}));

import { securityMiddlewareStack } from './middleware/inputSanitization.js';
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

  app.use(generalLimiter);
  app.use('/api/auth', authLimiter);
  app.use('/api/upload', uploadLimiter);
}

setupSwagger(app);

// Serve dashboard static files
app.use('/dashboard', express.static(path.join(__dirname, 'public/dashboard')));

// Dashboard route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard/index.html'));
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorMonitoring);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend + WS running on http://localhost:${PORT}`);
  console.log(`📚 API Docs available at http://localhost:${PORT}/api-docs`);
});

const wsManager = new WebSocketManager(server);

global.wsManager = wsManager;

export function broadcastFileUpdate(file) {
  wsManager.broadcastFileUpdated(file);
}

export function broadcastFileCreated(file) {
  wsManager.broadcastFileCreated(file);
}

export function broadcastFileDeleted(filePath) {
  wsManager.broadcastFileDeleted(filePath);
}

export function broadcastFolderChanged(folderPath) {
  wsManager.broadcastFolderChanged(folderPath);
}

app.get('/api/ws/stats', (_req, res) => {
  res.json(wsManager.getStats());
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

app.get('/api/system/errors', async (req, res) => {
  const timeWindow = parseInt(req.query.timeWindow) || 3600000; // Default 1 hour
  const metrics = errorMetricsService.getMetrics(timeWindow);
  res.json(metrics);
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

// Graceful shutdown function
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