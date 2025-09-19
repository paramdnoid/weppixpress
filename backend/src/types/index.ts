// Export shared types (excluding config types that we override)
export {
  User,
  UserRole,
  UserSettings,
  FileItem,
  Email,
  LoginCredentials,
  ApiResponse,
  ValidationError,
  ValidationResult
} from '@shared/types';

// Export backend-specific types
export * from './auth.js';
export * from './express.js';
export * from './database.js';
export * from './websocket.js';
export * from './file.js';
export * from './services.js';
export * from './config.js';
export {
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