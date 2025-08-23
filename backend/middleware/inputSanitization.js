import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import validator from 'validator';
import logger from '../utils/logger.js';

/**
 * Erweiterte Input-Sanitization Middleware
 */

// Gefährliche Patterns für verschiedene Angriffe
const SECURITY_PATTERNS = {
  // SQL Injection
  sqlInjection: [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
    /(\bOR\b|\bAND\b)\s*\d+\s*=\s*\d+/i,
    /'\s*(OR|AND)\s*'[^']*'/i,
    /;\s*(DROP|DELETE|UPDATE|INSERT)/i
  ],

  // NoSQL Injection
  noSqlInjection: [
    /\$where/i,
    /\$ne/i,
    /\$in/i,
    /\$nin/i,
    /\$exists/i,
    /\$regex/i,
    /\$gt/i,
    /\$gte/i,
    /\$lt/i,
    /\$lte/i
  ],

  // XSS Patterns
  xssPatterns: [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi
  ],

  // Command Injection
  commandInjection: [
    /;\s*(rm|del|format|fdisk)/i,
    /\|\s*(nc|netcat|curl|wget)/i,
    /`.*`/,
    /\$\(.*\)/,
    /&&\s*(rm|del)/i,
    /\|\|\s*(rm|del)/i
  ],

  // Path Traversal
  pathTraversal: [
    /\.\.[\/\\]/,
    /~[\/\\]/,
    /\x00/,
    /\%2e\%2e/i,
    /\%c0\%ae/i,
    /\%252e\%252e/i
  ],

  // LDAP Injection
  ldapInjection: [
    /\(\s*\|\s*\(/,
    /\)\s*\(\s*\|/,
    /\*\s*\)\s*\(/,
    /\(\s*cn\s*=/i,
    /\(\s*\|\s*\(\s*objectclass\s*=/i
  ]
};

/**
 * Prüft Text auf gefährliche Patterns
 * @param {string} input - Input string
 * @param {string} context - Context für Logging
 * @returns {Object} Ergebnis der Prüfung
 */
function detectMaliciousPatterns(input, context = 'unknown') {
  if (!input || typeof input !== 'string') {
    return { isSafe: true, threats: [] };
  }

  const threats = [];
  const inputLower = input.toLowerCase();

  // Prüfe alle Pattern-Kategorien
  Object.entries(SECURITY_PATTERNS).forEach(([category, patterns]) => {
    patterns.forEach((pattern, index) => {
      if (pattern.test(input) || pattern.test(inputLower)) {
        threats.push({
          category,
          pattern: pattern.toString(),
          index,
          severity: getSeverity(category)
        });
      }
    });
  });

  const isSafe = threats.length === 0;

  if (!isSafe) {
    logger.warn(`Malicious patterns detected in ${context}:`, {
      threats: threats.map(t => `${t.category}:${t.index}`),
      inputLength: input.length,
      context
    });
  }

  return { isSafe, threats };
}

/**
 * Bestimmt Schweregrad basierend auf Kategorie
 */
function getSeverity(category) {
  const severityMap = {
    sqlInjection: 'critical',
    noSqlInjection: 'critical', 
    commandInjection: 'critical',
    xssPatterns: 'high',
    pathTraversal: 'high',
    ldapInjection: 'medium'
  };
  
  return severityMap[category] || 'low';
}

/**
 * Sanitisiert String-Eingaben
 * @param {string} input - Input string
 * @param {Object} options - Sanitization options
 */
function sanitizeString(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return input;
  }

  let sanitized = input;

  // HTML-Tags entfernen (falls nicht erlaubt)
  if (options.stripHtml !== false) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Null bytes entfernen
  sanitized = sanitized.replace(/\x00/g, '');

  // Kontrollzeichen entfernen
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // SQL-Sonderzeichen escapen
  if (options.escapeSql !== false) {
    sanitized = sanitized.replace(/'/g, "''");
    sanitized = sanitized.replace(/"/g, '""');
  }

  // Trim
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validiert und sanitisiert Email-Adressen
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const sanitized = validator.normalizeEmail(email.trim().toLowerCase());
  
  if (!validator.isEmail(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Validiert und sanitisiert URLs
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  
  if (!validator.isURL(trimmed, { protocols: ['http', 'https'] })) {
    return null;
  }

  return trimmed;
}

/**
 * Rekursive Objekt-Sanitization
 */
function sanitizeObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  const sanitized = {};
  
  Object.keys(obj).forEach(key => {
    // Schlüssel prüfen
    const keyCheck = detectMaliciousPatterns(key, 'object-key');
    if (!keyCheck.isSafe && options.strict) {
      logger.warn(`Malicious key detected: ${key}`);
      return;
    }

    const value = obj[key];
    
    if (typeof value === 'string') {
      const valueCheck = detectMaliciousPatterns(value, `object-value-${key}`);
      
      if (!valueCheck.isSafe) {
        if (options.strict) {
          // In strict mode: Wert ablehnen
          logger.warn(`Malicious value rejected for key: ${key}`);
          return;
        } else {
          // Sanitisieren
          sanitized[key] = sanitizeString(value, options);
        }
      } else {
        sanitized[key] = value;
      }
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * Express Middleware für erweiterte Input-Sanitization
 */
export const enhancedSanitization = (options = {}) => {
  const config = {
    strict: options.strict || false,
    logThreats: options.logThreats !== false,
    maxStringLength: options.maxStringLength || 10000,
    maxObjectDepth: options.maxObjectDepth || 10,
    ...options
  };

  return (req, res, next) => {
    try {
      // Request Body sanitization
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, config);
      }

      // Query Parameters sanitization  
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query, config);
      }

      // Headers prüfen
      const userAgent = req.get('User-Agent') || '';
      const referer = req.get('Referer') || '';
      
      const userAgentCheck = detectMaliciousPatterns(userAgent, 'user-agent');
      const refererCheck = detectMaliciousPatterns(referer, 'referer');

      if (!userAgentCheck.isSafe || !refererCheck.isSafe) {
        if (config.strict) {
          return res.status(400).json({ 
            error: 'Invalid request headers',
            code: 'MALICIOUS_INPUT'
          });
        } else {
          logger.warn('Malicious patterns in headers', {
            userAgent: !userAgentCheck.isSafe,
            referer: !refererCheck.isSafe,
            ip: req.ip
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Input sanitization error:', error);
      res.status(500).json({ error: 'Input validation failed' });
    }
  };
};

/**
 * Standard Security Middleware Stack
 */
export const securityMiddlewareStack = [
  // XSS Protection
  xss(),
  
  // NoSQL Injection Protection
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ key, req }) => {
      logger.warn(`NoSQL injection attempt blocked: ${key}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
  }),

  // HTTP Parameter Pollution Protection
  hpp({
    whitelist: ['sort', 'filter', 'page', 'limit', 'fields', 'tags']
  }),

  // Enhanced custom sanitization
  enhancedSanitization({ strict: false, logThreats: true })
];

/**
 * Strict Security Middleware für kritische Endpoints
 */
export const strictSecurityMiddleware = [
  xss(),
  mongoSanitize({ replaceWith: '_' }),
  hpp(),
  enhancedSanitization({ strict: true, logThreats: true })
];

/**
 * Utility Funktionen für manuelle Validierung
 */
export const InputValidator = {
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeObject,
  detectMaliciousPatterns,
  
  // Spezielle Validatoren
  isValidFilename: (filename) => {
    if (!filename || typeof filename !== 'string') return false;
    const check = detectMaliciousPatterns(filename, 'filename');
    return check.isSafe && !/[<>:"|?*\x00-\x1F]/g.test(filename);
  },

  isValidPath: (path) => {
    if (!path || typeof path !== 'string') return false;
    const check = detectMaliciousPatterns(path, 'path');
    return check.isSafe && !path.includes('..');
  },

  isValidUserId: (userId) => {
    if (!userId) return false;
    const str = String(userId);
    return validator.isAlphanumeric(str) && str.length <= 50;
  }
};

export { SECURITY_PATTERNS };