/**
 * Optimized List Rendering Composable
 * Best practices: Virtual scrolling, pagination, search, filtering
 */

import { ref, computed, watch, nextTick, type Ref } from 'vue'
import { debounce } from '@/utils/performance'
import { logger } from '@/utils/logger'

export interface UseOptimizedListOptions<T> {
  // Pagination
  pageSize?: number
  initialPage?: number

  // Virtual scrolling
  itemHeight?: number | ((item: T, index: number) => number)
  containerHeight?: number
  overscan?: number

  // Search and filtering
  searchFields?: (keyof T)[]
  defaultFilters?: Partial<T>

  // Performance
  debounceSearch?: number
  enableVirtualScrolling?: boolean
}

export interface ListState<T> {
  items: T[]
  filteredItems: T[]
  visibleItems: T[]
  currentPage: number
  totalPages: number
  isLoading: boolean
  searchQuery: string
  filters: Partial<T>
  sortField: keyof T | null
  sortOrder: 'asc' | 'desc'
}

export function useOptimizedList<T extends Record<string, any>>(
  data: Ref<T[]>,
  options: UseOptimizedListOptions<T> = {}
) {
  const {
    pageSize = 50,
    initialPage = 1,
    itemHeight = 60,
    containerHeight = 400,
    overscan = 5,
    searchFields = [],
    defaultFilters = {},
    debounceSearch = 300,
    enableVirtualScrolling = false
  } = options

  // State
  const currentPage = ref(initialPage)
  const searchQuery = ref('')
  const filters = ref<Partial<T>>({ ...defaultFilters })
  const sortField = ref<keyof T | null>(null)
  const sortOrder = ref<'asc' | 'desc'>('asc')
  const isLoading = ref(false)
  const scrollTop = ref(0)

  // Computed properties
  const filteredItems = computed(() => {
    let result = [...data.value]

    // Apply search
    if (searchQuery.value && searchFields.length > 0) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(item =>
        searchFields.some(field =>
          String(item[field]).toLowerCase().includes(query)
        )
      )
    }

    // Apply filters
    Object.entries(filters.value).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        result = result.filter(item => {
          if (Array.isArray(value)) {
            return value.includes(item[key])
          }
          return item[key] === value
        })
      }
    })

    // Apply sorting
    if (sortField.value) {
      result.sort((a, b) => {
        const aVal = a[sortField.value!]
        const bVal = b[sortField.value!]

        let comparison = 0

        if (aVal < bVal) comparison = -1
        else if (aVal > bVal) comparison = 1

        return sortOrder.value === 'desc' ? -comparison : comparison
      })
    }

    return result
  })

  const totalPages = computed(() =>
    Math.ceil(filteredItems.value.length / pageSize)
  )

  // Virtual scrolling calculations
  const virtualScrollData = computed(() => {
    if (!enableVirtualScrolling) {
      return { startIndex: 0, endIndex: filteredItems.value.length - 1 }
    }

    const itemHeightValue = typeof itemHeight === 'number' ? itemHeight : 60
    const startIndex = Math.max(0, Math.floor(scrollTop.value / itemHeightValue) - overscan)
    const visibleCount = Math.ceil(containerHeight / itemHeightValue)
    const endIndex = Math.min(
      filteredItems.value.length - 1,
      startIndex + visibleCount + overscan * 2
    )

    return { startIndex, endIndex }
  })

  // Visible items (paginated or virtual scrolled)
  const visibleItems = computed(() => {
    if (enableVirtualScrolling) {
      const { startIndex, endIndex } = virtualScrollData.value
      return filteredItems.value.slice(startIndex, endIndex + 1)
    }

    // Pagination
    const start = (currentPage.value - 1) * pageSize
    const end = start + pageSize
    return filteredItems.value.slice(start, end)
  })

  // Debounced search
  const debouncedSearch = debounce((query: string) => {
    searchQuery.value = query
    currentPage.value = 1 // Reset to first page on search
  }, debounceSearch)

  // Methods
  const setSearchQuery = (query: string) => {
    debouncedSearch(query)
  }

  const setFilter = <K extends keyof T>(key: K, value: T[K] | undefined) => {
    filters.value = { ...filters.value, [key]: value }
    currentPage.value = 1 // Reset to first page on filter
  }

  const removeFilter = (key: keyof T) => {
    const newFilters = { ...filters.value }
    delete newFilters[key]
    filters.value = newFilters
    currentPage.value = 1
  }

  const clearFilters = () => {
    filters.value = { ...defaultFilters }
    searchQuery.value = ''
    currentPage.value = 1
  }

  const setSorting = (field: keyof T, order?: 'asc' | 'desc') => {
    if (sortField.value === field && !order) {
      // Toggle order if same field
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortOrder.value = order || 'asc'
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
    }
  }

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }

  const refresh = async () => {
    isLoading.value = true
    try {
      // Trigger reactivity
      await nextTick()
      logger.debug('List refreshed')
    } finally {
      isLoading.value = false
    }
  }

  // Virtual scrolling helpers
  const getItemOffset = (index: number): number => {
    if (typeof itemHeight === 'number') {
      return index * itemHeight
    }

    let offset = 0
    for (let i = 0; i < index; i++) {
      offset += typeof itemHeight === 'function'
        ? itemHeight(filteredItems.value[i], i)
        : 60
    }
    return offset
  }

  const getTotalHeight = (): number => {
    if (typeof itemHeight === 'number') {
      return filteredItems.value.length * itemHeight
    }

    return filteredItems.value.reduce((total, item, index) =>
      total + (typeof itemHeight === 'function' ? itemHeight(item, index) : 60), 0
    )
  }

  const onScroll = (event: Event) => {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
  }

  // Watch for data changes
  watch(data, () => {
    // Reset pagination when data changes
    currentPage.value = 1
  })

  // State object
  const state = computed<ListState<T>>(() => ({
    items: data.value,
    filteredItems: filteredItems.value,
    visibleItems: visibleItems.value,
    currentPage: currentPage.value,
    totalPages: totalPages.value,
    isLoading: isLoading.value,
    searchQuery: searchQuery.value,
    filters: filters.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value
  }))

  return {
    // State
    state,

    // Computed
    filteredItems,
    visibleItems,
    totalPages,
    virtualScrollData,

    // Methods
    setSearchQuery,
    setFilter,
    removeFilter,
    clearFilters,
    setSorting,
    goToPage,
    nextPage,
    prevPage,
    refresh,

    // Virtual scrolling
    getItemOffset,
    getTotalHeight,
    onScroll,

    // Raw refs for direct access
    currentPage,
    searchQuery,
    filters,
    sortField,
    sortOrder,
    isLoading,
    scrollTop
  }
}