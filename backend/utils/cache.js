import { createClient } from 'redis';
import logger from './logger.js';

/**
 * Zentrale Cache-Verwaltung mit Redis
 */

let redisClient = null;
let isConnected = false;

// Cache-Konfiguration
const CACHE_CONFIG = {
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 300, // 5 minutes
  userSessionTTL: parseInt(process.env.CACHE_USER_SESSION_TTL) || 3600, // 1 hour  
  fileListTTL: parseInt(process.env.CACHE_FILE_LIST_TTL) || 10, // 10 seconds - temporary fix for cache issues
  staticContentTTL: parseInt(process.env.CACHE_STATIC_CONTENT_TTL) || 86400, // 24 hours
  keyPrefix: process.env.CACHE_KEY_PREFIX || 'wpx:'
};

/**
 * Initialisiert Redis-Client
 */
export async function initializeCache() {
  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
        connectTimeout: 5000
      },
      database: parseInt(process.env.REDIS_CACHE_DB) || 1 // Separate DB für Cache
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Cache Error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis Cache connected');
      isConnected = true;
    });

    redisClient.on('disconnect', () => {
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
function generateKey(namespace, identifier) {
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
        return JSON.parse(value);
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

// User Session Cache
export const UserCache = {
  async getUser(userId) {
    return await CacheManager.get('user', userId);
  },

  async setUser(userId, userData) {
    return await CacheManager.set('user', userId, userData, CACHE_CONFIG.userSessionTTL);
  },

  async invalidateUser(userId) {
    return await CacheManager.del('user', userId);
  }
};

// File Listing Cache  
export const FileCache = {
  async getFileList(userId, path = '/') {
    const key = `${userId}:${path.replace(/\//g, '_')}`;
    return await CacheManager.get('files', key);
  },

  async setFileList(userId, path, fileList) {
    const key = `${userId}:${path.replace(/\//g, '_')}`;
    return await CacheManager.set('files', key, fileList, CACHE_CONFIG.fileListTTL);
  },

  async invalidateUserFiles(userId) {
    return await CacheManager.invalidatePattern(`files:${userId}:*`);
  },

  async invalidateFilePath(userId, path) {
    const key = `${userId}:${path.replace(/\//g, '_')}`;
    return await CacheManager.del('files', key);
  }
};

// General Application Cache
export const AppCache = {
  async getStats() {
    return await CacheManager.get('app', 'stats');
  },

  async setStats(stats) {
    return await CacheManager.set('app', 'stats', stats, 60); // 1 minute
  },

  async getConfig(key) {
    return await CacheManager.get('config', key);
  },

  async setConfig(key, value) {
    return await CacheManager.set('config', key, value, CACHE_CONFIG.staticContentTTL);
  }
};

/**
 * Cache Middleware für Express
 */
export function cacheMiddleware(namespace, keyGenerator, ttl = CACHE_CONFIG.defaultTTL) {
  return async (req, res, next) => {
    try {
      const key = keyGenerator(req);
      const cached = await CacheManager.get(namespace, key);
      
      if (cached) {
        logger.debug(`Serving from cache: ${namespace}:${key}`);
        return res.json(cached);
      }

      // Override res.json to cache response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode < 400) {
          CacheManager.set(namespace, key, data, ttl).catch(err => {
            logger.error('Cache middleware set failed:', err);
          });
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
export async function getCacheHealth() {
  if (!redisClient) {
    return { status: 'disabled', connected: false };
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
  if (redisClient && isConnected) {
    try {
      await redisClient.quit();
      logger.info('Cache connection closed');
    } catch (error) {
      logger.error('Error closing cache connection:', error);
    }
  }
}