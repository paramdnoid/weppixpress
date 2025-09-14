import { ExternalServiceError } from './errors.js';
import logger from './logger.js';

/**
 * Circuit breaker pattern implementation to prevent cascading failures
 * when external services are unavailable
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    this.serviceName = options.serviceName || 'unknown';
    
    // Circuit breaker state
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    
    // Metrics
    this.totalRequests = 0;
    this.totalFailures = 0;
    
    logger.info(`Circuit breaker initialized for ${this.serviceName}`, {
      failureThreshold: this.failureThreshold,
      recoveryTimeout: this.recoveryTimeout
    });
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} operation - The operation to execute
   * @param {*} fallback - Fallback value/function to use when circuit is open
   */
  async execute(operation, fallback = null) {
    this.totalRequests++;

    // If circuit is open, check if recovery timeout has passed
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info(`Circuit breaker for ${this.serviceName} moved to HALF_OPEN state`);
      } else {
        return this.handleCircuitOpen(fallback);
      }
    }

    try {
      const result = await operation();
      return this.onSuccess(result);
    } catch (error) {
      return this.onFailure(error, fallback);
    }
  }

  /**
   * Handle successful operation
   */
  onSuccess(result) {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      // If we have enough successful calls in half-open state, close the circuit
      if (this.successCount >= Math.ceil(this.failureThreshold / 2)) {
        this.state = 'CLOSED';
        logger.info(`Circuit breaker for ${this.serviceName} recovered to CLOSED state`);
      }
    }

    return result;
  }

  /**
   * Handle failed operation
   */
  onFailure(error, fallback) {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    logger.warn(`Circuit breaker for ${this.serviceName} recorded failure`, {
      failureCount: this.failureCount,
      error: error.message
    });

    // If failure threshold exceeded, open the circuit
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.error(`Circuit breaker for ${this.serviceName} OPENED due to repeated failures`, {
        failureCount: this.failureCount,
        threshold: this.failureThreshold
      });
    }

    // If we have a fallback, use it; otherwise rethrow
    if (fallback !== null) {
      return typeof fallback === 'function' ? fallback(error) : fallback;
    }

    throw new ExternalServiceError(
      `Service ${this.serviceName} is experiencing issues: ${error.message}`,
      this.serviceName
    );
  }

  /**
   * Handle circuit open state
   */
  handleCircuitOpen(fallback) {
    const error = new ExternalServiceError(
      `Circuit breaker for ${this.serviceName} is OPEN`,
      this.serviceName
    );

    if (fallback !== null) {
      logger.debug(`Using fallback for ${this.serviceName} due to open circuit`);
      return typeof fallback === 'function' ? fallback(error) : fallback;
    }

    throw error;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      failureRate: this.totalRequests > 0 ? this.totalFailures / this.totalRequests : 0,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    
    logger.info(`Circuit breaker for ${this.serviceName} manually reset`);
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy() {
    return this.state === 'CLOSED' || this.state === 'HALF_OPEN';
  }
}

/**
 * Circuit breaker registry for managing multiple service breakers
 */
class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(serviceName, options = {}) {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(
        serviceName,
        new CircuitBreaker({
          ...options,
          serviceName
        })
      );
    }
    return this.breakers.get(serviceName);
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute(serviceName, operation, fallback = null, options = {}) {
    const breaker = this.getBreaker(serviceName, options);
    return breaker.execute(operation, fallback);
  }

  /**
   * Get metrics for all circuit breakers
   */
  getAllMetrics() {
    const metrics = {};
    for (const [serviceName, breaker] of this.breakers) {
      metrics[serviceName] = breaker.getMetrics();
    }
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Get health status of all services
   */
  getHealthStatus() {
    const status = {};
    for (const [serviceName, breaker] of this.breakers) {
      status[serviceName] = {
        healthy: breaker.isHealthy(),
        state: breaker.state
      };
    }
    return status;
  }
}

// Export singleton instance
export default new CircuitBreakerRegistry();