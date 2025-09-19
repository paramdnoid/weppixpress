import logger from './logger.js';

/**
 * Centralized HTTP response utilities to reduce code duplication
 * and ensure consistent error handling and response formatting
 */

/**
 * Send a standardized error response
 * @param {import('express').Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details (optional)
 * @param {import('express').Request} req - Express request object (optional, for logging)
 * @returns {import('express').Response} Express response
 */
export function sendErrorResponse(res: any, statusCode: any, message: any, details: any = null, req: any = null) {
  const errorResponse: any = { error: message };
  
  if (details) {
    if (typeof details === 'string') {
      errorResponse.details = details;
    } else if (Array.isArray(details)) {
      errorResponse.errors = details;
    } else {
      errorResponse.details = details;
    }
  }

  // Log error if request context is available
  if (req && statusCode >= 500) {
    logger.error('HTTP Error Response', {
      statusCode,
      message,
      details,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
  }

  return res.status(statusCode).json(errorResponse);
}

/**
 * Send validation error response (400)
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Validation error message
 * @param {Array|Object} validationErrors - Validation errors from express-validator or custom
 * @returns {import('express').Response} Express response
 */
export function sendValidationError(res: any, message: any = 'Validation failed', validationErrors: any = null) {
  const errorResponse: any = { error: message };
  
  if (validationErrors) {
    if (Array.isArray(validationErrors)) {
      errorResponse.errors = validationErrors;
    } else {
      errorResponse.details = validationErrors;
    }
  }
  
  return res.status(400).json(errorResponse);
}

/**
 * Send unauthorized error response (401)
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Unauthorized message
 * @returns {import('express').Response} Express response
 */
export function sendUnauthorizedError(res, message = 'Unauthorized') {
  return res.status(401).json({ error: message });
}

/**
 * Send forbidden error response (403)
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Forbidden message
 * @returns {import('express').Response} Express response
 */
export function sendForbiddenError(res, message = 'Forbidden') {
  return res.status(403).json({ error: message });
}

/**
 * Send not found error response (404)
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Not found message
 * @returns {import('express').Response} Express response
 */
export function sendNotFoundError(res, message = 'Not found') {
  return res.status(404).json({ error: message });
}

/**
 * Send conflict error response (409)
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Conflict message
 * @returns {import('express').Response} Express response
 */
export function sendConflictError(res, message = 'Conflict') {
  return res.status(409).json({ error: message });
}

/**
 * Send internal server error response (500)
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Error message
 * @param {import('express').Request} req - Express request object (optional, for logging)
 * @returns {import('express').Response} Express response
 */
export function sendInternalServerError(res, message = 'Internal server error', req = null) {
  return sendErrorResponse(res, 500, message, null, req);
}

/**
 * Send success response with data
 * @param {import('express').Response} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message (optional)
 * @param {number} statusCode - Status code (defaults to 200)
 * @returns {import('express').Response} Express response
 */
export function sendSuccessResponse(res: any, data: any, message: any = null, statusCode: any = 200) {
  const response: any = { success: true };
  
  if (data !== undefined) {
    response.data = data;
  }
  
  if (message) {
    response.message = message;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Send created response (201)
 * @param {import('express').Response} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 * @returns {import('express').Response} Express response
 */
export function sendCreatedResponse(res, data, message = 'Created successfully') {
  return sendSuccessResponse(res, data, message, 201);
}

/**
 * Handle validation result from express-validator
 * @param {import('express-validator').Result} errors - Validation result
 * @param {import('express').Response} res - Express response object
 * @returns {boolean} True if there are validation errors (response sent)
 */
export function handleValidationErrors(errors, res) {
  if (!errors.isEmpty()) {
    sendValidationError(res, 'Validation failed', errors.array());
    return true;
  }
  return false;
}

/**
 * Wrap async controller function with error handling
 * @param {Function} controllerFn - Async controller function
 * @returns {Function} Wrapped controller function
 */
export function asyncHandler(controllerFn) {
  return (req, res, next) => {
    Promise.resolve(controllerFn(req, res, next)).catch(next);
  };
}

/**
 * Standard try-catch wrapper for controllers
 * @param {Function} operation - Async operation to execute
 * @param {import('express').Response} res - Express response object
 * @param {import('express').Request} req - Express request object
 * @param {Function} next - Express next function
 * @param {string} errorMessage - Custom error message for failures
 * @returns {Promise<*>} Operation result or error response
 */
export async function tryOperation(operation, res, req = null, next = null, errorMessage = 'Operation failed') {
  try {
    return await operation();
  } catch (error) {
    if (error.name === 'ValidationError') {
      return sendValidationError(res, error.message);
    }
    
    logger.error(`Operation failed: ${errorMessage}`, {
      error: error.message,
      stack: error.stack,
      url: req?.originalUrl,
      method: req?.method,
      userId: req?.user?.id
    });
    
    if (next) {
      return next(error);
    }
    
    return sendInternalServerError(res, errorMessage, req);
  }
}