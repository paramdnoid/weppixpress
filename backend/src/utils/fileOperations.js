import { promises as fsp } from 'fs';
import { join, basename, extname } from 'path';

/**
 * Common file operations utilities to reduce code duplication
 */

/**
 * Check if a path exists (non-throwing)
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} True if path exists
 */
export async function pathExists(path) {
  try {
    await fsp.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize filename by removing dangerous characters
 * @param {string} name - Original filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(name) {
  const base = basename(name || '');
  return base.replace(/[\u0000-\u001F<>:"/\\|?*]+/g, '').trim() || 'unnamed';
}

/**
 * Generate a unique path by appending a number suffix if the desired name already exists
 * @param {string} dir - The absolute directory path
 * @param {string} desiredName - The desired filename or folder name
 * @returns {Promise<string>} A unique absolute path
 */
export async function getUniquePath(dir, desiredName) {
  const idx = desiredName.lastIndexOf('.');
  const hasExt = idx > 0 && desiredName.indexOf('.') !== 0; // ignore dotfiles
  const base = hasExt ? desiredName.slice(0, idx) : desiredName;
  const ext = hasExt ? desiredName.slice(idx) : '';
  let candidate = desiredName;
  let i = 1;
  while (await pathExists(join(dir, candidate))) {
    candidate = `${base} (${i++})${ext}`;
  }
  return join(dir, candidate);
}

/**
 * Alternative implementation for files specifically (compatible with existing code)
 * @param {string} dir - Directory path
 * @param {string} desiredName - Desired filename
 * @returns {Promise<string>} Unique file path
 */
export async function getUniqueFilePath(dir, desiredName) {
  const ext = extname(desiredName);
  const baseName = basename(desiredName, ext);
  let candidate = desiredName;
  let counter = 1;

  while (await pathExists(join(dir, candidate))) {
    candidate = `${baseName} (${counter++})${ext}`;
  }

  return join(dir, candidate);
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path to ensure
 * @returns {Promise<string>} The directory path
 */
export async function ensureDirectory(dirPath) {
  try {
    await fsp.access(dirPath);
  } catch {
    await fsp.mkdir(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Get file stats with error handling
 * @param {string} filePath - Path to file
 * @returns {Promise<import('fs').Stats|null>} File stats or null if error
 */
export async function getFileStats(filePath) {
  try {
    return await fsp.stat(filePath);
  } catch {
    return null;
  }
}

/**
 * Check if path is a directory
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} True if directory
 */
export async function isDirectory(path) {
  const stats = await getFileStats(path);
  return stats ? stats.isDirectory() : false;
}

/**
 * Check if path is a file
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} True if file
 */
export async function isFile(path) {
  const stats = await getFileStats(path);
  return stats ? stats.isFile() : false;
}

/**
 * Safe file removal (handles both files and directories)
 * @param {string} path - Path to remove
 * @param {Object} options - Removal options
 * @returns {Promise<boolean>} True if removal succeeded
 */
export async function safeRemove(path, options = {}) {
  try {
    const stats = await getFileStats(path);
    if (!stats) return true; // Already doesn't exist
    
    if (stats.isDirectory()) {
      await fsp.rm(path, { recursive: true, force: true, ...options });
    } else {
      await fsp.unlink(path);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Move/rename a file or directory
 * @param {string} sourcePath - Source path
 * @param {string} destPath - Destination path
 * @returns {Promise<boolean>} True if move succeeded
 */
export async function moveItem(sourcePath, destPath) {
  try {
    await fsp.rename(sourcePath, destPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy file with error handling
 * @param {string} sourcePath - Source file path
 * @param {string} destPath - Destination file path
 * @returns {Promise<boolean>} True if copy succeeded
 */
export async function copyFile(sourcePath, destPath) {
  try {
    await fsp.copyFile(sourcePath, destPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read directory contents with error handling
 * @param {string} dirPath - Directory path
 * @param {Object} options - readdir options
 * @returns {Promise<Array|null>} Directory entries or null if error
 */
export async function readDirectory(dirPath, options = {}) {
  try {
    return await fsp.readdir(dirPath, options);
  } catch {
    return null;
  }
}