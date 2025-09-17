/**
 * Shared Loading State Composable
 * Provides consistent loading state management across components
 */

import { ref, computed } from 'vue'

export interface LoadingOptions {
  delay?: number // Delay before showing loading state (prevents flickering)
  timeout?: number // Auto-hide loading after timeout
  minDuration?: number // Minimum duration to show loading (prevents flickering)
}

/**
 * Single loading state composable
 */
export function useLoadingState(options: LoadingOptions = {}) {
  const { delay = 0, timeout, minDuration = 300 } = options

  const isLoading = ref(false)
  const startTime = ref<number | null>(null)

  let delayTimer: NodeJS.Timeout | null = null
  let timeoutTimer: NodeJS.Timeout | null = null
  let minDurationTimer: NodeJS.Timeout | null = null

  /**
   * Start loading state
   */
  function start() {
    // Clear any existing timers
    clearTimers()

    startTime.value = Date.now()

    if (delay > 0) {
      delayTimer = setTimeout(() => {
        isLoading.value = true

        // Set timeout if specified
        if (timeout) {
          timeoutTimer = setTimeout(() => {
            stop()
          }, timeout)
        }
      }, delay)
    } else {
      isLoading.value = true

      // Set timeout if specified
      if (timeout) {
        timeoutTimer = setTimeout(() => {
          stop()
        }, timeout)
      }
    }
  }

  /**
   * Stop loading state
   */
  function stop() {
    const elapsed = startTime.value ? Date.now() - startTime.value : 0

    const stopLoading = () => {
      isLoading.value = false
      startTime.value = null
      clearTimers()
    }

    // Ensure minimum duration is met
    if (minDuration > 0 && elapsed < minDuration) {
      minDurationTimer = setTimeout(stopLoading, minDuration - elapsed)
    } else {
      stopLoading()
    }
  }

  /**
   * Toggle loading state
   */
  function toggle() {
    if (isLoading.value) {
      stop()
    } else {
      start()
    }
  }

  /**
   * Clear all timers
   */
  function clearTimers() {
    if (delayTimer) {
      clearTimeout(delayTimer)
      delayTimer = null
    }
    if (timeoutTimer) {
      clearTimeout(timeoutTimer)
      timeoutTimer = null
    }
    if (minDurationTimer) {
      clearTimeout(minDurationTimer)
      minDurationTimer = null
    }
  }

  /**
   * Reset to initial state
   */
  function reset() {
    clearTimers()
    isLoading.value = false
    startTime.value = null
  }

  // Cleanup on unmount
  const cleanup = () => {
    clearTimers()
  }

  return {
    isLoading,
    start,
    stop,
    toggle,
    reset,
    cleanup
  }
}

/**
 * Multiple loading states manager
 */
export function useMultipleLoadingStates() {
  const loadingStates = ref<Record<string, boolean>>({})

  const hasAnyLoading = computed(() => {
    return Object.values(loadingStates.value).some(loading => loading)
  })

  const loadingCount = computed(() => {
    return Object.values(loadingStates.value).filter(loading => loading).length
  })

  /**
   * Set loading state for a specific key
   */
  function setLoading(key: string, loading: boolean) {
    loadingStates.value[key] = loading
  }

  /**
   * Get loading state for a specific key
   */
  function isLoading(key: string): boolean {
    return loadingStates.value[key] || false
  }

  /**
   * Start loading for a specific key
   */
  function startLoading(key: string) {
    setLoading(key, true)
  }

  /**
   * Stop loading for a specific key
   */
  function stopLoading(key: string) {
    setLoading(key, false)
  }

  /**
   * Clear all loading states
   */
  function clearAll() {
    loadingStates.value = {}
  }

  /**
   * Execute function with loading state
   */
  async function withLoading<T>(key: string, fn: () => Promise<T>): Promise<T> {
    startLoading(key)
    try {
      return await fn()
    } finally {
      stopLoading(key)
    }
  }

  return {
    loadingStates,
    hasAnyLoading,
    loadingCount,
    setLoading,
    isLoading,
    startLoading,
    stopLoading,
    clearAll,
    withLoading
  }
}

/**
 * Loading state for async operations
 */
export function useAsyncLoading<T = any>(
  asyncFn: (...args: any[]) => Promise<T>,
  options: LoadingOptions = {}
) {
  const { isLoading, start, stop, reset } = useLoadingState(options)
  const error = ref<string | null>(null)
  const data = ref<T | null>(null)

  /**
   * Execute the async function with loading state
   */
  async function execute(...args: any[]): Promise<T | null> {
    error.value = null
    start()

    try {
      const result = await asyncFn(...args)
      data.value = result
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      return null
    } finally {
      stop()
    }
  }

  /**
   * Clear error and data
   */
  function clear() {
    error.value = null
    data.value = null
    reset()
  }

  return {
    isLoading,
    error,
    data,
    execute,
    clear,
    reset
  }
}

/**
 * Global loading state for app-wide loading indicators
 */
class GlobalLoadingState {
  private loadingStates = new Map<string, boolean>()
  private listeners = new Set<(loading: boolean) => void>()

  get isLoading(): boolean {
    return Array.from(this.loadingStates.values()).some(loading => loading)
  }

  setLoading(key: string, loading: boolean) {
    const wasLoading = this.isLoading
    this.loadingStates.set(key, loading)

    const nowLoading = this.isLoading
    if (wasLoading !== nowLoading) {
      this.notifyListeners(nowLoading)
    }
  }

  subscribe(callback: (loading: boolean) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(loading: boolean) {
    this.listeners.forEach(callback => callback(loading))
  }
}

export const globalLoadingState = new GlobalLoadingState()

/**
 * Hook into global loading state
 */
export function useGlobalLoading() {
  const isLoading = ref(globalLoadingState.isLoading)

  // Subscribe to changes
  const unsubscribe = globalLoadingState.subscribe((loading) => {
    isLoading.value = loading
  })

  /**
   * Set global loading state
   */
  function setGlobalLoading(key: string, loading: boolean) {
    globalLoadingState.setLoading(key, loading)
  }

  /**
   * Execute function with global loading
   */
  async function withGlobalLoading<T>(key: string, fn: () => Promise<T>): Promise<T> {
    setGlobalLoading(key, true)
    try {
      return await fn()
    } finally {
      setGlobalLoading(key, false)
    }
  }

  return {
    isLoading,
    setGlobalLoading,
    withGlobalLoading,
    cleanup: unsubscribe
  }
}