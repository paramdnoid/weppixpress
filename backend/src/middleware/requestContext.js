import logger from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Request context middleware for tracking and logging
 */
function requestContext(req, res, next) {
  // Generate a stable request id
  const requestId = req.get('X-Request-ID') || crypto.randomUUID();

  // Generate correlation ID for distributed tracing
  const correlationId = req.get('X-Correlation-ID') || requestId;

  // Store in response locals for access in other middleware/controllers
  res.locals.requestId = requestId;
  res.locals.correlationId = correlationId;

  // Add IDs to response headers
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', correlationId);

  // Add to request for easy access
  req.requestId = requestId;
  req.correlationId = correlationId;

  // Log request start
  const startTime = Date.now();
  logger.info('Request started', {
    requestId,
    correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString()
  });

  // Override res.end to log request completion
  const originalEnd = res.end;
  res.end = function (chunk, encoding, cb) {
    const duration = Date.now() - startTime;

    try {
      logger.info('Request completed', {
        requestId,
        correlationId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('Content-Length'),
        timestamp: new Date().toISOString()
      });
    } catch (_) {
      // logging should never break response
    }

    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}

/**
 * Request size limiter middleware
 */
function requestSizeLimiter(maxSize = '50mb') {
  return (req, res, next) => {

    const contentLength = parseInt(req.get('Content-Length') || '0', 10);
    const maxSizeBytes = parseSize(maxSize);

    if (Number.isFinite(contentLength) && contentLength > maxSizeBytes) {
      logger.warn('Request size exceeded', {
        requestId: res.locals.requestId,
        contentLength,
        maxSize: maxSizeBytes,
        ip: req.ip
      });

      return res.status(413).json({
        success: false,
        message: 'Request entity too large',
        code: 'REQUEST_TOO_LARGE',
        maxSize
      });
    }

    next();
  };
}

/**
 * Request timeout middleware
 */
function requestTimeout(timeout = 30000) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          requestId: res.locals.requestId,
          method: req.method,
          url: req.url,
          timeout,
          ip: req.ip
        });

        res.status(408).json({
          success: false,
          message: 'Request timeout',
          code: 'REQUEST_TIMEOUT'
        });
      }
    }, timeout);

    // Clear timeout when response is sent
    const originalEnd = res.end;
    res.end = function (chunk, encoding, cb) {
      clearTimeout(timer);
      return originalEnd.call(this, chunk, encoding, cb);
    };

    next();
  };
}

/**
 * CORS preflight handler with caching
 */
function corsPreflightHandler(req, res, next) {
  if (req.method === 'OPTIONS') {
    // Cache preflight response for 24 hours
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    logger.debug('CORS preflight handled', {
      requestId: res.locals.requestId,
      origin: req.get('Origin'),
      method: req.get('Access-Control-Request-Method'),
      headers: req.get('Access-Control-Request-Headers')
    });

    return res.status(200).end();
  }

  next();
}

/**
 * API versioning middleware
 */
function apiVersioning(req, res, next) {
  // Extract version from URL path or header
  const urlVersion = req.url.match(/^\/api\/v(\d+)\//)?.[1];
  const headerVersion = req.get('API-Version');
  const acceptVersion = req.get('Accept-Version');

  const version = urlVersion || headerVersion || acceptVersion || '1';

  req.apiVersion = version;
  res.setHeader('API-Version', version);

  logger.debug('API version detected', {
    requestId: res.locals.requestId,
    version,
    source: urlVersion ? 'url' : headerVersion ? 'header' : acceptVersion ? 'accept' : 'default'
  });

  next();
}

/**
 * Request body size parser helper
 */
function parseSize(size) {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
  if (!match) throw new Error(`Invalid size format: ${size}`);

  const [, value, unit = 'b'] = match;
  return Math.floor(parseFloat(value) * units[unit]);
}

export { requestContext, requestTimeout, corsPreflightHandler, apiVersioning, requestSizeLimiter };

export default requestContext;
