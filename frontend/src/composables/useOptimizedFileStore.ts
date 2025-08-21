import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { debounce, throttle } from 'lodash-es'
import type { FileItem } from '@/types'
import { fileApi } from '@/api/files'
import { useFileCache } from './useFileCache'
import { performanceMonitor } from '@/utils/performance'

export const useOptimizedFileStore = defineStore('optimizedFiles', () => {
  // State
  const items = shallowRef<Map<string, FileItem>>(new Map())
  const currentPath = ref('/')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Cache
  const { get: getCached, set: setCached, invalidate } = useFileCache()
  
  // Performance optimized getters
  const currentItems = computed(() => {
    return performanceMonitor.measure('getCurrentItems', () => {
      return Array.from(items.value.values())
        .filter(item => getParentPath(item.path) === currentPath.value)
    })
  })

  // Optimized path utilities
  const getParentPath = (path: string): string => {
    const lastSlash = path.lastIndexOf('/')
    return lastSlash > 0 ? path.substring(0, lastSlash) : '/'
  }

  // Batched updates to reduce reactivity overhead
  const batchUpdates = throttle(() => {
    // Trigger reactivity update
    items.value = new Map(items.value)
  }, 16) // 60fps

  // Optimized item updates
  const updateItems = (newItems: FileItem[], replace = false) => {
    if (replace) {
      items.value.clear()
    }
    
    newItems.forEach(item => {
      items.value.set(item.path, item)
    })
    
    batchUpdates()
  }

  // Debounced search to prevent excessive API calls
  const debouncedSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      await loadPath(currentPath.value, true)
      return
    }

    isLoading.value = true
    try {
      const response = await fileApi.list(currentPath.value, { search: query })
      updateItems(response.items, true)
    } catch (err: any) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }, 300)

  // Main load function with caching
  const loadPath = async (path: string, force = false) => {
    const normalizedPath = path.replace(/\/+$/, '') || '/'
    const cacheKey = `files:${normalizedPath}`
    
    // Check cache first
    if (!force) {
      const cached = getCached(cacheKey)
      if (cached) {
        updateItems(cached, true)
        currentPath.value = normalizedPath
        return cached
      }
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await performanceMonitor.measureAsync('loadPath', async () => {
        return await fileApi.list(normalizedPath)
      })

      updateItems(response.items, true)
      setCached(cacheKey, response.items)
      currentPath.value = normalizedPath
      
      return response.items
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    items: computed(() => items.value),
    currentItems,
    currentPath,
    isLoading,
    error,
    
    // Actions
    loadPath,
    updateItems,
    search: debouncedSearch,
    invalidateCache: invalidate,
    
    // Performance
    getPerformanceStats: () => performanceMonitor.getAllStats()
  }
})