import errorMetricsService from '../services/errorMetricsService.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';

function errorHandler(err, req, res, _next) {
  // Ensure we always have a status code
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const isAppError = err instanceof AppError || err.isOperational === true;
  const env = process.env.NODE_ENV || 'development';

  // Build a safe payload
  const payload = {
    success: false,
    error: {
      message: isAppError ? err.message : (env === 'development' ? err.message : 'Internal Server Error'),
      code: isAppError && err.code ? err.code : 'INTERNAL_SERVER_ERROR'
    }
  };

  // In development, include stack for easier debugging
  if (env === 'development') {
    payload.error.stack = err.stack;
  }

  // Log the error
  try {
    logger[statusCode >= 500 ? 'error' : 'warn'](
      `${req.method} ${req.originalUrl} -> ${statusCode}: ${err.message}`,
      {
        ip: req.ip,
        userId: req.user?.id,
        statusCode,
        headers: req.headers,
        params: req.params,
        query: req.query,
        bodyKeys: Object.keys(req.body || {}),
        stack: err.stack
      }
    );
  } catch (_) {
    // no-op if logger fails
  }

  // Record metrics (best-effort)
  try {
    errorMetricsService.recordError(err, {
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (_) {
    // ignore metrics errors
  }

  res.status(statusCode).json(payload);
}

function notFound(req, res, next) {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
}

export { errorHandler, notFound };
export default errorHandler;