import { computed, ComputedRef } from 'vue'
import { useTableSort } from './useTableSort'

export interface GridItem {
  raw: any
  icon: string
  iconClass: string
  name: string
}

export interface GridLayoutOptions {
  items: ComputedRef<any[]> | any[]
  sortKey: string
  sortDir: string
  getIcon: (item: any) => string
  getIconClass: (item: any) => string
}

export function useGridLayout({ 
  items, 
  sortKey, 
  sortDir, 
  getIcon, 
  getIconClass 
}: GridLayoutOptions) {
  const { sortedItems } = useTableSort({ items, sortKey, sortDir })

  const displayItems = computed<GridItem[]>(() => {
    return sortedItems.value.map(item => ({
      raw: item,
      icon: getIcon(item),
      iconClass: getIconClass(item),
      name: item.name
    }))
  })

  return {
    sortedItems,
    displayItems
  }
}