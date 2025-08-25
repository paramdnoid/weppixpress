/**
 * LRU Cache Service for efficient memory management
 * Prevents memory leaks by automatically evicting least recently used items
 */

export interface CacheOptions {
  maxSize: number
  ttl?: number // Time to live in milliseconds
}

export class LRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>()
  private maxSize: number
  private ttl?: number

  constructor(options: CacheOptions) {
    this.maxSize = options.maxSize
    this.ttl = options.ttl
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key)
    
    if (!item) {
      return undefined
    }

    // Check TTL expiration
    if (this.ttl && Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, { value: item.value, timestamp: Date.now() })
    
    return item.value
  }

  set(key: K, value: V): void {
    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    // Add new item
    this.cache.set(key, { value, timestamp: Date.now() })
  }

  has(key: K): boolean {
    const item = this.cache.get(key)
    
    if (!item) {
      return false
    }

    // Check TTL expiration
    if (this.ttl && Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  // Clean up expired items
  cleanup(): void {
    if (!this.ttl) return

    const now = Date.now()
    const toDelete: K[] = []

    this.cache.forEach((item, key) => {
      if (now - item.timestamp > this.ttl!) {
        toDelete.push(key)
      }
    })

    toDelete.forEach(key => this.cache.delete(key))
  }

  // Get cache statistics
  getStats(): { size: number; maxSize: number; hitRatio: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRatio: 0 // Could be tracked with additional counters
    }
  }
}

/**
 * Global cache manager for file manager operations
 */
export class CacheManager {
  private caches = new Map<string, LRUCache<any, any>>()
  private cleanupInterval?: number

  constructor() {
    // Auto-cleanup expired items every 5 minutes
    this.cleanupInterval = window.setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  getCache<K, V>(name: string, options?: Partial<CacheOptions>): LRUCache<K, V> {
    if (!this.caches.has(name)) {
      const defaultOptions: CacheOptions = {
        maxSize: 1000,
        ttl: 30 * 60 * 1000 // 30 minutes default TTL
      }
      this.caches.set(name, new LRUCache({ ...defaultOptions, ...options }))
    }
    return this.caches.get(name)!
  }

  clearCache(name: string): void {
    const cache = this.caches.get(name)
    if (cache) {
      cache.clear()
    }
  }

  clearAllCaches(): void {
    this.caches.forEach(cache => {
      cache.clear()
    })
  }

  cleanup(): void {
    this.caches.forEach(cache => {
      cache.cleanup()
    })
  }

  getStats(): Record<string, any> {
    const stats: Record<string, any> = {}
    this.caches.forEach((cache, name) => {
      stats[name] = cache.getStats()
    })
    return stats
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
    this.clearAllCaches()
    this.caches.clear()
  }
}

// Global instance
export const cacheManager = new CacheManager()

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cacheManager.destroy()
  })
}

/**
 * Specialized file cache for FileManager
 */
export class FileCache {
  private iconCache = cacheManager.getCache<string, string>('icons', { maxSize: 500 })
  private colorCache = cacheManager.getCache<string, string>('colors', { maxSize: 500 })
  private sizeCache = cacheManager.getCache<number, string>('sizes', { maxSize: 1000 })
  private dateCache = cacheManager.getCache<string, string>('dates', { maxSize: 1000 })

  getIcon(key: string): string | undefined {
    return this.iconCache.get(key)
  }

  setIcon(key: string, icon: string): void {
    this.iconCache.set(key, icon)
  }

  getColor(key: string): string | undefined {
    return this.colorCache.get(key)
  }

  setColor(key: string, color: string): void {
    this.colorCache.set(key, color)
  }

  getSize(bytes: number): string | undefined {
    return this.sizeCache.get(bytes)
  }

  setSize(bytes: number, formatted: string): void {
    this.sizeCache.set(bytes, formatted)
  }

  getDate(key: string): string | undefined {
    return this.dateCache.get(key)
  }

  setDate(key: string, formatted: string): void {
    this.dateCache.set(key, formatted)
  }

  clear(): void {
    this.iconCache.clear()
    this.colorCache.clear()
    this.sizeCache.clear()
    this.dateCache.clear()
  }

  getStats() {
    return {
      icons: this.iconCache.getStats(),
      colors: this.colorCache.getStats(),
      sizes: this.sizeCache.getStats(),
      dates: this.dateCache.getStats()
    }
  }
}

// Global file cache instance
export const fileCache = new FileCache()