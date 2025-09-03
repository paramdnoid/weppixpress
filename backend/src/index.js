/**
 * Backend SRC - Central export point für die gesamte Backend-Architektur
 * Alle bestehenden Funktionalitäten bleiben vollständig erhalten
 */

// Layer exports
export * from './api/index.js';
export * from './core/index.js';
export * from './shared/index.js';

// Direct layer access
export { routes, controllers, middleware } from './api/index.js';
export { services, models, database } from './core/index.js';
export { utils, validation } from './shared/index.js';

// Convenience re-exports für häufig verwendete Module
export { default as logger } from './shared/utils/logger.js';
export { ValidationError, AppError } from './shared/utils/errors.js';
export { default as cacheService } from './core/services/cacheService.js';
export { default as dbConnection } from './core/services/dbConnection.js';