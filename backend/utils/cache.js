import logger from './logger.js';
import { createClient } from 'redis';

/**
 * Zentrale Cache-Verwaltung mit Redis
 */

let redisClient = null;
let isConnected = false;

// Cache-Konfiguration
export const CACHE_CONFIG = {
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10), // 5 minutes
  userSessionTTL: parseInt(process.env.CACHE_USER_SESSION_TTL || '3600', 10), // 1 hour
  fileListTTL: parseInt(process.env.CACHE_FILE_LIST_TTL || '10', 10), // 10 seconds
  staticContentTTL: parseInt(process.env.CACHE_STATIC_CONTENT_TTL || '86400', 10), // 24 hours
  keyPrefix: process.env.CACHE_KEY_PREFIX || 'wpx:'
};

/**
 * Initialisiert Redis-Client
 */
export async function initCache() {
  try {
    if (redisClient && isConnected) return redisClient;

    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
        connectTimeout: 5000
      },
      database: parseInt(process.env.REDIS_CACHE_DB || '1', 10) // Separate DB für Cache
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Cache Error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis Cache connected');
      isConnected = true;
    });

    redisClient.on('end', () => {
      logger.warn('Redis Cache disconnected');
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis cache:', error);
    return null;
  }
}

/**
 * Generiert Cache-Key
 */
export function generateKey(namespace, identifier) {
  return `${CACHE_CONFIG.keyPrefix}${namespace}:${identifier}`;
}

/**
 * Cache-Operations
 */
export class CacheManager {
  static async set(namespace, key, value, ttl = CACHE_CONFIG.defaultTTL) {
    if (!redisClient || !isConnected) {
      logger.debug('Cache not available, skipping set operation');
      return false;
    }
    try {
      const cacheKey = generateKey(namespace, key);
      const serializedValue = JSON.stringify(value);
      await redisClient.setEx(cacheKey, ttl, serializedValue);
      logger.debug(`Cache SET: ${cacheKey} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache SET failed for ${namespace}:${key}:`, error);
      return false;
    }
  }

  static async get(namespace, key) {
    if (!redisClient || !isConnected) {
      logger.debug('Cache not available, skipping get operation');
      return null;
    }
    try {
      const cacheKey = generateKey(namespace, key);
      const value = await redisClient.get(cacheKey);
      if (value) {
        logger.debug(`Cache HIT: ${cacheKey}`);
        try { return JSON.parse(value); } catch { return value; }
      } else {
        logger.debug(`Cache MISS: ${cacheKey}`);
        return null;
      }
    } catch (error) {
      logger.error(`Cache GET failed for ${namespace}:${key}:`, error);
      return null;
    }
  }

  static async del(namespace, key) {
    if (!redisClient || !isConnected) {
      return false;
    }
    try {
      const cacheKey = generateKey(namespace, key);
      const result = await redisClient.del(cacheKey);
      logger.debug(`Cache DEL: ${cacheKey}`);
      return result > 0;
    } catch (error) {
      logger.error(`Cache DEL failed for ${namespace}:${key}:`, error);
      return false;
    }
  }

  static async invalidatePattern(pattern) {
    if (!redisClient || !isConnected) {
      return false;
    }
    try {
      const fullPattern = `${CACHE_CONFIG.keyPrefix}${pattern}`;
      // Note: For large keyspaces, consider SCAN instead of KEYS
      const keys = await redisClient.keys(fullPattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info(`Cache invalidated ${keys.length} keys matching pattern: ${fullPattern}`);
      }
      return true;
    } catch (error) {
      logger.error(`Cache pattern invalidation failed for ${pattern}:`, error);
      return false;
    }
  }

  static async flush() {
    if (!redisClient || !isConnected) {
      return false;
    }
    try {
      await redisClient.flushDb();
      logger.info('Cache completely flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush failed:', error);
      return false;
    }
  }
}

/**
 * Specialized Cache Functions
 */
export const UserCache = {
  async getUser(userId) {
    return CacheManager.get('user', userId);
  },
  async setUser(userId, userData) {
    return CacheManager.set('user', userId, userData, CACHE_CONFIG.userSessionTTL);
  },
  async invalidateUser(userId) {
    return CacheManager.del('user', userId);
  }
};

export const FileCache = {
  async getFileList(userId, path) {
    const key = `${userId}:${(path || '/').replace(/\//g, '_')}`;
    return CacheManager.get('files', key);
  },
  async setFileList(userId, path, fileList) {
    const key = `${userId}:${(path || '/').replace(/\//g, '_')}`;
    return CacheManager.set('files', key, fileList, CACHE_CONFIG.fileListTTL);
  },
  async invalidateUserFiles(userId) {
    return CacheManager.invalidatePattern(`files:${userId}:*`);
  },
  async invalidateFilePath(userId, path) {
    const key = `${userId}:${(path || '/').replace(/\//g, '_')}`;
    return CacheManager.del('files', key);
  }
};

export const AppCache = {
  async getStats() {
    return CacheManager.get('app', 'stats');
  },
  async setStats(stats) {
    return CacheManager.set('app', 'stats', stats, 60); // 1 minute
  },
  async getConfig(key) {
    return CacheManager.get('config', key);
  },
  async setConfig(key, value) {
    return CacheManager.set('config', key, value, CACHE_CONFIG.staticContentTTL);
  }
};

/**
 * Cache Middleware für Express
 */
export function cacheMiddleware(namespace, keyBuilder, ttl = CACHE_CONFIG.defaultTTL) {
  return async (req, res, next) => {
    try {
      if (!redisClient || !isConnected) return next();

      const key = typeof keyBuilder === 'function' ? keyBuilder(req) : String(keyBuilder);
      if (!key) return next();

      const cached = await CacheManager.get(namespace, key);
      if (cached) {
        logger.debug(`Cache middleware HIT: ${namespace}:${key}`);
        return res.json(cached);
      }

      // Override res.json to cache successful responses
      const originalJson = res.json;
      res.json = function (data) {
        try {
          if (res.statusCode < 400) {
            CacheManager.set(namespace, key, data, ttl).catch(err => {
              logger.error('Cache middleware set failed:', err);
            });
          }
        } catch (err) {
          logger.error('Cache middleware error during set:', err);
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Cache Health Check
 */
export async function cacheHealth() {
  if (!redisClient) {
    return { status: 'uninitialized', connected: false };
  }
  try {
    await redisClient.ping();
    const info = await redisClient.info('memory');
    return {
      status: 'healthy',
      connected: isConnected,
      memoryInfo: info
    };
  } catch (error) {
    return {
      status: 'error',
      connected: false,
      error: error.message
    };
  }
}

/**
 * Graceful Shutdown
 */
export async function closeCache() {
  if (redisClient) {
    try {
      await redisClient.quit();
      isConnected = false;
      logger.info('Redis Cache connection closed');
    } catch (error) {
      logger.error('Error closing cache connection:', error);
    }
  }
}

// Default export for convenience
export default {
  initCache,
  CacheManager,
  UserCache,
  FileCache,
  AppCache,
  cacheMiddleware,
  cacheHealth,
  closeCache,
  generateKey,
  CACHE_CONFIG
};
