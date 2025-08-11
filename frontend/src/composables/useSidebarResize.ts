import { ref, onUnmounted } from 'vue'

export interface SidebarResizeOptions {
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
}

export function useSidebarResize(options: SidebarResizeOptions = {}) {
  const { initialWidth = 250, minWidth = 200, maxWidth = 600 } = options
  
  const sidebarWidth = ref(initialWidth)
  const isCollapsed = ref(false)
  
  let isDragging = false
  let dragStartX = 0
  let initialWidthOnDrag = 0

  function startDragging(event: MouseEvent) {
    isDragging = true
    dragStartX = event.clientX
    initialWidthOnDrag = sidebarWidth.value

    document.addEventListener('mousemove', onDrag, { passive: true })
    document.addEventListener('mouseup', stopDragging, { once: true })
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    event.preventDefault()
  }

  function onDrag(event: MouseEvent) {
    if (!isDragging) return

    const deltaX = event.clientX - dragStartX
    const newWidth = initialWidthOnDrag + deltaX
    sidebarWidth.value = Math.max(minWidth, Math.min(maxWidth, newWidth))
  }

  function stopDragging() {
    if (!isDragging) return

    isDragging = false
    document.removeEventListener('mousemove', onDrag)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }

  function toggleSidebar() {
    isCollapsed.value = !isCollapsed.value
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (isDragging) {
      stopDragging()
    }
  })

  return {
    sidebarWidth,
    isCollapsed,
    startDragging,
    toggleSidebar
  }
}