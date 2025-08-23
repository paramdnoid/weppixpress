import { ValidationError } from './errors.js';

// Zentrale File-Filter-Konfiguration
const BLOCKED_MIME_TYPES = [
  'application/x-executable',
  'application/x-msdownload', 
  'application/x-msdos-program',
  'application/x-msi',
  'application/x-bat',
  'application/x-sh',
  'application/octet-stream' // Zusätzlicher Schutz
];

const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.vbs', '.ps1', '.scr', 
  '.com', '.pif', '.jar', '.msi', '.deb', '.rpm'
];

// Erlaubte File Extensions (Whitelist-Ansatz für mehr Sicherheit)
const ALLOWED_EXTENSIONS = [
  // Bilder
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico',
  // Dokumente  
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf',
  // Archive
  '.zip', '.rar', '.7z', '.tar', '.gz',
  // Audio/Video
  '.mp3', '.wav', '.ogg', '.mp4', '.avi', '.mov', '.wmv',
  // Code/Data
  '.json', '.xml', '.csv', '.sql', '.log'
];

/**
 * Zentrale File-Validation Funktion
 * @param {Object} file - Multer file object
 * @param {Function} callback - Multer callback (error, boolean)
 * @param {Object} options - Validation options
 */
export function validateFile(file, callback, options = {}) {
  const {
    useWhitelist = false,
    maxSize = 50 * 1024 * 1024, // 50MB default
    allowedTypes = ALLOWED_EXTENSIONS,
    blockedTypes = BLOCKED_EXTENSIONS
  } = options;

  try {
    // Dateiname-Validierung
    if (!file.originalname || file.originalname.length > 255) {
      return callback(new ValidationError('Invalid filename'), false);
    }

    // Größen-Validierung
    if (file.size > maxSize) {
      return callback(new ValidationError(`File too large. Maximum size: ${maxSize / (1024*1024)}MB`), false);
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
    useWhitelist: process.env.NODE_ENV === 'production',
    maxSize: 100 * 1024 * 1024 // 100MB
  });
};

/**
 * Strict File-Filter für kritische Bereiche
 */
export const strictFileFilter = (req, file, cb) => {
  validateFile(file, cb, {
    useWhitelist: true,
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['.jpg', '.jpeg', '.png', '.pdf', '.txt']
  });
};

export { BLOCKED_MIME_TYPES, BLOCKED_EXTENSIONS, ALLOWED_EXTENSIONS };