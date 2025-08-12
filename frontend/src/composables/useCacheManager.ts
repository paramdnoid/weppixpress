import { ref } from 'vue'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  maxAge: number
}

export interface CacheOptions {
  maxAge?: number
  maxSize?: number
}

export function useCacheManager<T>(options: CacheOptions = {}) {
  const { maxAge = 5 * 60 * 1000, maxSize = 100 } = options
  
  const cache = ref(new Map<string, CacheEntry<T>>())

  function get(key: string): T | null {
    const entry = cache.value.get(key)
    
    if (!entry) {
      return null
    }

    const now = Date.now()
    const isExpired = now - entry.timestamp > entry.maxAge

    if (isExpired) {
      cache.value.delete(key)
      return null
    }

    return entry.data
  }

  function set(key: string, data: T, entryMaxAge?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      maxAge: entryMaxAge ?? maxAge
    }

    cache.value.set(key, entry)

    // Enforce max size by removing oldest entries
    if (cache.value.size > maxSize) {
      const entries = Array.from(cache.value.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const entriesToRemove = entries.slice(0, cache.value.size - maxSize)
      entriesToRemove.forEach(([key]) => cache.value.delete(key))
    }
  }

  function invalidate(key: string): void {
    cache.value.delete(key)
  }

  function clear(): void {
    cache.value.clear()
  }

  function cleanup(): void {
    const now = Date.now()
    
    for (const [key, entry] of cache.value.entries()) {
      const isExpired = now - entry.timestamp > entry.maxAge
      if (isExpired) {
        cache.value.delete(key)
      }
    }
  }

  return {
    get,
    set,
    invalidate,
    clear,
    cleanup
  }
}