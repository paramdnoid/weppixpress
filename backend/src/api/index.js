/**
 * API Layer - Central exports for controllers, routes, and middleware
 * Alle bestehenden Funktionalitäten bleiben unverändert
 */

// Controllers
export { default as adminController } from './controllers/adminController.js';
export { default as authController } from './controllers/authController.js';
export { default as fileController } from './controllers/fileController.js';
export { default as healthController } from './controllers/healthController.js';
export { default as uploadController } from './controllers/uploadController.js';

// Routes  
export { default as adminRoutes } from './routes/admin.js';
export { default as authRoutes } from './routes/auth.js';
export { default as dashboardRoutes } from './routes/dashboard.js';
export { default as filesRoutes } from './routes/files.js';
export { default as healthRoutes } from './routes/health.js';
export { default as uploadRoutes } from './routes/upload.js';
export { default as websiteInfoRoutes } from './routes/websiteInfo.js';

// Middleware
export { default as authenticate } from './middleware/authenticate.js';
export { default as errorHandler } from './middleware/errorHandler.js';
export { default as inputSanitization } from './middleware/inputSanitization.js';
export { default as monitoring } from './middleware/monitoring.js';
export { default as requestContext } from './middleware/requestContext.js';

// Convenience export für alle Routes
export const routes = {
  admin: adminRoutes,
  auth: authRoutes,
  dashboard: dashboardRoutes,
  files: filesRoutes,
  health: healthRoutes,
  upload: uploadRoutes,
  websiteInfo: websiteInfoRoutes
};

// Convenience export für alle Controller
export const controllers = {
  admin: adminController,
  auth: authController,
  file: fileController,
  health: healthController,
  upload: uploadController
};

// Convenience export für alle Middleware
export const middleware = {
  authenticate,
  errorHandler,
  inputSanitization,
  monitoring,
  requestContext
};