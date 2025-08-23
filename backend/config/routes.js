import authRoutes from '../routes/auth.js';
import fileRoutes from '../routes/files.js';
import uploadRoutes from '../routes/upload.js';
import healthRoutes from '../routes/health.js';
import dashboardRoutes from '../routes/dashboard.js';
import adminRoutes from '../routes/admin.js';
import websiteInfoRoutes from '../routes/websiteInfo.js';

import { errorHandler, notFound } from '../middleware/errorHandler.js';
import { errorMonitoring } from '../middleware/monitoring.js';

export function setupRoutes(app, rateLimiters) {
  const { generalLimiter, authLimiter, uploadLimiter } = rateLimiters;

  // Apply rate limiting
  app.use(generalLimiter);
  app.use('/api/auth', authLimiter);
  app.use('/api/upload', uploadLimiter);

  // API routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/website-info', websiteInfoRoutes);

  // Error handling middleware (must be last)
  app.use(notFound);
  app.use(errorMonitoring);
  app.use(errorHandler);
}