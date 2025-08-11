import { computed, ComputedRef } from 'vue'
import { useFiles } from '@/composables/useFiles'

const { getFileComparator } = useFiles()

export interface SortableItem {
  name: string
  type?: string
  size?: number
  updated?: string
  [key: string]: any
}

export interface SortOptions {
  items: ComputedRef<SortableItem[]> | SortableItem[]
  sortKey: string
  sortDir: string
}

export function useTableSort({ items, sortKey, sortDir }: SortOptions) {
  const sortedItems = computed(() => {
    const itemsArray = Array.isArray(items) ? items : items.value
    if (!itemsArray?.length) return []
    return [...itemsArray].sort(getFileComparator(sortKey, sortDir))
  })

  return {
    sortedItems
  }
}