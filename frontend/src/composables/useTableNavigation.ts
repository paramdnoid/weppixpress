import { ref, nextTick, Ref } from 'vue'

export interface TableNavigationOptions {
  onSelect?: (index: number, event: KeyboardEvent) => void
  onActivate?: (index: number) => void
}

export function useTableNavigation(options: TableNavigationOptions = {}) {
  const { onSelect, onActivate } = options
  const focusedRowIndex = ref(0)

  async function handleKeyNavigation(event: KeyboardEvent) {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', 'Space'].includes(event.key)) return
    
    const table = event.currentTarget as HTMLElement
    const rows = Array.from(table.querySelectorAll('.file-row')) as HTMLElement[]
    let nextIndex = focusedRowIndex.value

    switch (event.key) {
      case 'ArrowDown':
        nextIndex = Math.min(focusedRowIndex.value + 1, rows.length - 1)
        break
      case 'ArrowUp':
        nextIndex = Math.max(focusedRowIndex.value - 1, 0)
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = rows.length - 1
        break
      case 'Enter':
        onActivate?.(focusedRowIndex.value)
        return
      case 'Space':
        event.preventDefault()
        onSelect?.(focusedRowIndex.value, event)
        return
    }

    if (nextIndex !== focusedRowIndex.value && rows.length > 0) {
      event.preventDefault()
      await updateFocus(rows, nextIndex)
    }
  }

  async function updateFocus(rows: HTMLElement[], newIndex: number) {
    // Update tabindex
    rows.forEach((row, idx) => {
      row.tabIndex = idx === newIndex ? 0 : -1
    })

    // Focus new row
    await nextTick()
    rows[newIndex]?.focus()
    focusedRowIndex.value = newIndex
  }

  function setFocusedIndex(index: number) {
    focusedRowIndex.value = Math.max(0, index)
  }

  return {
    focusedRowIndex,
    handleKeyNavigation,
    updateFocus,
    setFocusedIndex
  }
}