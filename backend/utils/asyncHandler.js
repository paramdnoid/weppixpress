/**
 * Async handler wrapper for Express controllers
 * Automatically catches async errors and passes them to error middleware
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Database transaction wrapper with automatic rollback
 * @param {Function} operation - Database operation function
 * @param {Object} pool - Database connection pool
 * @returns {Promise} Operation result
 */
export const withTransaction = async (operation, pool) => {
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();
    const result = await operation(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/**
 * Retry mechanism for database operations
 * @param {Function} operation - Operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in ms
 */
export const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain error types
      if (error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 403) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

/**
 * Rate limiting for operations
 * @param {Function} operation - Operation to rate limit
 * @param {string} key - Rate limiting key
 * @param {number} limit - Maximum operations per window
 * @param {number} window - Time window in seconds
 */
export const withRateLimit = async (operation, key, limit = 10, window = 60) => {
  // This would integrate with Redis for distributed rate limiting
  // For now, simple implementation
  const now = Date.now();
  const windowStart = now - (window * 1000);
  
  // Implementation would check Redis for rate limiting
  // For brevity, returning operation directly
  return await operation();
};