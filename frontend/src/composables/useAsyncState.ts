/**
 * Advanced Async State Management Composable
 * Best practices: Proper loading states, error handling, cancellation, retry logic
 */

import { ref, computed, onScopeDispose, type Ref } from 'vue'
import { logger } from '@/utils/logger'

export interface UseAsyncStateOptions<T> {
  immediate?: boolean
  initialData?: T
  resetOnExecute?: boolean
  shallow?: boolean
  delay?: number
  timeout?: number
  retries?: number
  retryDelay?: number
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  throwOnFailed?: boolean
}

export interface UseAsyncStateReturn<T, P extends any[]> {
  state: Ref<T | undefined>
  isLoading: Ref<boolean>
  isReady: Ref<boolean>
  error: Ref<Error | undefined>
  execute: (...args: P) => Promise<T>
  retry: () => Promise<T>
  cancel: () => void
  clear: () => void
}

export function useAsyncState<T, P extends any[] = []>(
  promise: (...args: P) => Promise<T>,
  options: UseAsyncStateOptions<T> = {}
): UseAsyncStateReturn<T, P> {
  const {
    immediate = true,
    initialData,
    resetOnExecute = true,
    delay = 0,
    timeout = 0,
    retries = 0,
    retryDelay = 1000,
    onSuccess,
    onError,
    throwOnFailed = false
  } = options

  const state = ref<T | undefined>(initialData)
  const isLoading = ref(false)
  const error = ref<Error | undefined>()

  const isReady = computed(() => !isLoading.value && error.value === undefined)

  const currentPromise: Promise<T> | null = null
  let abortController: AbortController | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: P | null = null

  const clear = () => {
    state.value = undefined
    error.value = undefined
    isLoading.value = false
  }

  const cancel = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    isLoading.value = false
  }

  const executeWithRetry = async (fn: () => Promise<T>, retriesLeft: number): Promise<T> => {
    try {
      return await fn()
    } catch (err) {
      if (retriesLeft > 0 && err instanceof Error && err.name !== 'AbortError') {
        logger.warn(`Retrying operation, ${retriesLeft} attempts left`, err)

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay))

        return executeWithRetry(fn, retriesLeft - 1)
      }
      throw err
    }
  }

  const execute = async (...args: P): Promise<T> => {
    // Cancel previous execution
    cancel()

    lastArgs = args

    if (resetOnExecute) {
      clear()
    }

    // Create new abort controller
    abortController = new AbortController()
    const signal = abortController.signal

    isLoading.value = true

    try {
      // Add delay if specified
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))

        // Check if cancelled during delay
        if (signal.aborted) {
          throw new Error('Operation cancelled')
        }
      }

      // Create promise with timeout if specified
      const createPromise = () => {
        let promiseToExecute = promise(...args)

        if (timeout > 0) {
          promiseToExecute = Promise.race([
            promiseToExecute,
            new Promise<never>((_, reject) => {
              timeoutId = setTimeout(
                () => reject(new Error('Operation timed out')),
                timeout
              )
            })
          ])
        }

        return promiseToExecute
      }

      // Execute with retry logic
      const result = await executeWithRetry(createPromise, retries)

      // Check if cancelled after execution
      if (signal.aborted) {
        throw new Error('Operation cancelled')
      }

      state.value = result
      error.value = undefined

      onSuccess?.(result)

      return result

    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err))

      // Don't set error state for cancelled operations
      if (errorInstance.name !== 'AbortError' && errorInstance.message !== 'Operation cancelled') {
        error.value = errorInstance
        onError?.(errorInstance)

        logger.error('Async operation failed', errorInstance)

        if (throwOnFailed) {
          throw errorInstance
        }
      }

      throw errorInstance
    } finally {
      isLoading.value = false

      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }
  }

  const retry = (): Promise<T> => {
    if (!lastArgs) {
      throw new Error('No previous execution to retry')
    }
    return execute(...lastArgs)
  }

  // Auto-execute if immediate
  if (immediate && typeof promise === 'function') {
    execute(...([] as unknown as P))
  }

  // Cleanup on scope dispose
  onScopeDispose(() => {
    cancel()
  })

  return {
    state: state as Ref<T | undefined>,
    isLoading,
    isReady,
    error,
    execute,
    retry,
    cancel,
    clear
  }
}

// Specialized composables built on useAsyncState
export function useAsyncData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseAsyncStateOptions<T> = {}
) {
  const cache = new Map<string, T>()

  const fetchWithCache = async (): Promise<T> => {
    if (cache.has(key) && !options.resetOnExecute) {
      return cache.get(key)!
    }

    const result = await fetcher()
    cache.set(key, result)
    return result
  }

  return useAsyncState(fetchWithCache, options)
}

export function useLazyAsyncData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: Omit<UseAsyncStateOptions<T>, 'immediate'> = {}
) {
  return useAsyncData(key, fetcher, { ...options, immediate: false })
}