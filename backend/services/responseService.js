/**
 * Standardized response service for consistent API responses
 */

export class ResponseService {
  /**
   * Success response with data
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    });
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code
   * @param {*} details - Additional error details
   */
  static error(res, message = 'An error occurred', statusCode = 500, code = null, details = null) {
    const response = {
      success: false,
      message,
      code,
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    };

    if (details && process.env.NODE_ENV === 'development') {
      response.details = details;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Paginated response
   * @param {Object} res - Express response object
   * @param {Array} items - Array of items
   * @param {Object} pagination - Pagination metadata
   * @param {string} message - Success message
   */
  static paginated(res, items, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data: {
        items,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalItems: pagination.totalItems,
          totalPages: Math.ceil(pagination.totalItems / pagination.limit),
          hasNext: pagination.page < Math.ceil(pagination.totalItems / pagination.limit),
          hasPrev: pagination.page > 1
        }
      },
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    });
  }

  /**
   * Created response for new resources
   * @param {Object} res - Express response object
   * @param {*} data - Created resource data
   * @param {string} message - Success message
   */
  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * No content response
   * @param {Object} res - Express response object
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Validation error response
   * @param {Object} res - Express response object
   * @param {Array} errors - Validation errors
   */
  static validationError(res, errors) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors,
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    });
  }

  /**
   * Unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * Forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static forbidden(res, message = 'Access forbidden') {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * Not found response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404, 'NOT_FOUND');
  }

  /**
   * Rate limit exceeded response
   * @param {Object} res - Express response object
   * @param {number} retryAfter - Seconds until retry allowed
   */
  static rateLimit(res, retryAfter = 60) {
    res.set('Retry-After', retryAfter);
    return this.error(res, 'Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
  }
}