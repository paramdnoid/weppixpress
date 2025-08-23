import { CacheError, DatabaseError, ExternalServiceError } from './errors.js';
import logger from './logger.js';

/**
 * Enhanced retry handler with exponential backoff and intelligent retry strategies
 */
class RetryHandler {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.exponentialBase = options.exponentialBase || 2;
    this.jitter = options.jitter !== false; // Default true
    this.retryableErrors = options.retryableErrors || [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN'
    ];
    this.nonRetryableStatusCodes = options.nonRetryableStatusCodes || [
      400, 401, 403, 404, 422 // Client errors that won't improve with retry
    ];
  }

  /**
   * Execute operation with retry logic
   */
  async execute(operation, context = {}) {
    let lastError;
    let attempt = 0;

    while (attempt < this.maxAttempts) {
      attempt++;

      try {
        logger.debug(`Attempt ${attempt}/${this.maxAttempts}`, context);
        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`Operation succeeded after ${attempt} attempts`, context);
        }
        
        return result;
      } catch (error) {
        lastError = error;

        if (!this.shouldRetry(error, attempt)) {
          logger.warn(`Not retrying error after ${attempt} attempts`, {
            ...context,
            error: error.message,
            errorType: error.constructor.name,
            reason: this.getNoRetryReason(error, attempt)
          });
          throw error;
        }

        if (attempt < this.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          logger.warn(`Operation failed, retrying in ${delay}ms`, {
            ...context,
            attempt,
            maxAttempts: this.maxAttempts,
            error: error.message,
            delay
          });

          await this.delay(delay);
        }
      }
    }

    logger.error(`Operation failed after ${this.maxAttempts} attempts`, {
      ...context,
      error: lastError.message,
      errorType: lastError.constructor.name
    });

    throw lastError;
  }

  /**
   * Determine if an error should trigger a retry
   */
  shouldRetry(error, attempt) {
    // Never retry if we've reached max attempts
    if (attempt >= this.maxAttempts) {
      return false;
    }

    // Don't retry client errors (4xx status codes)
    if (error.statusCode && this.nonRetryableStatusCodes.includes(error.statusCode)) {
      return false;
    }

    // Don't retry validation errors
    if (error.name === 'ValidationError') {
      return false;
    }

    // Don't retry authentication/authorization errors
    if (error.name === 'AuthenticationError' || error.name === 'AuthorizationError') {
      return false;
    }

    // Don't retry business logic errors
    if (error.name === 'BusinessLogicError') {
      return false;
    }

    // Always retry these error types
    if (this.isRetryableError(error)) {
      return true;
    }

    // Retry server errors (5xx) and network errors
    if (error.statusCode >= 500 || this.isNetworkError(error)) {
      return true;
    }

    // Retry database and cache errors
    if (error instanceof DatabaseError || error instanceof CacheError) {
      return true;
    }

    // Retry external service errors
    if (error instanceof ExternalServiceError) {
      return true;
    }

    return false;
  }

  /**
   * Check if error is in the retryable errors list
   */
  isRetryableError(error) {
    return this.retryableErrors.some(code => 
      error.code === code || 
      error.message.includes(code) ||
      (error.originalError && error.originalError.code === code)
    );
  }

  /**
   * Check if error is a network-related error
   */
  isNetworkError(error) {
    const networkErrorIndicators = [
      'network', 'connection', 'timeout', 'dns', 'socket',
      'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'
    ];

    return networkErrorIndicators.some(indicator =>
      error.message.toLowerCase().includes(indicator.toLowerCase()) ||
      error.code === indicator
    );
  }

  /**
   * Get reason why retry was not attempted
   */
  getNoRetryReason(error, attempt) {
    if (attempt >= this.maxAttempts) {
      return 'Max attempts reached';
    }

    if (error.statusCode && this.nonRetryableStatusCodes.includes(error.statusCode)) {
      return `Non-retryable status code: ${error.statusCode}`;
    }

    if (['ValidationError', 'AuthenticationError', 'AuthorizationError', 'BusinessLogicError'].includes(error.name)) {
      return `Non-retryable error type: ${error.name}`;
    }

    return 'Error type not eligible for retry';
  }

  /**
   * Calculate delay for next retry using exponential backoff with jitter
   */
  calculateDelay(attempt) {
    let delay = this.baseDelay * Math.pow(this.exponentialBase, attempt - 1);
    
    // Apply maximum delay cap
    delay = Math.min(delay, this.maxDelay);

    // Add jitter to prevent thundering herd
    if (this.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * Delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retry wrapper function
   */
  wrap(operation, context = {}) {
    return (...args) => this.execute(() => operation(...args), context);
  }
}

/**
 * Predefined retry configurations for common scenarios
 */
const RetryConfigs =  {
  // Fast retry for cache operations
  cache: {
    maxAttempts: 2,
    baseDelay: 100,
    maxDelay: 1000,
    exponentialBase: 2
  },

  // Standard retry for database operations
  database: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBase: 2
  },

  // Aggressive retry for external services
  external: {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    exponentialBase: 2
  },

  // Conservative retry for file operations
  file: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    exponentialBase: 1.5
  },

  // Quick retry for real-time operations
  realtime: {
    maxAttempts: 2,
    baseDelay: 50,
    maxDelay: 200,
    exponentialBase: 2,
    jitter: false
  }
};

/**
 * Factory function to create retry handlers with predefined configs
 */
export function createRetryHandler(configName = 'database', overrides = {}) {
  const config = RetryConfigs[configName] || RetryConfigs.database;
  return new RetryHandler({ ...config, ...overrides });
}

/**
 * Decorator function for adding retry behavior to methods
 */
export function withRetry(configName = 'database', overrides = {}) {
  const retryHandler = createRetryHandler(configName, overrides);
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    if (typeof originalMethod !== 'function') return descriptor;

    descriptor.value = async function (...args) {
      const methodContext = {
        class: this?.constructor?.name || target?.constructor?.name || 'UnknownClass',
        method: propertyKey
      };
      return retryHandler.execute(() => originalMethod.apply(this, args), methodContext);
    };

    return descriptor;
  };
}

// Default retry handler instance
export default new RetryHandler();
