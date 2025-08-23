# Error Handling Documentation

## Overview

The WeppixPress backend implements a comprehensive, enterprise-grade error handling system designed for reliability, observability, and maintainability. This document outlines the architecture, patterns, and best practices used throughout the application.

## Architecture Components

### 1. Custom Error Classes (`utils/errors.js`)

The application defines specific error types that extend the base `AppError` class:

```javascript
// Base error class
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

// Specialized error types
class ValidationError extends AppError
class AuthenticationError extends AppError
class AuthorizationError extends AppError
class NotFoundError extends AppError
class ConflictError extends AppError
class RateLimitError extends AppError
class DatabaseError extends AppError
class CacheError extends AppError
class FileSystemError extends AppError
class ExternalServiceError extends AppError
class ConfigurationError extends AppError
class SecurityError extends AppError
class BusinessLogicError extends AppError
```

### 2. Error Handler Middleware (`middleware/errorHandler.js`)

Central error processing with:
- Error type detection and transformation
- Standardized response formatting
- Request context logging
- Error metrics recording
- Environment-specific error details

### 3. Circuit Breaker Pattern (`utils/circuitBreaker.js`)

Prevents cascading failures when external services are unavailable:

```javascript
// Usage example
const result = await circuitBreakerRegistry.execute(
  'external-api',
  () => apiCall(),
  fallbackValue,
  { failureThreshold: 5, recoveryTimeout: 60000 }
);
```

**States:**
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Service is failing, requests are blocked
- **HALF_OPEN**: Testing recovery, limited requests allowed

### 4. Retry Handler (`utils/retryHandler.js`)

Intelligent retry logic with exponential backoff:

```javascript
const retryHandler = createRetryHandler('database', {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000
});

const result = await retryHandler.execute(() => databaseOperation());
```

**Retry Configurations:**
- `cache`: Fast retry (2 attempts, 100ms base delay)
- `database`: Standard retry (3 attempts, 1s base delay)
- `external`: Aggressive retry (5 attempts, 2s base delay)
- `file`: Conservative retry (3 attempts, 500ms base delay)
- `realtime`: Quick retry (2 attempts, 50ms base delay)

### 5. Error Metrics Service (`services/errorMetricsService.js`)

Tracks and analyzes error patterns:

- Error occurrence tracking
- Rate calculation and alerting
- Top error identification
- Trend analysis
- Health status determination

**Alert Conditions:**
- High error rate (>10% by default)
- High error count (>50 errors in 5 minutes)
- Critical errors (>5 non-operational errors)

### 6. Advanced Health Service (`services/advancedHealthService.js`)

Comprehensive dependency monitoring:

- Dependency registration and tracking
- Continuous health monitoring
- Circuit breaker integration
- Trend analysis and reporting
- Critical vs non-critical dependency classification

## Error Handling Patterns

### 1. Controller Pattern

```javascript
export const someController = async (req, res, next) => {
  try {
    // Business logic here
    const result = await someService.operation();
    res.json(result);
  } catch (error) {
    // Error is automatically handled by error middleware
    next(error);
  }
};
```

### 2. Service Pattern

```javascript
export class SomeService {
  async operation() {
    try {
      const result = await externalCall();
      return result;
    } catch (error) {
      // Transform to appropriate error type
      throw new ExternalServiceError(
        `Service unavailable: ${error.message}`,
        'external-service'
      );
    }
  }
}
```

### 3. Middleware Pattern

```javascript
export const someMiddleware = (req, res, next) => {
  try {
    // Middleware logic
    validateRequest(req);
    next();
  } catch (error) {
    // Pass error to error handler
    next(error);
  }
};
```

## Error Response Format

