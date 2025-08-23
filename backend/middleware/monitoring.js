import monitoringService from '../services/monitoringService.js';

/**
 * Request monitoring middleware
 * - Captures response time and status
 * - Stores any downstream error in res.locals.error for logging
 */
const requestMonitoring = (req, res, next) => {
  const startTime = Date.now();
  res.locals.startTime = startTime;

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function (chunk, encoding, cb) {
    const responseTime = Date.now() - startTime;

    // Record request metrics
    try {
      monitoringService.recordRequest(
        req.method,
        req.path || req.url,
        res.statusCode,
        responseTime,
        res.locals.error || null
      );
    } catch (_) {
      // best-effort monitoring; never break the response
    }

    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

/**
 * Error monitoring middleware
 * - Saves error on res.locals for the request logger above
 * - Emits a request record flagged with the error
 */
const errorMonitoring = (err, req, res, next) => {
  // Store error for monitoring
  res.locals.error = err;

  // Record error metrics (best-effort)
  try {
    monitoringService.recordRequest(
      req.method,
      req.path || req.url,
      res.statusCode || 500,
      Date.now() - (res.locals.startTime || Date.now()),
      err
    );
  } catch (_) {
    // ignore monitoring failures
  }

  next(err);
};

/**
 * Database operation monitoring wrapper
 * @param {string} operation - e.g. 'users.findByEmail'
 * @param {Function} queryFn - async function performing the DB call
 */
async function withDbMonitoring(operation, queryFn) {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    monitoringService.recordDatabaseOperation(operation, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    monitoringService.recordDatabaseOperation(operation, duration, error);
    throw error;
  }
}

/**
 * Cache operation monitoring wrapper
 * @param {string} operation - e.g. 'cache.get:user:123'
 * @param {boolean} isReadOperation - whether to evaluate a hit/miss based on the result
 * @param {Function} fn - async function that performs the cache call
 */
async function withCacheMonitoring(operation, isReadOperation, fn) {
  try {
    const result = await fn();
    const hit = isReadOperation ? result !== null && result !== undefined : true;
    monitoringService.recordCacheOperation(operation, hit);
    return result;
  } catch (error) {
    monitoringService.recordCacheOperation(operation, false, error);
    throw error;
  }
}

export { requestMonitoring, errorMonitoring };
export default requestMonitoring;