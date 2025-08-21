import { ref, nextTick } from 'vue'

export function useInfiniteScroll(
  loadMore: () => Promise<boolean>, // returns true if more data available
  options: {
    threshold?: number
    disabled?: () => boolean
  } = {}
) {
  const isLoading = ref(false)
  const hasMore = ref(true)
  const { threshold = 100, disabled } = options

  const onScroll = async (event: Event) => {
    if (disabled?.() || isLoading.value || !hasMore.value) return

    const target = event.target as HTMLElement
    const { scrollTop, scrollHeight, clientHeight } = target

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      isLoading.value = true
      
      try {
        const moreAvailable = await loadMore()
        hasMore.value = moreAvailable
      } catch (error) {
        console.error('Error loading more items:', error)
      } finally {
        isLoading.value = false
      }
    }
  }

  const reset = () => {
    isLoading.value = false
    hasMore.value = true
  }

  return {
    isLoading,
    hasMore,
    onScroll,
    reset
  }
}