All errors are returned in a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "uuid-v4",
    "stack": "Stack trace (development only)"
  },
  "details": {
    "field": "Specific field errors (for validation)",
    "context": "Additional context information"
  }
}
```

## Request Correlation

Every request is assigned correlation IDs for distributed tracing:

- **Request ID**: Unique identifier for each request
- **Correlation ID**: Traces requests across service boundaries
- Both IDs are included in:
  - Response headers (`X-Request-ID`, `X-Correlation-ID`)
  - Log entries
  - Error reports
  - Metrics

## Monitoring Endpoints

### System Health
```
GET /api/system/health
```
Returns overall system health status with dependency checks.

### Error Metrics
```
GET /api/system/errors?timeWindow=3600000
```
Returns error metrics for the specified time window (default: 1 hour).

### Circuit Breaker Status
```
GET /api/system/circuit-breakers
```
Returns status of all circuit breakers.

### Circuit Breaker Reset
```
POST /api/system/circuit-breakers/reset
Body: { "serviceName": "optional-service-name" }
```
Resets circuit breakers (all or specific service).

### Performance Metrics
```
GET /api/system/metrics?range=last_hour
```
Returns system performance metrics.

## Best Practices

### 1. Error Classification

- **Operational Errors**: Expected errors that don't indicate bugs
  - Network timeouts
  - Validation failures
  - Authentication failures
- **Programmer Errors**: Bugs that should be fixed
  - Undefined variables
  - Wrong function arguments
  - Logic errors

### 2. Error Throwing Guidelines

```javascript
// Good: Specific error with context
throw new ValidationError('Email format is invalid', [{
  field: 'email',
  message: 'Must be a valid email address',
  value: userInput.email
}]);

// Bad: Generic error without context
throw new Error('Invalid input');
```

### 3. Logging Best Practices

- Always log errors with sufficient context
- Include request IDs for traceability
- Log at appropriate levels (error, warn, info, debug)
- Avoid logging sensitive information

```javascript
logger.error('Database operation failed', {
  operation: 'getUserById',
  userId: userId,
  error: error.message,
  requestId: req.requestId,
  correlationId: req.correlationId
});
```

### 4. Service Integration

When integrating with external services:

1. Use circuit breakers to prevent cascading failures
2. Implement appropriate retry strategies
3. Provide meaningful fallback values
4. Monitor service health continuously

```javascript
const result = await circuitBreakerRegistry.execute(
  'payment-service',
  () => paymentService.charge(amount),
  { status: 'deferred', message: 'Payment will be processed later' }
);
```

### 5. Testing Error Scenarios

- Test all error paths
- Verify error response formats
- Test circuit breaker behavior
- Validate retry logic
- Check metrics recording

## Configuration

### Environment Variables

```bash
# Error Metrics
ERROR_RATE_WARNING=0.05
ERROR_RATE_CRITICAL=0.1
ERROR_COUNT_THRESHOLD=50

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60000

# Retry Configuration
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY=1000
RETRY_MAX_DELAY=30000

# Health Checks
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# Monitoring
MONITORING_ENABLED=true
MONITORING_RETENTION=100
```

### Service Registration

Register dependencies for health monitoring:

```javascript
import advancedHealthService from './services/advancedHealthService.js';

// Register critical dependency
advancedHealthService.registerDependency(
  'database',
  () => databaseService.healthCheck(),
  { 
    critical: true, 
    timeout: 5000,
    metadata: { connection: 'primary' }
  }
);

// Start monitoring
advancedHealthService.start();
```

## Alerting Integration

The error metrics service supports integration with external alerting systems:

```javascript
// Example: Slack integration
async sendSlackAlert(alert) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 ${alert.type}: ${alert.details.message}`,
      attachments: [{
        color: alert.severity === 'CRITICAL' ? 'danger' : 'warning',
        fields: [
          { title: 'Error Rate', value: `${alert.details.errorRate}%`, short: true },
          { title: 'Time Window', value: `${alert.details.timeWindow} min`, short: true }
        ]
      }]
    })
  });
}
```

## Troubleshooting

### High Error Rates

1. Check error metrics: `GET /api/system/errors`
2. Identify top errors and their patterns
3. Check circuit breaker status
4. Review service health status
5. Check external service dependencies

### Circuit Breaker Issues

1. Check breaker status: `GET /api/system/circuit-breakers`
2. Review failure patterns in logs
3. Verify service health
4. Reset breakers if needed: `POST /api/system/circuit-breakers/reset`

### Performance Degradation

1. Check system metrics: `GET /api/system/metrics`
2. Monitor error trends
3. Review retry patterns
4. Check resource utilization
5. Analyze slow requests

## Migration Guide

When migrating from simple error handling to this comprehensive system:

1. Replace generic `Error` throws with specific error classes
2. Add circuit breakers to external service calls
3. Implement retry logic for transient failures
4. Register health check dependencies
5. Update error handling tests
6. Configure monitoring and alerting

This error handling system provides robust, observable, and maintainable error management for production applications.