import monitoringService from '../services/monitoringService.js';

/**
 * Monitoring middleware to track request metrics
 */
export const requestMonitoring = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Record request metrics
    monitoringService.recordRequest(
      req.method,
      req.path || req.url,
      res.statusCode,
      responseTime,
      res.locals.error || null
    );
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Error monitoring middleware
 */
export const errorMonitoring = (err, req, res, next) => {
  // Store error for monitoring
  res.locals.error = err;
  
  // Record error metrics
  monitoringService.recordRequest(
    req.method,
    req.path || req.url,
    res.statusCode || 500,
    Date.now() - (res.locals.startTime || Date.now()),
    err
  );
  
  next(err);
};

/**
 * Database operation monitoring wrapper
 */
export const monitorDatabaseOperation = async (operation, queryFn) => {
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
};

/**
 * Cache operation monitoring wrapper
 */
export const monitorCacheOperation = async (operation, cacheFn, isReadOperation = true) => {
  try {
    const result = await cacheFn();
    const hit = isReadOperation ? result !== null && result !== undefined : true;
    
    monitoringService.recordCacheOperation(operation, hit);
    return result;
  } catch (error) {
    monitoringService.recordCacheOperation(operation, false, error);
    throw error;
  }
};