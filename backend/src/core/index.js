/**
 * Core Layer - Central exports for services, database, and models
 * Alle bestehenden Funktionalitäten bleiben unverändert
 */

// Services
export { default as cacheService } from './services/cacheService.js';
export { default as databaseService } from './services/databaseService.js';
export { default as dbConnection } from './services/dbConnection.js';
export { default as errorMetricsService } from './services/errorMetricsService.js';
export { default as monitoringService } from './services/monitoringService.js';
export { default as uploadCleanupService } from './services/uploadCleanupService.js';
export { default as websiteInfoService } from './services/websiteInfoService.js';
export { default as websocketService } from './services/websocketService.js';

// Database
export { default as migrate } from './database/migrate.js';

// Models
export { default as userModel } from './models/userModel.js';

// Convenience exports
export const services = {
  cache: cacheService,
  database: databaseService,
  dbConnection,
  errorMetrics: errorMetricsService,
  monitoring: monitoringService,
  uploadCleanup: uploadCleanupService,
  websiteInfo: websiteInfoService,
  websocket: websocketService
};

export const models = {
  user: userModel
};

export const database = {
  migrate,
  connection: dbConnection
};