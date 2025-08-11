import { computed, ComputedRef } from 'vue'

export interface SelectionOptions {
  selectedItems: Set<string>
  getItemKey: (item: any) => string
}

export interface SelectionEvent {
  item: any
  mode: 'single' | 'toggle' | 'range'
}

export function useGridSelection({ selectedItems, getItemKey }: SelectionOptions) {
  function isSelected(item: any): boolean {
    return selectedItems.has(getItemKey(item))
  }

  function handleSelection(item: any, event: MouseEvent | KeyboardEvent): SelectionEvent {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey
    const isShift = event.shiftKey
    
    if (isCtrlOrCmd) {
      return { item, mode: 'toggle' }
    } else if (isShift) {
      return { item, mode: 'range' }
    } else {
      return { item, mode: 'single' }
    }
  }

  return {
    isSelected,
    handleSelection
  }
}