import { ref, nextTick, Ref, computed } from 'vue'

export interface GridNavigationOptions {
  itemWidth?: number
  onSelect?: (index: number, event: KeyboardEvent) => void
  onActivate?: (index: number) => void
}

export function useGridNavigation(options: GridNavigationOptions = {}) {
  const { itemWidth = 140, onSelect, onActivate } = options
  const focusedIndex = ref(0)

  async function handleKeyNavigation(event: KeyboardEvent) {
    const currentElement = event.target as HTMLElement
    const currentIndex = parseInt(currentElement.dataset.index || '0')
    const gridContainer = event.currentTarget as HTMLElement
    const gridItems = Array.from(gridContainer.children).filter(el => 
      el.classList.contains('explorer-item')
    ) as HTMLElement[]
    
    if (gridItems.length === 0) return
    
    let nextIndex = currentIndex
    const itemsPerRow = Math.floor(gridContainer.offsetWidth / itemWidth)
    
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = Math.min(currentIndex + 1, gridItems.length - 1)
        break
      case 'ArrowLeft':
        nextIndex = Math.max(currentIndex - 1, 0)
        break
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + itemsPerRow, gridItems.length - 1)
        break
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - itemsPerRow, 0)
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = gridItems.length - 1
        break
      case 'PageDown':
        nextIndex = Math.min(currentIndex + (itemsPerRow * 3), gridItems.length - 1)
        break
      case 'PageUp':
        nextIndex = Math.max(currentIndex - (itemsPerRow * 3), 0)
        break
      case 'Enter':
        onActivate?.(currentIndex)
        return
      case ' ':
        event.preventDefault()
        onSelect?.(currentIndex, event)
        return
      default:
        return
    }
    
    if (nextIndex !== currentIndex) {
      event.preventDefault()
      await updateFocus(gridItems, nextIndex)
    }
  }

  async function updateFocus(gridItems: HTMLElement[], newIndex: number) {
    // Update tabindex
    gridItems.forEach((item, idx) => {
      item.tabIndex = idx === newIndex ? 0 : -1
    })
    
    // Focus new item
    await nextTick()
    gridItems[newIndex]?.focus()
    focusedIndex.value = newIndex
  }

  function calculateItemsPerRow(containerWidth: number): number {
    return Math.floor(containerWidth / itemWidth)
  }

  function setFocusedIndex(index: number) {
    focusedIndex.value = Math.max(0, index)
  }

  return {
    focusedIndex,
    handleKeyNavigation,
    updateFocus,
    calculateItemsPerRow,
    setFocusedIndex
  }
}