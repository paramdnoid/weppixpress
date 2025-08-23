import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { requestContext, requestTimeout, corsPreflightHandler, apiVersioning } from '../middleware/requestContext.js';
import { requestMonitoring, errorMonitoring } from '../middleware/monitoring.js';
import { securityMiddlewareStack } from '../middleware/inputSanitization.js';
import { setupSwagger } from '../swagger/swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Request context and tracking
  app.use(requestContext);
  app.use(requestMonitoring);
  app.use(requestTimeout(30000)); // 30 second timeout
  app.use(corsPreflightHandler);
  app.use(apiVersioning);

  // Body parsing middleware
  app.use(express.json({ limit: '50gb' }));
  app.use(express.urlencoded({ extended: true, limit: '50gb' }));
  app.use(cookieParser());

  // Development logging
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
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
        objectSrc: ["'none'"]
      }
    }
  }));

  app.use(securityMiddlewareStack);

  // API documentation
  setupSwagger(app);

  return app;
}