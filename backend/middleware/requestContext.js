import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Request context middleware for tracking and logging
 */
export const requestContext = (req, res, next) => {
  // Generate unique request ID
  const requestId = crypto.randomUUID();
  
  // Store in response locals for access in other middleware/controllers
  res.locals.requestId = requestId;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Log request start
  const startTime = Date.now();
  logger.info('Request started', {
    requestId,
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
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length'),
      timestamp: new Date().toISOString()
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Request size limiter middleware (disabled for unlimited uploads)
 */
export const requestSizeLimiter = (maxSize = 'unlimited') => {
  return (req, res, next) => {
    // Skip size checking for unlimited uploads
    if (maxSize === 'unlimited') {
      return next();
    }
    
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSizeBytes = parseSize(maxSize);
    
    if (contentLength > maxSizeBytes) {
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
        maxSize: maxSize
      });
    }
    
    next();
  };
};

/**
 * Request timeout middleware
 */
export const requestTimeout = (timeout = 30000) => {
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
    res.end = function(chunk, encoding) {
      clearTimeout(timer);
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
};

/**
 * CORS preflight handler with caching
 */
export const corsPreflightHandler = (req, res, next) => {
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
};

/**
 * API versioning middleware
 */
export const apiVersioning = (req, res, next) => {
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
};

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