import { ExternalServiceError } from './errors.js';
import logger from './logger.js';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  recoveryTimeout?: number;
  monitoringPeriod?: number;
  serviceName?: string;
}

interface CircuitMetrics {
  serviceName: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  totalFailures: number;
  failureRate: number;
  lastFailureTime: number | null;
}

/**
 * Circuit breaker pattern implementation to prevent cascading failures
 * when external services are unavailable
 */
class CircuitBreaker {
  public readonly failureThreshold: number;
  public readonly recoveryTimeout: number;
  public readonly monitoringPeriod: number;
  public readonly serviceName: string;

  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private successCount = 0;

  private totalRequests = 0;
  private totalFailures = 0;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.recoveryTimeout = options.recoveryTimeout ?? 60_000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod ?? 10_000; // 10 seconds
    this.serviceName = options.serviceName ?? 'unknown';

    logger.info(`Circuit breaker initialized for ${this.serviceName}`, {
      failureThreshold: this.failureThreshold,
      recoveryTimeout: this.recoveryTimeout
    });
  }

  /** Execute a function with circuit breaker protection */
  async execute<T, F = T>(
    operation: () => Promise<T> | T,
    fallback: ((err: Error) => F) | F | null = null
  ): Promise<T | F> {
    this.totalRequests++;

    // If circuit is open, check if recovery timeout has passed
    if (this.state === 'OPEN') {
      if (this.lastFailureTime !== null && Date.now() - this.lastFailureTime > this.recoveryTimeout) {
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
    } catch (error: unknown) {
      return this.onFailure(error, fallback);
    }
  }

  /** Handle successful operation */
  private onSuccess<T>(result: T): T {
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

  /** Handle failed operation */
  private onFailure<F>(error: unknown, fallback: ((err: Error) => F) | F | null): never | F {
    const err = error instanceof Error ? error : new Error(String(error));
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    logger.warn(`Circuit breaker for ${this.serviceName} recorded failure`, {
      failureCount: this.failureCount,
      error: err.message
    });

    // If failure threshold exceeded, open the circuit
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.error(`Circuit breaker for ${this.serviceName} OPENED due to repeated failures`, {
        failureCount: this.failureCount,
        threshold: this.failureThreshold
      });
    }

    if (fallback !== null) {
      return typeof fallback === 'function' ? (fallback as (e: Error) => F)(err) : (fallback as F);
    }

    throw new ExternalServiceError(
      `Service ${this.serviceName} is experiencing issues: ${err.message}`,
      this.serviceName
    );
  }

  /** Handle circuit open state */
  private handleCircuitOpen<F>(fallback: ((err: Error) => F) | F | null): F {
    const error = new ExternalServiceError(
      `Circuit breaker for ${this.serviceName} is OPEN`,
      this.serviceName
    );

    logger.debug(`Using fallback for ${this.serviceName} due to open circuit`);
    return typeof fallback === 'function' ? (fallback as (e: Error) => F)(error) : (fallback as F);
  }

  /** Get circuit breaker metrics */
  getMetrics(): CircuitMetrics {
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

  /** Expose current state without allowing mutation */
  getState(): CircuitState {
    return this.state;
  }

  /** Reset circuit breaker to initial state */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;

    logger.info(`Circuit breaker for ${this.serviceName} manually reset`);
  }

  /** Check if circuit breaker is healthy */
  isHealthy(): boolean {
    return this.state === 'CLOSED' || this.state === 'HALF_OPEN';
  }
}

/** Circuit breaker registry for managing multiple service breakers */
class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /** Get or create a circuit breaker for a service */
  getBreaker(serviceName: string, options: CircuitBreakerOptions = {}): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(
        serviceName,
        new CircuitBreaker({
          ...options,
          serviceName
        })
      );
    }
    // non-null because just set when missing
    return this.breakers.get(serviceName)!;
  }

  /** Execute operation with circuit breaker protection */
  async execute<T, F = T>(
    serviceName: string,
    operation: () => Promise<T> | T,
    fallback: ((err: Error) => F) | F | null = null,
    options: CircuitBreakerOptions = {}
  ): Promise<T | F> {
    const breaker = this.getBreaker(serviceName, options);
    return breaker.execute<T, F>(operation, fallback);
  }

  /** Get metrics for all circuit breakers */
  getAllMetrics(): Record<string, CircuitMetrics> {
    const metrics: Record<string, CircuitMetrics> = {};
    for (const [serviceName, breaker] of this.breakers) {
      metrics[serviceName] = breaker.getMetrics();
    }
    return metrics;
  }

  /** Reset all circuit breakers */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /** Get health status of all services */
  getHealthStatus(): Record<string, { healthy: boolean; state: CircuitState }> {
    const status: Record<string, { healthy: boolean; state: CircuitState }> = {};
    for (const [serviceName, breaker] of this.breakers) {
      status[serviceName] = {
        healthy: breaker.isHealthy(),
        state: breaker.getState()
      };
    }
    return status;
  }
}

// Export singleton instance
export default new CircuitBreakerRegistry();
