// server.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import rateLimit from 'express-rate-limit';

// Routes
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import uploadRoutes from './routes/upload.js';
import healthRoutes from './routes/health.js';

// Middleware
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { setupSwagger } from './swagger/swagger.js';
import { runMigrations } from './database/migrate.js';

dotenv.config();

const app = express();

// Run database migrations on startup
if (process.env.NODE_ENV !== 'test') {
  await runMigrations();
}

// Parse JSON bodies and cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// HTTP request logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"]
    }
  }
}));

// Rate limiting
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

if (process.env.NODE_ENV !== 'test') {
  redisClient.connect().catch(console.error);
}

const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args)
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: {
    error: {
      message: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});

app.use(limiter);

// API Documentation
setupSwagger(app);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend ready on port ${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    redisClient.disconnect();
    process.exit(0);
  });
});

export default app;