export enum ErrorCode {
  // Authentication & Authorization
  _AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  _AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  _TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  _INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Validation
  _VALIDATION_ERROR = 'VALIDATION_ERROR',
  _BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',

  // Resources
  _NOT_FOUND = 'NOT_FOUND',
  _CONFLICT = 'CONFLICT',

  // System
  _DATABASE_ERROR = 'DATABASE_ERROR',
  _CACHE_ERROR = 'CACHE_ERROR',
  _FILESYSTEM_ERROR = 'FILESYSTEM_ERROR',
  _EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  _CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  _SECURITY_ERROR = 'SECURITY_ERROR',
  _RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export interface ErrorDetail {
  field?: string
  message: string
  code?: string
  value?: unknown
}

class AppError extends Error {
  public statusCode: number
  public code: ErrorCode | string
  public isOperational: boolean
  public timestamp: Date
  public requestId?: string
  public details?: ErrorDetail[]
  public shouldLog?: boolean
  public originalError?: Error

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode | string | null = null,
    isOperational: boolean = true,
    requestId?: string,
    details?: ErrorDetail[],
    shouldLog?: boolean,
    originalError?: Error
  ) {
    super(message)

    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code || 'INTERNAL_ERROR'
    this.isOperational = isOperational
    this.timestamp = new Date()
    this.requestId = requestId
    this.details = details
    this.shouldLog = shouldLog
    this.originalError = originalError

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      details: this.details,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    }
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details as any;
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
    this.originalError = originalError as any;
  }
}

class CacheError extends AppError {
  constructor(message = 'Cache operation failed', originalError = null) {
    super(message, 500, 'CACHE_ERROR');
    this.originalError = originalError as any;
    this.isOperational = true; // Cache errors shouldn't crash the app
  }
}

class FileSystemError extends AppError {
  constructor(message = 'File system operation failed', path = null) {
    super(message, 500, 'FILESYSTEM_ERROR');
    this.path = path as any;
  }
  public path?: string
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service unavailable', serviceName = 'unknown') {
    super(message, 503, 'EXTERNAL_SERVICE_ERROR');
    this.serviceName = serviceName;
  }
  public serviceName?: string
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
    this.rule = rule as any;
  }
  public rule?: string
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
