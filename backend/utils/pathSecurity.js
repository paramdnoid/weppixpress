import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Zentrale Path-Security Utilities
 */

/**
 * Sicherer Path-Resolver mit Directory-Traversal-Schutz
 * @param {string} basePath - Basis-Verzeichnis
 * @param {string} userPath - Benutzer-definierter Pfad  
 * @returns {string} Sicherer absoluter Pfad
 * @throws {Error} Bei unsicherem Pfad
 */
function secureResolve(basePath, userPath) {
  if (!basePath) throw new Error('Base path is required');
  const base = resolve(basePath);
  const target = resolve(base, userPath || '');

  const rel = relative(base, target);
  if (rel.startsWith('..') || rel.includes('..') || target.includes('\x00')) {
    throw new Error('Path traversal detected');
  }
  return target;
}

/**
 * Validiert und normalisiert User-Upload-Directory
 * @param {string|number} userId - User ID
 * @param {string} uploadBaseDir - Base upload directory 
 * @returns {string} Sicherer User-Directory-Pfad
 */
function getUserDirectory(userId, uploadBaseDir) {
  if (!userId || (typeof userId !== 'string' && typeof userId !== 'number')) {
    throw new Error('Invalid user ID provided');
  }
  if (!uploadBaseDir) throw new Error('Upload base directory required');

  // Sanitize user ID (nur alphanumerisch erlaubt)
  const sanitizedUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');

  if (!sanitizedUserId || sanitizedUserId !== String(userId)) {
    throw new Error('Invalid characters in user ID');
  }

  return join(uploadBaseDir, sanitizedUserId);
}

/**
 * Validiert Dateinamen auf gefährliche Zeichen
 * @param {string} filename - Dateiname
 * @returns {boolean} True wenn sicher
 */
function isSafeFilename(filename) {
  if (typeof filename !== 'string' || filename.length === 0 || filename.length > 255) {
    return false;
  }

  // Gefährliche Zeichen und Patterns
  const dangerousPatterns = [
    /[<>:"|?*\x00-\x1F]/,  // Windows-gefährliche Zeichen
    /^\./,                  // Versteckte Dateien
    /\.$/,                  // Endender Punkt
    /\.{2}/,                 // Directory Traversal
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
    /^\s|\s$/,             // Leading/trailing whitespace
  ];

  return !dangerousPatterns.some(pattern => pattern.test(filename));
}

/**
 * Erstellt sicheren relativen Pfad für Client
 * @param {string} basePath - Basis-Verzeichnis
 * @param {string} fullPath - Vollständiger Pfad
 * @returns {string} Sicherer relativer Pfad mit führendem /
 */
function toClientRelativePath(basePath, fullPath) {
  const base = resolve(basePath);
  const target = resolve(fullPath);
  const relativePath = relative(base, target);
  if (relativePath.startsWith('..')) {
    throw new Error('Path outside of base directory');
  }
  // Normalisiere zu Unix-Style Pfad mit führendem /
  return '/' + relativePath.replace(/\\/g, '/');
}

/**
 * Validiert Upload-Pfad Parameter
 * @param {string} path - Upload-Pfad vom Client
 * @returns {string} Bereinigter Pfad
 */
function sanitizeUploadPath(path) {
  if (!path || typeof path !== 'string') {
    return '';
  }

  // Entferne führende/nachfolgende Slashes und normalisiere
  return path
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+\/+/g, '/')
    .replace(/[<>:"|?*\x00-\x1F]/g, '') // Gefährliche Zeichen entfernen
    .trim();
}

/**
 * Prüft ob ein Pfad im Upload-Directory liegt
 * @param {string} p - Zu prüfender Pfad
 * @param {string} uploadBaseDir - Base upload directory
 * @returns {boolean}
 */
function isWithinUploadDir(p, uploadBaseDir) {
  try {
    const base = resolve(uploadBaseDir);
    const target = resolve(p);
    const rel = relative(base, target);
    return rel && !rel.startsWith('..') && !target.includes('\x00');
  } catch {
    return false;
  }
}

/**
 * Middleware für Express Route-Parameter Validation
 */
function validatePathParam(paramName = 'path', uploadBaseDir) {
  return (req, res, next) => {
    try {
      const raw = req.params?.[paramName] ?? req.query?.[paramName] ?? '';
      const sanitized = sanitizeUploadPath(raw);

      if (sanitized) {
        const absolute = secureResolve(uploadBaseDir, sanitized);
        if (!isWithinUploadDir(absolute, uploadBaseDir)) {
          throw new Error('Path outside upload directory');
        }
      }

      req.validatedPath = sanitized; // attach sanitized value
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid path parameter',
        details: error.message
      });
    }
  };
}

export { secureResolve, getUserDirectory, sanitizeUploadPath };

export default {
  secureResolve,
  getUserDirectory,
  isSafeFilename,
  toClientRelativePath,
  sanitizeUploadPath,
  isWithinUploadDir,
  validatePathParam
};