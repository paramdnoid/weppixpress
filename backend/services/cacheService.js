import logger from '../utils/logger.js';
import { createClient } from 'redis';

/**
 * Enhanced caching service with Redis support, compression, and monitoring
 */
class CacheService {
  constructor() {
    /** @type {import('redis').RedisClientType | null} */
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 50;

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            this.reconnectAttempts = retries;
            // Exponential backoff with cap (ms)
            return Math.min(100 + retries * 50, 1000);
          }
        }
      });

      this.setupEventHandlers();

      await this.client.connect();
      logger.info('Cache service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  /**
   * Setup Redis event handlers
   */
  setupEventHandlers() {
    if (!this.client) return;

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
      this.isConnected = false;
      this.stats.errors++;
    });

    this.client.on('end', () => {
      logger.warn('Redis client disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.info(`Redis client reconnecting (attempt ${this.reconnectAttempts})`);
    });
  }

  /**
   * Check if cache is available
   */
  isAvailable() {
    return !!this.client && this.isConnected;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @param {Object} options - Options (reserved for future use)
   */
  async get(key, options = {}) {
    if (!this.isAvailable()) {
      logger.debug('Cache not available for get operation');
      this.stats.misses++;
      return null;
    }

    try {
      const startTime = Date.now();
      const value = await this.client.get(this.prefixKey(key));
      const duration = Date.now() - startTime;

      if (value !== null) {
        this.stats.hits++;
        logger.debug('Cache hit', { key, duration });

        try {
          return JSON.parse(value);
        } catch {
          return value; // Return as string if not JSON
        }
      } else {
        this.stats.misses++;
        logger.debug('Cache miss', { key, duration });
        return null;
      }
    } catch (error) {
      logger.error('Cache get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @param {Object} options - Options (reserved for future use)
   */
  async set(key, value, ttl = 3600, options = {}) {
    if (!this.isAvailable()) {
      logger.debug('Cache not available for set operation');
      return false;
    }

    try {
      const startTime = Date.now();
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

      const result = await this.client.setEx(
        this.prefixKey(key),
        ttl,
        serializedValue
      );

      const duration = Date.now() - startTime;
      this.stats.sets++;

      logger.debug('Cache set', { key, ttl, duration, size: serializedValue.length });
      return result === 'OK';
    } catch (error) {
      logger.error('Cache set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  async delete(key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client.del(this.prefixKey(key));
      this.stats.deletes++;
      logger.debug('Cache delete', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get keys matching pattern
   * @param {string} pattern - Key pattern
   */
  async keys(pattern) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const keys = await this.client.keys(this.prefixKey(pattern));
      logger.debug('Cache keys', { pattern, count: keys.length });
      return keys;
    } catch (error) {
      logger.error('Cache keys error:', error);
      this.stats.errors++;
      return [];
    }
  }

  /**
   * Delete multiple keys matching pattern
   * @param {string} pattern - Key pattern
   */
  async deletePattern(pattern) {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keys = await this.client.keys(this.prefixKey(pattern));
      if (keys.length === 0) return 0;

      const result = await this.client.del(keys);
      this.stats.deletes += result;

      logger.debug('Cache pattern delete', { pattern, deleted: result });
      return result;
    } catch (error) {
      logger.error('Cache pattern delete error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   */
  async exists(key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client.exists(this.prefixKey(key));
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get time to live for key
   * @param {string} key - Cache key
   */
  async ttl(key) {
    if (!this.isAvailable()) {
      return -1;
    }

    try {
      return await this.client.ttl(this.prefixKey(key));
    } catch (error) {
      logger.error('Cache TTL error:', error);
      return -1;
    }
  }

  /**
   * Increment counter
   * @param {string} key - Counter key
   * @param {number} increment - Increment value
   */
  async increment(key, increment = 1) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const result = await this.client.incrBy(this.prefixKey(key), increment);
      logger.debug('Cache increment', { key, increment, result });
      return result;
    } catch (error) {
      logger.error('Cache increment error:', error);
      return null;
    }
  }

  /**
   * Set expiration for existing key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   */
  async expire(key, ttl) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client.expire(this.prefixKey(key), ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Get cache with automatic refresh
   * @param {string} key - Cache key
   * @param {Function} refreshFunction - Function to refresh data
   * @param {number} ttl - Time to live
   */
  async getOrSet(key, refreshFunction, ttl = 3600) {
    const cached = await this.get(key);

    if (cached !== null) {
      return cached;
    }

    try {
      const fresh = await refreshFunction();
      await this.set(key, fresh, ttl);
      return fresh;
    } catch (error) {
      logger.error('Cache refresh function error:', error);
      throw error;
    }
  }

  /**
   * Batch operations
   */
  async mget(keys) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const prefixedKeys = keys.map((key) => this.prefixKey(key));
      const values = await this.client.mGet(prefixedKeys);

      return values.map((value) => {
        if (value === null) return null;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      logger.error('Cache mget error:', error);
      return [];
    }
  }

  async mset(keyValuePairs, ttl = 3600) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const multi = this.client.multi();

      for (const [key, value] of keyValuePairs) {
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        multi.setEx(this.prefixKey(key), ttl, serializedValue);
      }

      await multi.exec();
      this.stats.sets += keyValuePairs.length;
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.isAvailable()) {
      return { status: 'unhealthy', error: 'Not connected' };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - start;

      const info = await this.client.info('memory');
      const usedMemory = info.match(/used_memory:(\d+)/)?.[1] || 'unknown';

      return {
        status: 'healthy',
        responseTime,
        usedMemory,
        stats: this.getStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Add key prefix for namespacing
   */
  prefixKey(key) {
    const prefix = process.env.CACHE_PREFIX || 'weppix';
    return `${prefix}:${key}`;
  }

  /**
   * Close connection
   */
  async close() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Cache service disconnected');
      } catch (error) {
        logger.error('Error closing cache service:', error);
      }
    }
  }
}

// Export singleton instance
export default new CacheService();