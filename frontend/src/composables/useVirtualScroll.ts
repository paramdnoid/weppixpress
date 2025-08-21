import { ref, computed, onMounted, onUnmounted } from 'vue'

interface VirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export function useVirtualScroll<T>(
  items: T[], 
  options: VirtualScrollOptions
) {
  const scrollTop = ref(0)
  const { itemHeight, containerHeight, overscan = 5 } = options

  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const totalHeight = computed(() => items.length * itemHeight)

  const startIndex = computed(() => 
    Math.max(0, Math.floor(scrollTop.value / itemHeight) - overscan)
  )

  const endIndex = computed(() => 
    Math.min(items.length - 1, startIndex.value + visibleCount + overscan * 2)
  )

  const visibleItems = computed(() => 
    items.slice(startIndex.value, endIndex.value + 1)
  )

  const offsetY = computed(() => startIndex.value * itemHeight)

  const onScroll = (event: Event) => {
    scrollTop.value = (event.target as HTMLElement).scrollTop
  }

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll,
    startIndex,
    endIndex
  }
}