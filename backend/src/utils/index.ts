/**
 * Barrel export file for utilities
 * Consolidates imports to reduce duplicate import statements
 */

// Logger
export { default as logger } from './logger.js'

// HTTP Responses
export * from './httpResponses.js'

// Validation utilities
export * from './commonValidation.js'

// Error classes
export * from './errors.js'

// JWT utilities
export * from './jwtUtils.js'

// File utilities
export * from './fileValidation.js'
export * from './fileOperations.js'
export * from './fileCache.js'

// Path security
export * from './pathSecurity.js'

// Email utilities
export * from './mail.js'
export { default as sendMail } from './mail.js'

// Performance utilities
// export * from './performance.js' // TODO: Create performance utilities

// Circuit breaker
export * from './circuitBreaker.js'

// Graceful shutdown
export * from './gracefulShutdown.js'

// Email templates
export * from './emailTemplates.js'