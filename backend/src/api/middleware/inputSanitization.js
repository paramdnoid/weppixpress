import logger from '../../shared/utils/logger.js';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import validator from 'validator';
import xss from 'xss-clean';

/**
 * Enhanced Input Sanitization Middleware
 */

// Dangerous patterns for various attack vectors
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
 * Checks text for malicious patterns
 * @param {string} input - Input string
 * @param {string} context - Context for logging
 * @returns {Object} Check result
 */
function detectMaliciousPatterns(input, context = 'unknown') {
  if (!input || typeof input !== 'string') {
    return { isSafe: true, threats: [] };
  }

  const threats = [];
  const inputLower = input.toLowerCase();

  // Check all pattern categories
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
 * Determines severity level based on category
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
 * Sanitizes string inputs
 * @param {string} input - Input string
 * @param {Object} options - Sanitization options
 */
function sanitizeString(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return input;
  }

  let sanitized = input;

  // Remove HTML tags (if not allowed)
  if (options.stripHtml !== false) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\x00/g, '');

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Escape SQL special characters
  if (options.escapeSql !== false) {
    sanitized = sanitized.replace(/'/g, "''");
    sanitized = sanitized.replace(/"/g, '""');
  }

  // Trim
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validates and sanitizes email addresses
 */
function _sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim();
  if (!validator.isEmail(trimmed)) {
    return null;
  }

  // Normalize the email. Keep dots in Gmail but strip subaddresses; normalize googlemail.com
  const normalized = validator.normalizeEmail(trimmed, {
    gmail_remove_dots: false,
    gmail_remove_subaddress: true,
    gmail_convert_googlemaildotcom: true,
    all_lowercase: true
  });

  return normalized || trimmed.toLowerCase();
}

/**
 * Validates and sanitizes URLs
 */
function _sanitizeUrl(url) {
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
 * Recursive object sanitization
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
    // Check keys
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
          // In strict mode: reject value
          logger.warn(`Malicious value rejected for key: ${key}`);
          return;
        } else {
          // Sanitize value
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
 * Express Middleware for enhanced input sanitization
 */
const enhancedSanitization =  (options = {}) => {
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

      // Check headers
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
const standardSecurityMiddleware =  [
  // Prevent NoSQL operator injection in req bodies
  mongoSanitize(),

  // Basic XSS cleaning for input strings in body/query
  xss(),

  // HTTP Parameter Pollution Protection (allow listed keys to repeat)
  hpp({
    whitelist: ['sort', 'filter', 'page', 'limit', 'fields', 'tags']
  }),

  // Enhanced custom sanitization
  enhancedSanitization({ strict: false, logThreats: true })
];

/**
 * Strict Security Middleware for critical endpoints
 */
const _strictSecurityMiddleware =  [
  mongoSanitize({ replaceWith: '_' }),
  xss(),
  hpp({ whitelist: [] }),
  enhancedSanitization({ strict: true, logThreats: true })
];

/**
 * Utility functions for manual validation
 */
const _validators =  {
  isValidFilename: (filename) => {
    if (!filename || typeof filename !== 'string') return false;
    const check = detectMaliciousPatterns(filename, 'filename');
    // Disallow reserved/unsafe characters and path separators
    const invalidChars = /[<>:"|?*\x00-\x1F/\\]/;
    return check.isSafe && !invalidChars.test(filename) && filename.trim().length > 0;
  },

  isValidPath: (pathStr) => {
    if (!pathStr || typeof pathStr !== 'string') return false;
    const check = detectMaliciousPatterns(pathStr, 'path');
    // Basic traversal checks; allow single dots but not parent traversals or nulls
    if (!check.isSafe) return false;
    if (pathStr.includes('..') || /\x00/.test(pathStr)) return false;
    return true;
  },

  isValidUserId: (userId) => {
    if (!userId) return false;
    const str = String(userId);
    return validator.isAlphanumeric(str, 'en-US') && str.length <= 50;
  }
};

// Re-export useful helpers for external modules

export { sanitizeObject };

export const securityMiddlewareStack = standardSecurityMiddleware;
