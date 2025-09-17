import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFileStore } from '@/stores/files'
import { fileCache } from '@/services/cacheService'
import { FileUtilsService } from '@/services/fileUtilsService'
import type { FileItem, SelectionMode } from '@/types/files'

type ViewMode = 'grid' | 'list'

// ===== CONSTANTS =====
const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'size', label: 'Size' },
  { key: 'modified', label: 'Modified' },
  { key: 'extension', label: 'Type' },
  { key: 'type', label: 'Category' }
] as const

const VIEW_MODES = [
  { key: 'grid', label: 'Grid View', icon: 'bx:grid-alt' },
  { key: 'list', label: 'List View', icon: 'bx:list-ul' }
] as const

const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 600
const DEFAULT_SIDEBAR_WIDTH = 300
const LONG_PRESS_DURATION = 500

/**
 * Consolidated File Manager Composable
 * Handles UI state, interactions, and integrates with FileUtilsService
 */
export function useFileManager() {
  const fileStore = useFileStore()

  // ===== UI STATE =====
  const viewMode = ref<ViewMode>('grid')
  const sidebarWidth = ref(DEFAULT_SIDEBAR_WIDTH)
  const isCollapsed = ref(false)
  const isDragging = ref(false)

  // ===== LONG PRESS STATE =====
  const isLongPressing = ref(false)
  const longPressItem = ref<FileItem | null>(null)
  const longPressTimers = new Map<string, number>()

  // ===== COMPUTED PROPERTIES =====
  const emptyStateMessage = computed(() => {
    if (fileStore.state.error) return 'Error loading files'
    
    const hasSearch = fileStore.state.filters.search.length > 0
    if (hasSearch) return `No files found matching "${fileStore.state.filters.search}"`
    
    return 'This folder is empty'
  })

  // ===== SELECTION HELPERS =====
  function getSelectionMode(event?: MouseEvent): SelectionMode {
    if (!event) return 'single'
    if (event.ctrlKey || event.metaKey) return 'toggle'
    if (event.shiftKey) return 'range'
    return 'single'
  }

  // ===== LONG PRESS HANDLERS =====
  function startLongPress(item: FileItem, event: MouseEvent | TouchEvent): void {
    try {
      const itemKey = FileUtilsService.getItemKey(item)
      
      // Clear any existing timer for this item
      clearLongPress(itemKey)
      
      // Prevent context menu on right click
      if ('button' in event && event.button === 2) {
        return
      }
      
      const timerId = window.setTimeout(() => {
        isLongPressing.value = true
        longPressItem.value = item
        
        // Trigger haptic feedback on supported devices
        if ('vibrate' in navigator) {
          navigator.vibrate(50)
        }
        
        // Select the item with toggle mode
        fileStore.selectItem(item, 'toggle')
        
        // Clean up
        longPressTimers.delete(itemKey)
      }, LONG_PRESS_DURATION)
      
      longPressTimers.set(itemKey, timerId)
    } catch (error) {
      console.error('Error starting long press:', error)
    }
  }
  
  function clearLongPress(itemKey?: string): void {
    if (itemKey) {
      const timerId = longPressTimers.get(itemKey)
      if (timerId) {
        clearTimeout(timerId)
        longPressTimers.delete(itemKey)
      }
    } else {
      // Clear all timers
      longPressTimers.forEach(timerId => clearTimeout(timerId))
      longPressTimers.clear()
    }
    
    isLongPressing.value = false
    longPressItem.value = null
  }
  
  // ===== MOUSE/TOUCH HANDLERS =====
  function handleMouseDown(item: FileItem, event?: MouseEvent): void {
    // Only handle left mouse button
    if (event && event.button === 0) {
      startLongPress(item, event)
    }
  }
  
  function handleMouseUp(item: FileItem, event?: MouseEvent): void {
    const itemKey = FileUtilsService.getItemKey(item)
    const wasLongPressing = longPressTimers.has(itemKey)
    
    clearLongPress(itemKey)
    
    // If it wasn't a long press, handle as normal click
    if (!wasLongPressing && !isLongPressing.value) {
      const mode = getSelectionMode(event)
      fileStore.selectItem(item, mode)
    }
  }
  
  function handleMouseLeave(item: FileItem): void {
    const itemKey = FileUtilsService.getItemKey(item)
    clearLongPress(itemKey)
  }
  
  function handleTouchStart(item: FileItem, event?: TouchEvent): void {
    if (event) {
      startLongPress(item, event)
    }
  }
  
  function handleTouchEnd(item: FileItem): void {
    const itemKey = FileUtilsService.getItemKey(item)
    const wasLongPressing = longPressTimers.has(itemKey)
    
    clearLongPress(itemKey)
    
    // If it wasn't a long press, handle as normal tap
    if (!wasLongPressing && !isLongPressing.value) {
      const syntheticEvent = {
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault: () => {},
        stopPropagation: () => {}
      } as MouseEvent
      
      const mode = getSelectionMode(syntheticEvent)
      fileStore.selectItem(item, mode)
    }
  }
  
  function handleTouchMove(item: FileItem): void {
    // Cancel long press if user starts scrolling
    const itemKey = FileUtilsService.getItemKey(item)
    clearLongPress(itemKey)
  }

  // ===== CONTEXT MENU HANDLER =====
  function handleContextMenu(item: FileItem, event: MouseEvent): void {
    event.preventDefault()

    // Emit a custom event that parent components can listen to
    const contextMenuEvent = new CustomEvent('file-context-menu', {
      detail: { item, event },
      bubbles: true
    })

    if (event.target) {
      (event.target as HTMLElement).dispatchEvent(contextMenuEvent)
    }
  }
  
  // ===== UI INTERACTIONS =====
  function handleItemClick(item: FileItem, event?: MouseEvent): void {
    const mode = getSelectionMode(event)
    fileStore.selectItem(item, mode)
  }

  function handleItemDoubleClick(item: FileItem): void {
    if (item.type === 'folder') {
      fileStore.navigateToPath(item.path)
    } else {
      // Handle file opening - could be extended with file preview
      // For now, just download the file
      const url = FileUtilsService.getDownloadUrl(item)
      if (url !== '#') {
        const link = document.createElement('a')
        link.href = url
        link.download = item.name || 'download'
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }
  }

  // ===== VIEW MODE CONTROLS =====
  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode
    localStorage.setItem('fileManager.viewMode', mode)
  }

  // ===== SIDEBAR CONTROLS =====
  function startDragging(event: MouseEvent): void {
    const startX = event.clientX
    const startWidth = sidebarWidth.value
    isDragging.value = true

    function handleDrag(e: MouseEvent) {
      const deltaX = e.clientX - startX
      const newWidth = startWidth + deltaX
      sidebarWidth.value = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth))
    }

    function stopDragging() {
      isDragging.value = false
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', stopDragging)
      localStorage.setItem('fileManager.sidebarWidth', sidebarWidth.value.toString())
    }

    document.addEventListener('mousemove', handleDrag)
    document.addEventListener('mouseup', stopDragging)
    event.preventDefault()
  }

  function toggleSidebar(): void {
    isCollapsed.value = !isCollapsed.value
    localStorage.setItem('fileManager.sidebarCollapsed', isCollapsed.value.toString())
  }


  // ===== DELETE =====
  function deleteSelectedFiles(): void {
    const selectedItems = fileStore.selectedItems
    if (selectedItems.length === 0) return
    
    const count = selectedItems.length
    const message = count === 1 
      ? `Delete "${selectedItems[0].name}"?`
      : `Delete ${count} items?`
    
    if (confirm(message)) {
      fileStore.deleteItems()
    }
  }

  // ===== LIFECYCLE =====
  onMounted(() => {
    // Load saved preferences
    const savedViewMode = localStorage.getItem('fileManager.viewMode')
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      viewMode.value = savedViewMode
    }
    
    const savedSidebarWidth = localStorage.getItem('fileManager.sidebarWidth')
    if (savedSidebarWidth) {
      const width = parseInt(savedSidebarWidth, 10)
      if (!isNaN(width)) {
        sidebarWidth.value = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width))
      }
    }
    
    const savedSidebarCollapsed = localStorage.getItem('fileManager.sidebarCollapsed')
    if (savedSidebarCollapsed) {
      isCollapsed.value = savedSidebarCollapsed === 'true'
    }
  })
  
  onUnmounted(() => {
    // Clean up any remaining long press timers
    clearLongPress()
    
    // Clean up event listeners if dragging was in progress
    if (isDragging.value) {
      document.removeEventListener('mousemove', () => {})
      document.removeEventListener('mouseup', () => {})
    }
    
    // Clear cache to free memory
    fileCache.clear()
  })

  // ===== PUBLIC API =====
  // Wrapper functions for backwards compatibility
  const getFileIcon = (item: FileItem): string => {
    return FileUtilsService.getFileIcon(item)
  }

  const getFileColor = (item: FileItem): string => {
    return FileUtilsService.getFileColor(item)
  }

  return {
    // Store access
    fileStore,
    
    // UI State
    viewMode,
    sidebarWidth,
    isCollapsed,
    isDragging,
    emptyStateMessage,
    
    // File utilities (delegated to service)
    getExtension: FileUtilsService.getExtension,
    getFileIcon,
    getFileColor,
    getFileSize: FileUtilsService.getFileSize,
    getDateFormatted: FileUtilsService.getDateFormatted,
    getFileComparator: FileUtilsService.getFileComparator,
    
    // File type checkers (delegated to service)
    isImageFile: FileUtilsService.isImageFile,
    isVideoFile: FileUtilsService.isVideoFile,
    isAudioFile: FileUtilsService.isAudioFile,
    isCodeFile: FileUtilsService.isCodeFile,
    isArchiveFile: FileUtilsService.isArchiveFile,
    isDocumentFile: FileUtilsService.isDocumentFile,
    
    // UI Handlers
    handleItemClick,
    handleItemDoubleClick,
    handleContextMenu,
    deleteSelectedFiles,

    // Long Press Handlers
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    isLongPressing,
    longPressItem,
    
    // UI Controls
    setViewMode,
    toggleSidebar,
    startDragging,
    
    // Helper functions
    getItemKey: FileUtilsService.getItemKey,
    
    // Constants
    SORT_OPTIONS,
    VIEW_MODES,
    MIN_SIDEBAR_WIDTH,
    MAX_SIDEBAR_WIDTH,
    DEFAULT_SIDEBAR_WIDTH
  }
}