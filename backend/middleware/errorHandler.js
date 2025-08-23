import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import errorMetricsService from '../services/errorMetricsService.js';

export function errorHandler(err, req, res, _next) {
  let error = { ...err };
  error.message = err.message;

  // Record error metrics
  errorMetricsService.recordError(error, {
    userId: req.user?.id,
    requestId: res.locals?.requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query
  });

  logger.error({
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: res.locals?.requestId
  });

  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new AppError(message, 400);
  }

  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Server Error',
      code: error.code || 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
}

export function notFound(req, res, next) {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
}