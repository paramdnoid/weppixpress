import logger from './logger.js';

/**
 * Sichere Logging-Utilities für GDPR-konformes Logging
 */

// Sensible Felder, die nie geloggt werden sollen
const SENSITIVE_FIELDS = new Set([
  'password',
  'token', 
  'refreshToken',
  'accessToken',
  'secret',
  'key',
  'authorization',
  'cookie',
  'session',
  'credit_card',
  'creditcard',
  'ssn',
  'social_security',
  'passport',
  'driving_license'
]);

// Pattern für sensible Daten
const SENSITIVE_PATTERNS = [
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses (teilweise)
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN format
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, // JWT Tokens
  /\b[a-f0-9]{64}\b/g, // SHA-256 hashes
  /\b[a-f0-9]{32}\b/g  // MD5 hashes
];

/**
 * Ersetzt sensible Daten in einem String
 * @param {string} text - Text zum bereinigen
 * @returns {string} Bereinigter Text
 */
function sanitizeText(text) {
  if (typeof text !== 'string') {
    return text;
  }

  let sanitized = text;

  // Pattern-basierte Bereinigung
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  return sanitized;
}

/**
 * Entfernt oder anonymisiert sensible Felder aus einem Objekt
 * @param {*} obj - Objekt zum bereinigen
 * @param {number} depth - Aktuelle Rekursionstiefe
 * @param {number} maxDepth - Maximale Rekursionstiefe
 * @returns {*} Bereinigtes Objekt
 */
function sanitizeObject(obj, depth = 0, maxDepth = 5) {
  if (depth > maxDepth || obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1, maxDepth));
  }

  if (typeof obj === 'object') {
    const sanitized = {};

    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // Sensible Felder komplett entfernen
      if (SENSITIVE_FIELDS.has(lowerKey) || lowerKey.includes('password')) {
        sanitized[key] = '[REDACTED]';
        return;
      }

      // Spezielle Behandlung für User-IDs (anonymisieren aber nicht entfernen)
      if (lowerKey.includes('userid') || lowerKey.includes('user_id')) {
        sanitized[key] = 'user_' + String(obj[key]).slice(-4); // Nur letzte 4 Zeichen
        return;
      }

      // Email-Adressen teilweise anonymisieren
      if (lowerKey.includes('email')) {
        const email = obj[key];
        if (typeof email === 'string' && email.includes('@')) {
          const [local, domain] = email.split('@');
          sanitized[key] = local.slice(0, 2) + '***@' + domain;
        } else {
          sanitized[key] = '[EMAIL]';
        }
        return;
      }

      // IP-Adressen anonymisieren
      if (lowerKey === 'ip' || lowerKey.includes('address')) {
        const ip = obj[key];
        if (typeof ip === 'string') {
          // IPv4 anonymisieren (letzte Oktett entfernen)
          if (ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
            sanitized[key] = ip.replace(/\.\d{1,3}$/, '.***');
          } else {
            sanitized[key] = '[IP]';
          }
        } else {
          sanitized[key] = obj[key];
        }
        return;
      }

      // Rekursiv für verschachtelte Objekte
      sanitized[key] = sanitizeObject(obj[key], depth + 1, maxDepth);
    });

    return sanitized;
  }

  return obj;
}

/**
 * Erstellt eine bereinigte Log-Message
 * @param {string} message - Log-Message
 * @param {*} data - Zusätzliche Daten
 * @returns {Object} Bereinigte Log-Daten
 */
function createSecureLogData(message, data = {}) {
  return {
    message: sanitizeText(message),
    data: sanitizeObject(data),
    timestamp: new Date().toISOString(),
    level: 'secure'
  };
}

/**
 * Secure Logger Klasse
 */
export class SecureLogger {
  static info(message, data) {
    const secureData = createSecureLogData(message, data);
    logger.info(secureData.message, secureData.data);
  }

  static warn(message, data) {
    const secureData = createSecureLogData(message, data);
    logger.warn(secureData.message, secureData.data);
  }

  static error(message, data) {
    const secureData = createSecureLogData(message, data);
    logger.error(secureData.message, secureData.data);
  }

  static debug(message, data) {
    const secureData = createSecureLogData(message, data);
    logger.debug(secureData.message, secureData.data);
  }

  // Spezielle Security-Events
  static security(event, details = {}) {
    const secureData = createSecureLogData(`SECURITY: ${event}`, details);
    logger.warn(secureData.message, {
      ...secureData.data,
      securityEvent: true,
      event
    });
  }

  // User-Aktivitäten (GDPR-konform)
  static userActivity(action, userId, details = {}) {
    this.info(`User action: ${action}`, {
      user: userId ? 'user_' + String(userId).slice(-4) : 'anonymous',
      action,
      ...sanitizeObject(details)
    });
  }

  // Request-Logging (ohne sensible Daten)
  static request(req, additionalData = {}) {
    this.info('API Request', {
      method: req.method,
      path: req.path,
      ip: req.ip ? req.ip.replace(/\.\d{1,3}$/, '.***') : 'unknown',
      userAgent: req.get('User-Agent')?.slice(0, 100) || 'unknown',
      ...sanitizeObject(additionalData)
    });
  }

  // Error-Logging (ohne Stack Traces in Production)
  static errorWithContext(error, context = {}) {
    const errorData = {
      message: error.message,
      name: error.name,
      context: sanitizeObject(context)
    };

    // Stack Trace nur in Development
    if (process.env.NODE_ENV !== 'production') {
      errorData.stack = error.stack;
    }

    this.error('Application Error', errorData);
  }
}

/**
 * Express Middleware für sicheres Request-Logging
 */
export function secureRequestLogger(options = {}) {
  const config = {
    logRequests: options.logRequests !== false,
    logResponses: options.logResponses !== false,
    logErrors: options.logErrors !== false,
    ...options
  };

  return (req, res, next) => {
    const startTime = Date.now();

    // Log eingehende Requests
    if (config.logRequests) {
      SecureLogger.request(req);
    }

    // Response-Logging
    if (config.logResponses) {
      const originalSend = res.send;
      res.send = function(data) {
        const duration = Date.now() - startTime;
        
        SecureLogger.info('API Response', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          contentLength: res.get('Content-Length') || 0
        });

        return originalSend.call(this, data);
      };
    }

    next();
  };
}

export { sanitizeObject, sanitizeText, SENSITIVE_FIELDS };
export default SecureLogger;