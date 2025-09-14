import cacheService from '../services/cacheService.js';
import logger from './logger.js';

/**
 * Centralized file cache management utilities
 * Reduces code duplication across file-related controllers
 */

/**
 * Generate cache key for file list
 * @param {string|number} userId - User ID
 * @param {string} path - File path
 * @returns {string} Cache key
 */
function generateFileListKey(userId, path) {
  return `files:${userId}:${(path || '/').replace(/\//g, '_')}`;
}

/**
 * Get cached file list for user and path
 * @param {string|number} userId - User ID
 * @param {string} path - File path
 * @returns {Promise<Object|null>} Cached file list or null
 */
export async function getFileList(userId, path) {
  try {
    const key = generateFileListKey(userId, path);
    return await cacheService.get(key);
  } catch (error) {
    logger.warn('Failed to get cached file list', { userId, path, error: error.message });
    return null;
  }
}

/**
 * Cache file list for user and path
 * @param {string|number} userId - User ID
 * @param {string} path - File path
 * @param {Object} fileList - File list to cache
 * @param {number} ttl - Time to live in seconds (default: 10)
 * @returns {Promise<boolean>} True if caching succeeded
 */
export async function setFileList(userId, path, fileList, ttl = 10) {
  try {
    const key = generateFileListKey(userId, path);
    return await cacheService.set(key, fileList, ttl);
  } catch (error) {
    logger.warn('Failed to cache file list', { userId, path, ttl, error: error.message });
    return false;
  }
}

/**
 * Invalidate all cached file lists for a user
 * @param {string|number} userId - User ID
 * @returns {Promise<number>} Number of cache entries deleted
 */
export async function invalidateUserFiles(userId) {
  try {
    const pattern = `files:${userId}:*`;
    return await cacheService.deletePattern(pattern);
  } catch (error) {
    logger.warn('Failed to invalidate user file cache', { userId, error: error.message });
    return 0;
  }
}

/**
 * Invalidate cached file list for specific path
 * @param {string|number} userId - User ID
 * @param {string} path - File path
 * @returns {Promise<boolean>} True if deletion succeeded
 */
export async function invalidateFilePath(userId, path) {
  try {
    const key = generateFileListKey(userId, path);
    return await cacheService.delete(key);
  } catch (error) {
    logger.warn('Failed to invalidate file path cache', { userId, path, error: error.message });
    return false;
  }
}

/**
 * Invalidate cache for multiple paths (batch operation)
 * @param {string|number} userId - User ID
 * @param {string[]} paths - Array of file paths
 * @returns {Promise<number>} Number of successfully invalidated paths
 */
export async function invalidateFilePaths(userId, paths) {
  let invalidatedCount = 0;
  
  for (const path of paths) {
    const success = await invalidateFilePath(userId, path);
    if (success) invalidatedCount++;
  }
  
  return invalidatedCount;
}

/**
 * Smart cache invalidation for file operations
 * Invalidates both the specific path and parent directory
 * @param {string|number} userId - User ID
 * @param {string} filePath - File path that was modified
 * @returns {Promise<void>}
 */
export async function invalidateForFileOperation(userId, filePath) {
  try {
    // Invalidate user files pattern first (catches all)
    await invalidateUserFiles(userId);
    
    // Also specifically invalidate the parent directory
    const parentDir = filePath.split('/').slice(0, -1).join('/') || '/';
    await invalidateFilePath(userId, parentDir);
    
    logger.debug('Cache invalidated for file operation', { userId, filePath, parentDir });
  } catch (error) {
    logger.warn('Failed to invalidate cache for file operation', { 
      userId, 
      filePath, 
      error: error.message 
    });
  }
}

/**
 * Check if file list should be served from cache
 * @param {boolean} forceRefresh - Force refresh requested
 * @param {Object} cachedData - Cached data
 * @returns {boolean} True if should use cache
 */
export function shouldUseCache(forceRefresh, cachedData) {
  return !forceRefresh && cachedData !== null;
}

/**
 * Backward compatibility wrapper for FileCache object pattern
 * Used in existing controllers without modification
 */
export const FileCache = {
  async getFileList(userId, path) {
    return await getFileList(userId, path);
  },
  
  async setFileList(userId, path, fileList, ttl = 10) {
    return await setFileList(userId, path, fileList, ttl);
  },
  
  async invalidateUserFiles(userId) {
    return await invalidateUserFiles(userId);
  },
  
  async invalidateFilePath(userId, path) {
    return await invalidateFilePath(userId, path);
  }
};

/**
 * Export default for backward compatibility
 */
export default FileCache;