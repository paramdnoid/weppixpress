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
function validateFile(file, callback, options = {}) {
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
  } catch {
    callback(new ValidationError('File validation failed'), false);
  }
}

/**
 * Express/Multer-compatible file filter (configurable)
 */
function fileFilter(options = {}) {
  return (req, file, cb) => validateFile(file, cb, options);
}

/**
 * Strict file filter for critical areas (whitelist only)
 */
function strictFileFilter(req, file, cb) {
  return validateFile(file, cb, { useWhitelist: true });
}

export { fileFilter, strictFileFilter };

export default fileFilter;
