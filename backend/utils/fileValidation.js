import { ValidationError } from './errors.js';

// Central file filter configuration
const BLOCKED_MIME_TYPES = [];

const BLOCKED_EXTENSIONS = [];

// Allowed file extensions (whitelist approach for better security)
const ALLOWED_EXTENSIONS = [];

/**
 * Central file validation function
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

    // Whitelist mode (recommended for production)
    if (useWhitelist) {
      if (!allowedTypes.includes(fullExtension)) {
        return callback(new ValidationError(`File type .${fileExtension} not allowed`), false);
      }
    } else {
      // Blacklist mode
      if (BLOCKED_MIME_TYPES.includes(file.mimetype) ||
        blockedTypes.includes(fullExtension)) {
        return callback(new ValidationError('File type not allowed for security reasons'), false);
      }
    }

    // Additional security checks
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
      return callback(new ValidationError('Invalid filename characters'), false);
    }

    // Null byte protection
    if (file.originalname.includes('\x00')) {
      return callback(new ValidationError('Invalid filename format'), false);
    }

    callback(null, true);
  } catch (error) {
    callback(new ValidationError('File validation failed'), false);
  }
}

/**
 * Express middleware compatible file filter
 */
export const fileFilter = (req, file, cb) => { // eslint-disable-line no-unused-vars
  validateFile(file, cb, {
    useWhitelist: process.env.NODE_ENV === 'production'
  });
};

/**
 * Strict file filter for critical areas
 */
export const strictFileFilter = (req, file, cb) => { // eslint-disable-line no-unused-vars
  validateFile(file, cb, {
    useWhitelist: true,
    allowedTypes: ['.jpg', '.jpeg', '.png', '.pdf', '.txt']
  });
};

export { BLOCKED_MIME_TYPES, BLOCKED_EXTENSIONS, ALLOWED_EXTENSIONS };