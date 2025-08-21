import { ref, computed } from 'vue'
import type { FileItem } from '@/types'

interface CacheEntry {
  data: FileItem[]
  timestamp: number
  etag?: string
}

export function useFileCache() {
  const cache = ref(new Map<string, CacheEntry>())
  const maxAge = 5 * 60 * 1000 // 5 minutes
  const maxEntries = 100

  const get = (key: string): FileItem[] | null => {
    const entry = cache.value.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > maxAge) {
      cache.value.delete(key)
      return null
    }

    return entry.data
  }

  const set = (key: string, data: FileItem[], etag?: string) => {
    // Implement LRU eviction
    if (cache.value.size >= maxEntries) {
      const firstKey = cache.value.keys().next().value
      if (firstKey !== undefined) {
        cache.value.delete(firstKey)
      }
    }

    cache.value.set(key, {
      data: [...data], // Clone to prevent mutations
      timestamp: Date.now(),
      etag
    })
  }

  const invalidate = (pattern?: string) => {
    if (pattern) {
      for (const key of cache.value.keys()) {
        if (key.includes(pattern)) {
          cache.value.delete(key)
        }
      }
    } else {
      cache.value.clear()
    }
  }

  const size = computed(() => cache.value.size)

  return { get, set, invalidate, size }
}
