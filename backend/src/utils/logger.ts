import { createLogger, format, transports, Logger } from 'winston';

// Extended logger interface for custom methods
interface ExtendedLogger extends Logger {
  security: (event: string, details?: any) => void;
  performance: (metric: string, details?: any) => void;
  userActivity: (action: string, userId?: string, details?: any) => void;
}

// Sensitive fields that should never be logged
const SENSITIVE_FIELDS = new Set([
  'password', 'token', 'refreshToken', 'accessToken', 'secret', 'key',
  'authorization', 'cookie', 'session', 'credit_card', 'creditcard',
  'ssn', 'social_security', 'passport', 'driving_license'
]);

// Patterns for sensitive data
const SENSITIVE_PATTERNS = [
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card numbers
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, // JWT Tokens
  /\b[a-f0-9]{64}\b/g, // SHA-256 hashes
  /\b[a-f0-9]{32}\b/g  // MD5 hashes
];

// Sanitize sensitive data
function sanitizeLogData(obj, depth = 0, maxDepth = 5) {
  if (depth > maxDepth || obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    let sanitized = obj;
    SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    return sanitized;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeLogData(item, depth + 1, maxDepth));
  }

  if (typeof obj !== 'object') return obj;

  const sanitized = {};
  Object.keys(obj).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.has(lowerKey) || lowerKey.includes('password')) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey.includes('email') && typeof obj[key] === 'string' && obj[key].includes('@')) {
      const [local, domain] = obj[key].split('@');
      sanitized[key] = local.slice(0, 2) + '***@' + domain;
    } else if (lowerKey === 'ip' && typeof obj[key] === 'string') {
      sanitized[key] = obj[key].replace(/\.\d{1,3}$/, '.***');
    } else {
      sanitized[key] = sanitizeLogData(obj[key], depth + 1, maxDepth);
    }
  });
  return sanitized;
}

// Custom format with sanitization
const sanitizedFormat = format((info) => {
  return {
    ...info,
    ...sanitizeLogData(info)
  };
});

// Central logger configuration
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    sanitizedFormat(),
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack, ...meta }) => {
      let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      
      if (stack && process.env.NODE_ENV !== 'production') {
        logMessage += `\n${stack}`;
      }
      
      if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
      }
      
      return logMessage;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// File transports in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }));
  
  logger.add(new transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB  
    maxFiles: 5,
    tailable: true
  }));

  // Security events log
  logger.add(new transports.File({ 
    filename: 'logs/security.log',
    level: 'warn',
    maxsize: 5242880, // 5MB  
    maxFiles: 10,
    tailable: true
  }));

  // Performance log
  logger.add(new transports.File({ 
    filename: 'logs/performance.log',
    level: 'info',
    maxsize: 5242880, // 5MB  
    maxFiles: 5,
    tailable: true
  }));

  // Server general log
  logger.add(new transports.File({ 
    filename: 'logs/server.log',
    level: 'info',
    maxsize: 5242880, // 5MB  
    maxFiles: 5,
    tailable: true
  }));
}

// Cast logger to extended type and add custom methods
const extendedLogger = logger as ExtendedLogger;

extendedLogger.security = function(event: string, details: any = {}) {
  this.warn(`SECURITY: ${event}`, {
    ...details,
    securityEvent: true,
    event,
    timestamp: new Date().toISOString()
  });
};

extendedLogger.performance = function(metric: string, details: any = {}) {
  this.info(`PERFORMANCE: ${metric}`, {
    ...details,
    performanceMetric: true,
    metric,
    timestamp: new Date().toISOString()
  });
};

extendedLogger.userActivity = function(action: string, userId?: string, details: any = {}) {
  this.info(`User action: ${action}`, {
    user: userId ? 'user_' + String(userId).slice(-4) : 'anonymous',
    action,
    ...details
  });
};

export default extendedLogger;