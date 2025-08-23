import { createClient } from 'redis';
import logger from '../utils/logger.js';

/**
 * Advanced rate limiting service with multiple algorithms and strategies
 */
export class RateLimitService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      await this.client.connect();
      this.initialized = true;
      logger.info('Rate limit service initialized');
    } catch (error) {
      logger.error('Failed to initialize rate limit service:', error);
    }
  }

  /**
   * Fixed window rate limiting
   * @param {string} key - Rate limit key (usually user ID or IP)
   * @param {number} limit - Maximum requests per window
   * @param {number} window - Window size in seconds
   */
  async fixedWindow(key, limit, window) {
    if (!this.initialized) {
      return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 };
    }

    const windowKey = `rate_limit:fixed:${key}:${Math.floor(Date.now() / (window * 1000))}`;
    
    try {
      const multi = this.client.multi();
      multi.incr(windowKey);
      multi.expire(windowKey, window);
      
      const results = await multi.exec();
      const current = results[0][1];
      
      const remaining = Math.max(0, limit - current);
      const resetTime = Math.ceil(Date.now() / (window * 1000)) * window * 1000;
      
      const allowed = current <= limit;
      
      if (!allowed) {
        logger.warn('Rate limit exceeded (fixed window)', {
          key,
          current,
          limit,
          window
        });
      }
      
      return {
        allowed,
        remaining,
        resetTime,
        current
      };
    } catch (error) {
      logger.error('Fixed window rate limit error:', error);
      return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 };
    }
  }

  /**
   * Sliding window rate limiting
   * @param {string} key - Rate limit key
   * @param {number} limit - Maximum requests per window
   * @param {number} window - Window size in seconds
   */
  async slidingWindow(key, limit, window) {
    if (!this.initialized) {
      return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 };
    }

    const now = Date.now();
    const windowStart = now - (window * 1000);
    const rateLimitKey = `rate_limit:sliding:${key}`;
    
    try {
      // Remove expired entries and count current requests
      const multi = this.client.multi();
      multi.zRemRangeByScore(rateLimitKey, 0, windowStart);
      multi.zCard(rateLimitKey);
      multi.zAdd(rateLimitKey, { score: now, value: `${now}-${Math.random()}` });
      multi.expire(rateLimitKey, window + 1);
      
      const results = await multi.exec();
      const current = results[1][1];
      
      const allowed = current < limit;
      const remaining = Math.max(0, limit - current - 1);
      
      if (!allowed) {
        // Remove the request we just added since it's not allowed
        await this.client.zRemRangeByRank(rateLimitKey, -1, -1);
        
        logger.warn('Rate limit exceeded (sliding window)', {
          key,
          current,
          limit,
          window
        });
      }
      
      return {
        allowed,
        remaining,
        resetTime: now + window * 1000,
        current: allowed ? current + 1 : current
      };
    } catch (error) {
      logger.error('Sliding window rate limit error:', error);
      return { allowed: true, remaining: limit, resetTime: now + window * 1000 };
    }
  }

  /**
   * Token bucket rate limiting
   * @param {string} key - Rate limit key
   * @param {number} capacity - Bucket capacity
   * @param {number} refillRate - Tokens per second
   */
  async tokenBucket(key, capacity, refillRate) {
    if (!this.initialized) {
      return { allowed: true, remaining: capacity - 1 };
    }

    const bucketKey = `rate_limit:bucket:${key}`;
    const now = Date.now();
    
    try {
      const bucket = await this.client.hGetAll(bucketKey);
      
      let tokens = parseFloat(bucket.tokens || capacity);
      const lastRefill = parseInt(bucket.lastRefill || now);
      
      // Refill tokens based on time elapsed
      const elapsed = (now - lastRefill) / 1000;
      tokens = Math.min(capacity, tokens + elapsed * refillRate);
      
      const allowed = tokens >= 1;
      
      if (allowed) {
        tokens -= 1;
      }
      
      // Update bucket
      await this.client.hSet(bucketKey, {
        tokens: tokens.toString(),
        lastRefill: now.toString()
      });
      await this.client.expire(bucketKey, Math.ceil(capacity / refillRate) + 60);
      
      if (!allowed) {
        logger.warn('Rate limit exceeded (token bucket)', {
          key,
          tokens,
          capacity,
          refillRate
        });
      }
      
      return {
        allowed,
        remaining: Math.floor(tokens),
        tokens: tokens
      };
    } catch (error) {
      logger.error('Token bucket rate limit error:', error);
      return { allowed: true, remaining: capacity - 1 };
    }
  }

  /**
   * Leaky bucket rate limiting
   * @param {string} key - Rate limit key
   * @param {number} capacity - Bucket capacity
   * @param {number} leakRate - Requests per second that can leak
   */
  async leakyBucket(key, capacity, leakRate) {
    if (!this.initialized) {
      return { allowed: true, remaining: capacity - 1 };
    }

    const bucketKey = `rate_limit:leaky:${key}`;
    const now = Date.now();
    
    try {
      const bucket = await this.client.hGetAll(bucketKey);
      
      let volume = parseFloat(bucket.volume || 0);
      const lastLeak = parseInt(bucket.lastLeak || now);
      
      // Leak requests based on time elapsed
      const elapsed = (now - lastLeak) / 1000;
      volume = Math.max(0, volume - elapsed * leakRate);
      
      const allowed = volume < capacity;
      
      if (allowed) {
        volume += 1;
      }
      
      // Update bucket
      await this.client.hSet(bucketKey, {
        volume: volume.toString(),
        lastLeak: now.toString()
      });
      await this.client.expire(bucketKey, Math.ceil(capacity / leakRate) + 60);
      
      if (!allowed) {
        logger.warn('Rate limit exceeded (leaky bucket)', {
          key,
          volume,
          capacity,
          leakRate
        });
      }
      
      return {
        allowed,
        remaining: Math.floor(capacity - volume),
        volume: volume
      };
    } catch (error) {
      logger.error('Leaky bucket rate limit error:', error);
      return { allowed: true, remaining: capacity - 1 };
    }
  }

  /**
   * Adaptive rate limiting based on system load
   * @param {string} key - Rate limit key
   * @param {number} baseLimit - Base rate limit
   * @param {number} window - Window size in seconds
   * @param {Object} loadMetrics - System load metrics
   */
  async adaptiveLimit(key, baseLimit, window, loadMetrics = {}) {
    const {
      cpuUsage = 0.5,
      memoryUsage = 0.5,
      responseTime = 100,
      errorRate = 0.01
    } = loadMetrics;
    
    // Calculate adaptive multiplier based on system health
    let multiplier = 1.0;
    
    // Reduce limit if CPU usage is high
    if (cpuUsage > 0.8) multiplier *= 0.5;
    else if (cpuUsage > 0.6) multiplier *= 0.7;
    
    // Reduce limit if memory usage is high
    if (memoryUsage > 0.9) multiplier *= 0.3;
    else if (memoryUsage > 0.7) multiplier *= 0.6;
    
    // Reduce limit if response time is high
    if (responseTime > 1000) multiplier *= 0.4;
    else if (responseTime > 500) multiplier *= 0.7;
    
    // Reduce limit if error rate is high
    if (errorRate > 0.1) multiplier *= 0.3;
    else if (errorRate > 0.05) multiplier *= 0.6;
    
    const adaptiveLimit = Math.max(1, Math.floor(baseLimit * multiplier));
    
    logger.debug('Adaptive rate limit calculated', {
      key,
      baseLimit,
      adaptiveLimit,
      multiplier,
      loadMetrics
    });
    
    return await this.slidingWindow(key, adaptiveLimit, window);
  }

  /**
   * Get rate limit status without consuming tokens
   * @param {string} key - Rate limit key
   * @param {string} algorithm - Rate limiting algorithm
   */
  async getStatus(key, algorithm = 'fixed') {
    if (!this.initialized) {
      return { error: 'Rate limit service not initialized' };
    }

    try {
      switch (algorithm) {
        case 'sliding':
          const slidingKey = `rate_limit:sliding:${key}`;
          const count = await this.client.zCard(slidingKey);
          return { current: count, algorithm };
          
        case 'bucket':
          const bucketKey = `rate_limit:bucket:${key}`;
          const bucket = await this.client.hGetAll(bucketKey);
          return { 
            tokens: parseFloat(bucket.tokens || 0),
            lastRefill: parseInt(bucket.lastRefill || 0),
            algorithm 
          };
          
        case 'leaky':
          const leakyKey = `rate_limit:leaky:${key}`;
          const leaky = await this.client.hGetAll(leakyKey);
          return { 
            volume: parseFloat(leaky.volume || 0),
            lastLeak: parseInt(leaky.lastLeak || 0),
            algorithm 
          };
          
        default: // fixed window
          // For fixed window, we need to check current window
          const windowSize = 60; // Default 1 minute
          const windowKey = `rate_limit:fixed:${key}:${Math.floor(Date.now() / (windowSize * 1000))}`;
          const current = await this.client.get(windowKey) || 0;
          return { current: parseInt(current), algorithm };
      }
    } catch (error) {
      logger.error('Rate limit status error:', error);
      return { error: error.message };
    }
  }

  /**
   * Clear rate limit for a key
   * @param {string} key - Rate limit key
   * @param {string} algorithm - Rate limiting algorithm
   */
  async clearLimit(key, algorithm = 'all') {
    if (!this.initialized) {
      return false;
    }

    try {
      const patterns = [];
      
      if (algorithm === 'all' || algorithm === 'fixed') {
        patterns.push(`rate_limit:fixed:${key}:*`);
      }
      if (algorithm === 'all' || algorithm === 'sliding') {
        patterns.push(`rate_limit:sliding:${key}`);
      }
      if (algorithm === 'all' || algorithm === 'bucket') {
        patterns.push(`rate_limit:bucket:${key}`);
      }
      if (algorithm === 'all' || algorithm === 'leaky') {
        patterns.push(`rate_limit:leaky:${key}`);
      }
      
      for (const pattern of patterns) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      }
      
      logger.info('Rate limit cleared', { key, algorithm });
      return true;
    } catch (error) {
      logger.error('Clear rate limit error:', error);
      return false;
    }
  }

  async close() {
    if (this.client) {
      await this.client.quit();
      this.initialized = false;
      logger.info('Rate limit service closed');
    }
  }
}

export default new RateLimitService();