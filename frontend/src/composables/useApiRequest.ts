/**
 * Shared API Request Composable
 * Provides consistent API call patterns with loading, error handling, and caching
 */

import { ref, computed } from 'vue'
import { extractErrorMessage } from '@/utils/errorHandler'

export interface ApiRequestOptions {
  // Loading options
  autoLoad?: boolean
  loadingDelay?: number

  // Retry options
  retryCount?: number
  retryDelay?: number

  // Cache options
  cacheKey?: string
  cacheTtl?: number

  // Error handling
  throwOnError?: boolean
  showErrorToast?: boolean

  // Transform response
  transform?: (data: any) => any
}

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry>()

/**
 * Composable for handling API requests with consistent patterns
 */
export function useApiRequest<T = any>(
  requestFn: () => Promise<T>,
  options: ApiRequestOptions = {}
) {
  const {
    autoLoad = false,
    loadingDelay = 0,
    retryCount = 0,
    retryDelay = 1000,
    cacheKey,
    cacheTtl = 5 * 60 * 1000, // 5 minutes default
    throwOnError = false,
    showErrorToast = false,
    transform
  } = options

  // Reactive state
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref('')
  const lastFetch = ref<Date | null>(null)

  // Computed states
  const hasData = computed(() => data.value !== null)
  const hasError = computed(() => !!error.value)
  const isStale = computed(() => {
    if (!lastFetch.value || !cacheKey || !cacheTtl) return false
    return Date.now() - lastFetch.value.getTime() > cacheTtl
  })

  /**
   * Check cache for existing data
   */
  function getCachedData(): T | null {
    if (!cacheKey) return null

    const cached = cache.get(cacheKey)
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > cached.ttl
    if (isExpired) {
      cache.delete(cacheKey)
      return null
    }

    return cached.data
  }

  /**
   * Store data in cache
   */
  function setCachedData(responseData: T) {
    if (!cacheKey) return

    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
      ttl: cacheTtl
    })
  }

  /**
   * Execute the API request with retries
   */
  async function executeRequest(): Promise<T> {
    let lastError: any
    let attempt = 0
    const maxAttempts = retryCount + 1

    while (attempt < maxAttempts) {
      try {
        const response = await requestFn()
        return transform ? transform(response) : response
      } catch (err) {
        lastError = err
        attempt++

        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }

    throw lastError
  }

  /**
   * Execute the request
   */
  async function execute(force = false): Promise<T | null> {
    // Check cache first (unless forced)
    if (!force && cacheKey) {
      const cached = getCachedData()
      if (cached) {
        data.value = cached
        lastFetch.value = new Date()
        return cached
      }
    }

    // Clear previous error
    error.value = ''

    // Handle loading delay
    let loadingTimeout: NodeJS.Timeout | null = null
    if (loadingDelay > 0) {
      loadingTimeout = setTimeout(() => {
        loading.value = true
      }, loadingDelay)
    } else {
      loading.value = true
    }

    try {
      const response = await executeRequest()

      data.value = response
      lastFetch.value = new Date()

      // Cache the response
      setCachedData(response)

      return response

    } catch (err) {
      const errorMessage = extractErrorMessage(err)
      error.value = errorMessage

      if (showErrorToast && window.$toast) {
        window.$toast(errorMessage, { type: 'danger' })
      }

      if (throwOnError) {
        throw err
      }

      return null

    } finally {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
      }
      loading.value = false
    }
  }

  /**
   * Refresh data (bypass cache)
   */
  async function refresh(): Promise<T | null> {
    return await execute(true)
  }

  /**
   * Clear data and error state
   */
  function clear() {
    data.value = null
    error.value = ''
    lastFetch.value = null

    if (cacheKey) {
      cache.delete(cacheKey)
    }
  }

  /**
   * Reset to initial state
   */
  function reset() {
    clear()
    loading.value = false
  }

  // Auto-load if requested
  if (autoLoad) {
    execute()
  }

  return {
    // State
    data,
    loading,
    error,
    lastFetch,

    // Computed
    hasData,
    hasError,
    isStale,

    // Methods
    execute,
    refresh,
    clear,
    reset
  }
}

/**
 * Utility for paginated API requests
 */
export function usePaginatedApiRequest<T = any>(
  requestFn: (page: number, limit: number) => Promise<{ data: T[]; total: number; page: number; limit: number }>,
  options: ApiRequestOptions & { initialPage?: number; pageSize?: number } = {}
) {
  const {
    initialPage = 1,
    pageSize = 20,
    ...apiOptions
  } = options

  const currentPage = ref(initialPage)
  const total = ref(0)
  const items = ref<T[]>([])

  const paginatedRequestFn = () => requestFn(currentPage.value, pageSize)

  const { loading, error, execute: executeBase, ...rest } = useApiRequest(
    paginatedRequestFn,
    {
      ...apiOptions,
      transform: (response) => {
        total.value = response.total
        items.value = response.data
        return response
      }
    }
  )

  const totalPages = computed(() => Math.ceil(total.value / pageSize))
  const hasNextPage = computed(() => currentPage.value < totalPages.value)
  const hasPrevPage = computed(() => currentPage.value > 1)

  async function goToPage(page: number) {
    if (page < 1 || page > totalPages.value) return
    currentPage.value = page
    return await executeBase()
  }

  async function nextPage() {
    if (hasNextPage.value) {
      return await goToPage(currentPage.value + 1)
    }
  }

  async function prevPage() {
    if (hasPrevPage.value) {
      return await goToPage(currentPage.value - 1)
    }
  }

  return {
    // Pagination state
    currentPage,
    total,
    totalPages,
    items,
    hasNextPage,
    hasPrevPage,

    // Base API state
    loading,
    error,

    // Methods
    goToPage,
    nextPage,
    prevPage,
    execute: executeBase,
    ...rest
  }
}

/**
 * Clear all cached data
 */
export function clearApiCache() {
  cache.clear()
}

/**
 * Clear specific cache entry
 */
export function clearCacheEntry(key: string) {
  cache.delete(key)
}