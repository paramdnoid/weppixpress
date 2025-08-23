import { ValidationError } from './errors.js';

// Zentrale File-Filter-Konfiguration
const BLOCKED_MIME_TYPES = [];

const BLOCKED_EXTENSIONS = [];

// Erlaubte File Extensions (Whitelist-Ansatz für mehr Sicherheit)
const ALLOWED_EXTENSIONS = [];

/**
 * Zentrale File-Validation Funktion
 * @param {Object} file - Multer file object
 * @param {Function} callback - Multer callback (error, boolean)
 * @param {Object} options - Validation options
 */
export function validateFile(file, callback, options = {}) {
  const {
    useWhitelist = false,
    allowedTypes = ALLOWED_EXTENSIONS,
    blockedTypes = BLOCKED_EXTENSIONS
  } = options;

  try {
    // Filename validation
    if (!file.originalname || file.originalname.length > 255) {
      return callback(new ValidationError('Invalid filename'), false);
    }

    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    const fullExtension = '.' + fileExtension;

    // Whitelist-Modus (empfohlen für Production)
    if (useWhitelist) {
      if (!allowedTypes.includes(fullExtension)) {
        return callback(new ValidationError(`File type .${fileExtension} not allowed`), false);
      }
    } else {
      // Blacklist-Modus
      if (BLOCKED_MIME_TYPES.includes(file.mimetype) ||
        blockedTypes.includes(fullExtension)) {
        return callback(new ValidationError('File type not allowed for security reasons'), false);
      }
    }

    // Zusätzliche Sicherheitsprüfungen
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
      return callback(new ValidationError('Invalid filename characters'), false);
    }

    // Null-Byte-Schutz
    if (file.originalname.includes('\x00')) {
      return callback(new ValidationError('Invalid filename format'), false);
    }

    callback(null, true);
  } catch (error) {
    callback(new ValidationError('File validation failed'), false);
  }
}

/**
 * Express-Middleware-kompatible File-Filter
 */
export const fileFilter = (req, file, cb) => {
  validateFile(file, cb, {
    useWhitelist: process.env.NODE_ENV === 'production'
  });
};

/**
 * Strict File-Filter für kritische Bereiche
 */
export const strictFileFilter = (req, file, cb) => {
  validateFile(file, cb, {
    useWhitelist: true,
    allowedTypes: ['.jpg', '.jpeg', '.png', '.pdf', '.txt']
  });
};

export { BLOCKED_MIME_TYPES, BLOCKED_EXTENSIONS, ALLOWED_EXTENSIONS };