import { join, relative, resolve } from 'path';

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

  // Zusätzliche Validierung der Eingabeparameter
  if (typeof basePath !== 'string' || basePath.trim() === '') {
    throw new Error('Invalid base path');
  }

  if (userPath && typeof userPath !== 'string') {
    throw new Error('Invalid user path type');
  }

  const base = resolve(basePath);
  const target = userPath ? resolve(base, userPath) : base;

  // Erweiterte Sicherheitsprüfungen
  if (target.includes('\x00') || target.includes('\x01')) {
    throw new Error('Path contains null or control characters');
  }

  const rel = relative(base, target);
  if (rel && (rel.startsWith('..') || rel.includes('..'))) {
    throw new Error('Path traversal detected');
  }

  // Zusätzliche Prüfung: Symlink-Angriffe verhindern
  if (rel && (rel.includes('//') || rel.includes('\\'))) {
    throw new Error('Invalid path structure detected');
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

  // Gefährliche Zeichen und Patterns (mehr permissiv für File Manager)
  const dangerousPatterns = [
    /[<>:"|?*\x00-\x1F\x7F]/,  // Windows-gefährliche Zeichen inkl. DEL
    /\.$/,                      // Endender Punkt
    /(^|\/)\.\.($|\/)/,         // Directory Traversal (nur echte .. patterns)
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i, // Windows reserved names mit Extension
    /^\s|\s$/,                  // Leading/trailing whitespace
    /[\uFEFF\u200B-\u200D\uFEFF]/,  // Unicode Steuerzeichen
    /[\/\\]/,                   // Path separators
  ];

  // Zusätzliche Sicherheitsprüfungen
  if (filename === '.' || filename === '..') {
    return false;
  }

  // Prüfe auf gefährliche Extensions (nur wirklich gefährliche für File Manager)
  const dangerousExtensions = [
  ];

  const lowerName = filename.toLowerCase();
  if (dangerousExtensions.some(ext => lowerName.endsWith(ext))) {
    return false;
  }

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
  const sanitized = path
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/') // Fix: korrigiert die Regex für doppelte Slashes
    .replace(/[<>:"|?*\x00-\x1F]/g, '') // Gefährliche Zeichen entfernen
    .replace(/\.\./g, '') // Directory traversal patterns entfernen
    .trim();

  // Zusätzliche Sicherheitsvalidierungen
  if (sanitized.includes('\x00') || sanitized.length > 1000) {
    throw new Error('Invalid path: contains null bytes or too long');
  }

  // Validiere jeden Pfad-Segment
  const segments = sanitized.split('/');
  for (const segment of segments) {
    if (!isSafeFilename(segment) && segment !== '') {
      throw new Error(`Invalid path segment: ${segment}`);
    }
  }

  return sanitized;
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
 * Erweiterte Validierung von Datei-Upload-Daten
 * @param {Object} fileInfo - Datei-Information
 * @returns {boolean} True wenn sicher
 */
function validateFileUpload(fileInfo) {
  if (!fileInfo || typeof fileInfo !== 'object') {
    throw new Error('Invalid file information');
  }

  const { path, size, checksum } = fileInfo;

  // Pfad-Validierung
  if (!path || typeof path !== 'string') {
    throw new Error('File path is required and must be string');
  }

  // Größe-Validierung
  const numericSize = typeof size === 'string' ? parseInt(size, 10) : size;
  if (typeof numericSize !== 'number' || isNaN(numericSize) || numericSize < 0 || numericSize > 5 * 1024 * 1024 * 1024) { // Max 5GB
    throw new Error('Invalid file size');
  }

  // Checksum-Validierung (optional)
  if (checksum && (typeof checksum !== 'string' || checksum.length < 8)) {
    throw new Error('Invalid checksum format');
  }

  // Pfad-Segmente validieren
  const pathSegments = path.split('/');
  for (const segment of pathSegments) {
    if (segment && !isSafeFilename(segment)) {
      throw new Error(`Unsafe filename in path: ${segment}`);
    }
  }

  return true;
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

export { secureResolve, getUserDirectory, sanitizeUploadPath, validateFileUpload };

export default {
  secureResolve,
  getUserDirectory,
  isSafeFilename,
  toClientRelativePath,
  sanitizeUploadPath,
  isWithinUploadDir,
  validatePathParam,
  validateFileUpload
};