import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.js';
import authenticate from './middleware/authenticate.js';

dotenv.config();

// Load and parse CORS whitelist from environment
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true
};

const app = express();

// Parse JSON bodies and cookies
app.use(express.json());
app.use(cookieParser());

// HTTP request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (_req, res) => res.sendStatus(200));

// Enable CORS
app.use(cors(corsOptions));

// Helmet security headers
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"]
    }
  }
}));
app.use(helmet.crossOriginOpenerPolicy());
app.use(helmet.crossOriginEmbedderPolicy());

// HTTP Strict Transport Security
app.use(helmet.hsts({
  maxAge: 31536000,      // 1 year in seconds
  includeSubDomains: true,
  preload: true
}));

// Prevent Clickjacking
app.use(helmet.frameguard({ action: 'deny' }));

// Referrer Policy
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));

// Setup Redis client for rate limiting
const redisClient = createClient();
redisClient.connect().catch(console.error);

const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args)
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Zu viele Anfragen, bitte später erneut versuchen.'
});
app.use(limiter);

// Mount auth routes
app.use('/api/auth', authRouter);

// Geschützte Beispielroute
app.get('/api/files', authenticate, (req, res) => {
  res.json({ message: `Hallo User ${req.user.userId}` });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend ready on port ${PORT}`));

// Globales Error-Handling-Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);                         // Stack-Trace in der Konsole
  const statusCode = err.statusCode || 500;         // Eigener statusCode oder 500
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error' // Standard-Text
  });
});