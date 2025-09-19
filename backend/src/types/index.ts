// Note: Shared types are not re-exported here to avoid cross-package coupling

// Export backend-specific types (use explicit type re-exports to satisfy isolatedModules)
export type * from './auth.js';
export type * from './express.js';
export type * from './database.js';
export type * from './websocket.js';
export type * from './file.js';
export type * from './services.js';
export type * from './config.js';
export type {
  ValidationResult as BackendValidationResult,
  ValidationError as BackendValidationError,
  ValidationSchema,
  ValidationOptions,
  ValidationMiddleware,
  Validators,
  FieldValidator,
  ValidationRule,
  SchemaBuilder
} from './validation.js';
