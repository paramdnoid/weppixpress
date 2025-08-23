class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

class CacheError extends AppError {
  constructor(message = 'Cache operation failed', originalError = null) {
    super(message, 500, 'CACHE_ERROR');
    this.originalError = originalError;
    this.isOperational = true; // Cache errors shouldn't crash the app
  }
}

class FileSystemError extends AppError {
  constructor(message = 'File system operation failed', path = null) {
    super(message, 500, 'FILESYSTEM_ERROR');
    this.path = path;
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service unavailable', serviceName = 'unknown') {
    super(message, 503, 'EXTERNAL_SERVICE_ERROR');
    this.serviceName = serviceName;
  }
}

class ConfigurationError extends AppError {
  constructor(message = 'Configuration error') {
    super(message, 500, 'CONFIGURATION_ERROR');
    this.isOperational = false; // Config errors should stop the app
  }
}

class SecurityError extends AppError {
  constructor(message = 'Security violation detected') {
    super(message, 403, 'SECURITY_ERROR');
    this.shouldLog = true; // Always log security errors
  }
}

class BusinessLogicError extends AppError {
  constructor(message = 'Business rule violation', rule = null) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR');
    this.rule = rule;
  }
}

export { 
  AppError, 
  ValidationError, 
  AuthenticationError,
  AuthorizationError,
  NotFoundError, 
  ConflictError,
  RateLimitError,
  DatabaseError,
  CacheError,
  FileSystemError,
  ExternalServiceError,
  ConfigurationError,
  SecurityError,
  BusinessLogicError
};

export default AppError;