import { resolve, relative, join, dirname } from 'path';
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
export function secureResolve(basePath, userPath) {
  // Normalisiere Eingabe-Pfade
  const normalizedUserPath = userPath.replace(/^\/+/, '').replace(/\/+/g, '/');
  
  // Resolve absoluten Pfad
  const resolvedPath = resolve(basePath, normalizedUserPath);
  
  // Sicherheitsprüfung: Path muss innerhalb basePath bleiben
  const relativePath = relative(basePath, resolvedPath);
  
  if (relativePath.startsWith('..') || relativePath.includes('../')) {
    throw new Error(`Path traversal detected: ${userPath}`);
  }
  
  return resolvedPath;
}

/**
 * Validiert und normalisiert User-Upload-Directory
 * @param {string|number} userId - User ID
 * @param {string} uploadBaseDir - Base upload directory 
 * @returns {string} Sicherer User-Directory-Pfad
 */
export function getUserDirectory(userId, uploadBaseDir) {
  if (!userId || (typeof userId !== 'string' && typeof userId !== 'number')) {
    throw new Error('Invalid user ID provided');
  }
  
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
export function isSecureFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }
  
  // Gefährliche Zeichen und Patterns
  const dangerousPatterns = [
    /[<>:"|?*\x00-\x1F]/,  // Windows-gefährliche Zeichen
    /^\./,                  // Versteckte Dateien
    /\.$/,                  // Endender Punkt
    /\.\./,                 // Directory Traversal
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
export function createSafeRelativePath(basePath, fullPath) {
  const relativePath = relative(basePath, fullPath);
  
  // Sicherheitsprüfung
  if (relativePath.startsWith('..')) {
    throw new Error('Path outside base directory');
  }
  
  // Normalisiere zu Unix-Style Pfad mit führendem /
  return '/' + relativePath.replace(/\\/g, '/');
}

/**
 * Validiert Upload-Pfad Parameter
 * @param {string} path - Upload-Pfad vom Client
 * @returns {string} Bereinigter Pfad
 */
export function sanitizeUploadPath(path) {
  if (!path || typeof path !== 'string') {
    return '';
  }
  
  // Entferne führende/nachfolgende Slashes und normalisiere
  return path
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/')
    .replace(/[<>:"|?*\x00-\x1F]/g, '') // Gefährliche Zeichen entfernen
    .trim();
}

/**
 * Prüft ob ein Pfad ein Upload-Directory ist
 * @param {string} path - Zu prüfender Pfad
 * @param {string} uploadBaseDir - Base upload directory
 * @returns {boolean}
 */
export function isWithinUploadDirectory(path, uploadBaseDir) {
  try {
    const resolvedPath = resolve(path);
    const resolvedBase = resolve(uploadBaseDir);
    const relativePath = relative(resolvedBase, resolvedPath);
    
    return !relativePath.startsWith('..');
  } catch {
    return false;
  }
}

/**
 * Middleware für Express Route-Parameter Validation
 */
export function validatePathParam(paramName = 'path') {
  return (req, res, next) => {
    const path = req.params[paramName] || req.query[paramName];
    
    if (path) {
      try {
        req.sanitizedPath = sanitizeUploadPath(path);
      } catch (error) {
        return res.status(400).json({ 
          error: 'Invalid path parameter',
          details: error.message 
        });
      }
    }
    
    next();
  };
}