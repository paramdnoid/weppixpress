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
function validateFile(file: any, callback: any, options: any = {}) {
  const {
    useWhitelist = true, // Default to whitelist for security
    allowedTypes = ALLOWED_EXTENSIONS,
    blockedTypes = BLOCKED_EXTENSIONS,
    maxFileSize = 100 * 1024 * 1024 // 100MB default
  } = options;

  try {
    // Basic file validation
    if (!file || !file.originalname || !file.buffer) {
      return callback(new ValidationError('Invalid file data'), false);
    }

    // Filename validation
    if (file.originalname.length > 255) {
      return callback(new ValidationError('Filename too long'), false);
    }

    // File size validation
    if (file.size > maxFileSize) {
      return callback(new ValidationError(`File size exceeds maximum allowed size`), false);
    }

    // Dangerous filename patterns
    const dangerousPatterns = [
      /\.\./g,           // Path traversal
      /\//g,             // Directory separators  
      /\\/g,             // Windows path separators
      /[<>:"|?*]/g,      // Invalid filename characters
      /\x00/g,           // Null bytes
      /^\./,             // Hidden files
      /~$/,              // Temp files
      /\.(tmp|temp)$/i,  // Temporary files
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i // Windows reserved names
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(file.originalname)) {
        return callback(new ValidationError('Invalid filename format'), false);
      }
    }

    // Extract file extension safely
    const nameParts = file.originalname.toLowerCase().split('.');
    if (nameParts.length < 2) {
      return callback(new ValidationError('Files must have an extension'), false);
    }
    
    const fileExtension = '.' + nameParts.pop();

    // Check for double extensions (e.g. file.txt.exe)
    if (nameParts.length > 0) {
      const secondExtension = '.' + nameParts[nameParts.length - 1];
      if (BLOCKED_EXTENSIONS.includes(secondExtension)) {
        return callback(new ValidationError('Double file extensions not allowed'), false);
      }
    }

    // Whitelist mode (recommended for production)
    if (useWhitelist) {
      if (!allowedTypes.includes(fileExtension)) {
        return callback(new ValidationError(`File type ${fileExtension} not allowed`), false);
      }
    } else {
      // Blacklist mode
      if (BLOCKED_MIME_TYPES.includes(file.mimetype) ||
        blockedTypes.includes(fileExtension)) {
        return callback(new ValidationError('File type not allowed for security reasons'), false);
      }
    }

    // MIME type validation (cross-check with extension)
    if (file.mimetype) {
      const suspiciousMimeTypes = [
        'application/octet-stream', // Generic binary
        'text/plain'               // Could hide executables
      ];
      
      // Be extra careful with suspicious MIME types
      if (suspiciousMimeTypes.includes(file.mimetype) && useWhitelist) {
        // Only allow if extension is explicitly whitelisted
        if (!allowedTypes.includes(fileExtension)) {
          return callback(new ValidationError('MIME type and extension mismatch'), false);
        }
      }
    }

    // Magic byte validation for common file types
    if (file.buffer && file.buffer.length >= 4) {
      const magicBytes = Array.from(file.buffer.slice(0, 4))
        .map((byte: any) => byte.toString(16).padStart(2, '0'))
        .join('');
      
      // Check for executable signatures
      const executableSignatures = [
        '4d5a',     // PE/MZ executable
        '7f454c46', // ELF executable  
        'cafebabe', // Java class file
        '504b0304', // ZIP/JAR (could contain executables)
        'ff',       // Many executable formats start with 0xFF
      ];

      if (executableSignatures.some(sig => magicBytes.startsWith(sig))) {
        return callback(new ValidationError('File appears to be executable'), false);
      }
    }

    callback(null, true);
  } catch (error) {
    callback(new ValidationError(`File validation failed: ${error.message}`), false);
  }
}

/**
 * Express/Multer-compatible file filter (configurable)
 */
function fileFilter(options = {}) {
  return (_req, file, cb) => validateFile(file, cb, options);
}

/**
 * Strict file filter for critical areas (whitelist only)
 */
function strictFileFilter(_req, file, cb) {
  return validateFile(file, cb, { useWhitelist: true });
}

export { fileFilter, strictFileFilter };

export default fileFilter;
