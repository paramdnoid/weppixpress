import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

export interface VirtualScrollOptions {
  itemHeight: number | ((item: any, index: number) => number)
  containerHeight: number
  overscan?: number
  tolerance?: number
  throttleMs?: number
  buffer?: number
}

export interface VirtualScrollResult<T> {
  visibleItems: Ref<Array<{ item: T; index: number; offsetY: number; height: number }>>
  totalHeight: Ref<number>
  containerRef: Ref<HTMLElement | null>
  onScroll: (event: Event) => void
  scrollToIndex: (index: number) => void
  scrollToTop: () => void
  isScrolling: Ref<boolean>
  startIndex: Ref<number>
  endIndex: Ref<number>
  getStats: () => {
    totalItems: number
    visibleCount: number
    renderCount: number
    scrollTop: number
  }
}

/**
 * Advanced Virtual Scrolling Composable with dynamic heights and performance optimizations
 */
export function useVirtualScroll<T>(
  items: Ref<T[]>, 
  options: VirtualScrollOptions
): VirtualScrollResult<T> {
  const { 
    itemHeight, 
    containerHeight, 
    overscan = 5, 
    tolerance = 5,
    throttleMs = 16,
    buffer = 200 
  } = options

  // State
  const scrollTop = ref(0)
  const isScrolling = ref(false)
  const containerRef = ref<HTMLElement | null>(null)
  const scrollTimeout = ref<number | null>(null)

  // Cache for item heights when using dynamic heights
  const itemHeights = new Map<number, number>()
  const itemOffsets = new Map<number, number>()

  // Get item height (static or dynamic)
  const getItemHeight = (item: T, index: number): number => {
    if (typeof itemHeight === 'function') {
      if (!itemHeights.has(index)) {
        const height = itemHeight(item, index)
        itemHeights.set(index, height)
      }
      return itemHeights.get(index)!
    }
    return itemHeight
  }

  // Calculate total height with caching
  const totalHeight = computed(() => {
    let height = 0
    const itemsValue = items.value
    
    if (typeof itemHeight === 'number') {
      height = itemsValue.length * itemHeight
    } else {
      // Dynamic heights - calculate with caching
      for (let i = 0; i < itemsValue.length; i++) {
        height += getItemHeight(itemsValue[i], i)
      }
    }
    
    return height + buffer
  })

  // Calculate item offset with caching
  const getItemOffset = (index: number): number => {
    if (itemOffsets.has(index)) {
      return itemOffsets.get(index)!
    }

    let offset = 0
    const itemsValue = items.value

    if (typeof itemHeight === 'number') {
      offset = index * itemHeight
    } else {
      // Dynamic heights
      for (let i = 0; i < index; i++) {
        if (i < itemsValue.length) {
          offset += getItemHeight(itemsValue[i], i)
        }
      }
    }

    itemOffsets.set(index, offset)
    return offset
  }

  // Find start index using binary search for better performance
  const findStartIndex = (scrollTop: number): number => {
    const itemsValue = items.value
    if (itemsValue.length === 0) return 0

    if (typeof itemHeight === 'number') {
      return Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    }

    // Binary search for dynamic heights
    let left = 0
    let right = itemsValue.length - 1
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2)
      const midOffset = getItemOffset(mid)
      
      if (midOffset < scrollTop) {
        left = mid + 1
      } else {
        right = mid
      }
    }

    return Math.max(0, left - overscan)
  }

  // Calculate visible range
  const startIndex = computed(() => findStartIndex(scrollTop.value))

  const endIndex = computed(() => {
    const itemsValue = items.value
    const start = startIndex.value
    let end = start
    let height = 0
    
    // Find end index by accumulating heights until container is filled
    while (end < itemsValue.length && height < containerHeight + tolerance) {
      if (end < itemsValue.length) {
        height += getItemHeight(itemsValue[end], end)
      }
      end++
    }

    return Math.min(itemsValue.length - 1, end + overscan)
  })

  // Visible items with position information
  const visibleItems = computed(() => {
    const itemsValue = items.value
    const start = startIndex.value
    const end = endIndex.value
    const result: Array<{ item: T; index: number; offsetY: number; height: number }> = []

    for (let i = start; i <= end && i < itemsValue.length; i++) {
      const item = itemsValue[i]
      const height = getItemHeight(item, i)
      const offsetY = getItemOffset(i)
      
      result.push({
        item,
        index: i,
        offsetY,
        height
      })
    }

    return result
  })

  // Throttled scroll handler
  let lastScrollTime = 0
  const onScroll = (event: Event) => {
    const now = Date.now()
    if (now - lastScrollTime < throttleMs) {
      return
    }
    lastScrollTime = now

    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
    isScrolling.value = true

    // Clear existing timeout
    if (scrollTimeout.value) {
      clearTimeout(scrollTimeout.value)
    }

    // Set scrolling to false after scroll ends
    scrollTimeout.value = window.setTimeout(() => {
      isScrolling.value = false
      scrollTimeout.value = null
    }, 150)
  }

  // Utility functions
  const scrollToIndex = (index: number) => {
    if (!containerRef.value) return

    const offset = getItemOffset(index)
    containerRef.value.scrollTop = offset
  }

  const scrollToTop = () => {
    if (!containerRef.value) return
    containerRef.value.scrollTop = 0
  }

  const getStats = () => ({
    totalItems: items.value.length,
    visibleCount: endIndex.value - startIndex.value + 1,
    renderCount: visibleItems.value.length,
    scrollTop: scrollTop.value
  })

  // Cleanup on unmount
  onUnmounted(() => {
    if (scrollTimeout.value) {
      clearTimeout(scrollTimeout.value)
    }
    itemHeights.clear()
    itemOffsets.clear()
  })

  return {
    visibleItems,
    totalHeight,
    containerRef,
    onScroll,
    scrollToIndex,
    scrollToTop,
    isScrolling,
    startIndex,
    endIndex,
    getStats
  }
}