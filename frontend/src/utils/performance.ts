/**
 * Performance Optimization Utilities
 * Best practices: Debouncing, throttling, memoization, lazy loading
 */

// Debounce function with type safety
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    const callNow = immediate && !timeoutId

    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      timeoutId = null
      if (!immediate) func(...args)
    }, delay)

    if (callNow) func(...args)
  }
}

// Throttle function with type safety
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastExecTime = 0
  let lastArgs: Parameters<T> | null = null

  return (...args: Parameters<T>) => {
    const now = Date.now()
    lastArgs = args

    const execute = () => {
      lastExecTime = Date.now()
      func(...args)
    }

    const timeSinceLastExec = now - lastExecTime

    if (leading && timeSinceLastExec >= delay) {
      execute()
    } else if (trailing) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        if (lastArgs) {
          execute()
        }
        timeoutId = null
      }, delay - timeSinceLastExec)
    }
  }
}

// Memoization with LRU cache
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  maxSize: number = 100,
  keyGenerator?: (...args: Parameters<T>) => string
): T & { clear: () => void; size: () => number } {
  const cache = new Map<string, ReturnType<T>>()

  const getKey = keyGenerator || ((...args: Parameters<T>) => JSON.stringify(args))

  const memoized = (...args: Parameters<T>): ReturnType<T> => {
    const key = getKey(...args)

    if (cache.has(key)) {
      // Move to end (LRU)
      const value = cache.get(key)!
      cache.delete(key)
      cache.set(key, value)
      return value
    }

    // Remove oldest if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }

    const result = func(...args)
    cache.set(key, result)
    return result
  }

  memoized.clear = () => cache.clear()
  memoized.size = () => cache.size

  return memoized as T & { clear: () => void; size: () => number }
}

// Performance timing utilities
export class PerformanceTimer {
  private markers = new Map<string, number>()

  mark(label: string) {
    this.markers.set(label, performance.now())
  }

  measure(startLabel: string, endLabel?: string): number {
    const startTime = this.markers.get(startLabel)
    if (startTime === undefined) {
      throw new Error(`Start marker "${startLabel}" not found`)
    }

    const endTime = endLabel
      ? this.markers.get(endLabel)
      : performance.now()

    if (endTime === undefined) {
      throw new Error(`End marker "${endLabel}" not found`)
    }

    return endTime - startTime
  }

  clear(label?: string) {
    if (label) {
      this.markers.delete(label)
    } else {
      this.markers.clear()
    }
  }
}

export const timer = new PerformanceTimer()

// Auto-cleanup utilities for better memory management
export function createAutoCleanup() {
  const cleanupTasks: (() => void)[] = []

  const add = (task: () => void) => {
    cleanupTasks.push(task)
  }

  const cleanup = () => {
    cleanupTasks.forEach(task => {
      try {
        task()
      } catch (error) {
        console.error('Cleanup task failed:', error)
      }
    })
    cleanupTasks.length = 0
  }

  return { add, cleanup }
}