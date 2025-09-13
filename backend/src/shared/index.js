/**
 * Shared Layer - Central exports for utilities, validation, and configuration
 * Alle bestehenden Funktionalitäten bleiben unverändert
 */

// Utils
export { default as circuitBreaker } from './utils/circuitBreaker.js';
export * from './utils/errors.js';
export { fileFilter, strictFileFilter } from './utils/fileValidation.js';
export * from './utils/jwtUtils.js';
export { default as logger } from './utils/logger.js';
export { default as mail } from './utils/mail.js';
export { default as pathSecurity } from './utils/pathSecurity.js';
export { secureResolve, getUserDirectory, sanitizeUploadPath } from './utils/pathSecurity.js';

// New utilities for reduced code duplication
export * from './utils/fileOperations.js';
export * from './utils/httpResponses.js';
export * from './utils/commonValidation.js';
export { FileCache } from './utils/fileCache.js';

// Validation
export { default as validateRequest } from './validation/validateRequest.js';
export * from './validation/schemas/authSchemas.js';

// Config (wenn vorhanden) - removed as constants.js doesn't exist

// Import modules for convenience exports
import circuitBreaker from './utils/circuitBreaker.js';
import logger from './utils/logger.js';
import mail from './utils/mail.js';
import pathSecurity from './utils/pathSecurity.js';
import validateRequest from './validation/validateRequest.js';

// Convenience exports für häufig verwendete Utils
export const utils = {
  circuitBreaker,
  logger,
  mail,
  pathSecurity
};

// Convenience exports für Validation
export const validation = {
  validateRequest
};