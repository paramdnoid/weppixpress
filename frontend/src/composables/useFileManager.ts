import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFileStore } from '@/stores/files'
import type { FileItem, SortDirection, SelectionMode } from '@/types'

// ===== TYPES =====
interface FileTypeConfig {
  extensions: readonly string[]
  icon?: string
  icons?: Readonly<Record<string, string>>
  color?: string
  colors?: Readonly<Record<string, string>>
}

interface FolderPattern {
  pattern: RegExp
  icon: string
  color: string
}

type SortKey = 'name' | 'size' | 'modified' | 'extension' | 'type'
type ViewMode = 'grid' | 'list'

// ===== CONSTANTS =====

const FILE_TYPES: Record<string, FileTypeConfig> = {
  CODE: {
    extensions: ['js', 'ts', 'jsx', 'tsx', 'vue', 'php', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'kt', 'rb', 'swift'],
    icons: {
      js: 'bxs:file-js',
      ts: 'bxs:file-js',
      jsx: 'bxs:file-js',
      tsx: 'bxs:file-js',
      vue: 'bxs:file-js',
      php: 'bxs:file-php',
      py: 'bxs:file-py',
      java: 'bxs:file-java',
      rb: 'bxs:file-rb'
    },
    icon: 'bxs:file-js',
    colors: {
      js: 'yellow', ts: 'blue', jsx: 'cyan', tsx: 'cyan', vue: 'green',
      php: 'purple', py: 'blue', java: 'orange', c: 'primary', cpp: 'primary',
      cs: 'purple', go: 'cyan', rs: 'orange', kt: 'purple', rb: 'red', swift: 'orange'
    }
  },
  WEB: {
    extensions: ['html', 'htm', 'css', 'scss', 'sass', 'less', 'styl'],
    icons: {
      html: 'bxs:file-html',
      htm: 'bxs:file-html',
      css: 'bxs:file-css',
      scss: 'bxs:file-css',
      sass: 'bxs:file-css',
      less: 'bxs:file-css',
      styl: 'bxs:file-css'
    },
    colors: {
      html: 'orange', htm: 'orange', css: 'blue', scss: 'pink', sass: 'pink', less: 'cyan', styl: 'green'
    }
  },
  IMAGES: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'tif', 'avif', 'heic', 'heif'],
    icon: 'bxs:file-image',
    color: 'green'
  },
  VECTOR: {
    extensions: ['svg'],
    icon: 'bxs:file-image',
    color: 'purple'
  },
  DOCUMENTS: {
    extensions: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'pages'],
    icons: {
      pdf: 'bxs:file-pdf',
      doc: 'bxs:file-doc',
      docx: 'bxs:file-doc',
      odt: 'bxs:file-doc',
      rtf: 'bxs:file-doc',
      pages: 'bxs:file-doc'
    },
    colors: {
      pdf: 'red',
      doc: 'blue',
      docx: 'blue',
      odt: 'blue',
      rtf: 'blue',
      pages: 'blue'
    }
  },
  SPREADSHEETS: {
    extensions: ['xls', 'xlsx', 'ods', 'csv', 'numbers'],
    icons: {
      xls: 'bx:table',
      xlsx: 'bx:table',
      ods: 'bx:table',
      csv: 'bx:table',
      numbers: 'bx:table'
    },
    colors: {
      xls: 'green',
      xlsx: 'green',
      ods: 'green',
      csv: 'teal',
      numbers: 'green'
    }
  },
  PRESENTATIONS: {
    extensions: ['ppt', 'pptx', 'odp', 'key'],
    icons: {
      ppt: 'bxs:slideshow',
      pptx: 'bxs:slideshow',
      odp: 'bxs:slideshow',
      key: 'bxs:slideshow'
    },
    colors: {
      ppt: 'orange',
      pptx: 'orange',
      odp: 'orange',
      key: 'orange'
    }
  },
  AUDIO: {
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus'],
    icon: 'bxs:music',
    color: 'purple'
  },
  VIDEO: {
    extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v', 'ogv'],
    icon: 'bxs:videos',
    color: 'red'
  },
  ARCHIVES: {
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'dmg', 'iso'],
    icon: 'bxs:archive',
    color: 'yellow'
  },
  DATA: {
    extensions: ['json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'env'],
    icons: {
      json: 'bxs:data',
      xml: 'bxs:data',
      yaml: 'bxs:data',
      yml: 'bxs:data',
      toml: 'bxs:data',
      ini: 'bxs:data',
      cfg: 'bxs:data',
      env: 'bxs:data'
    },
    colors: {
      json: 'yellow',
      xml: 'orange',
      yaml: 'blue',
      yml: 'blue',
      toml: 'primary',
      ini: 'primary',
      cfg: 'primary',
      env: 'green'
    }
  },
  TEXT: {
    extensions: ['txt', 'md', 'readme', 'log', 'text'],
    icons: {
      txt: 'bxs:file-txt',
      md: 'bxs:edit',
      readme: 'bxs:info-circle',
      log: 'bxs:file-txt',
      text: 'bxs:file-txt'
    },
    colors: {
      txt: 'primary',
      md: 'blue',
      readme: 'green',
      log: 'orange',
      text: 'primary'
    }
  }
}


const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'modified', label: 'Modified' },
  { value: 'extension', label: 'Extension' },
  { value: 'type', label: 'Type' }
]

const VIEW_MODES = [
  { key: 'grid', label: 'Grid', icon: 'bx:grid-alt', title: 'Grid view' },
  { key: 'list', label: 'List', icon: 'bx:list-ul', title: 'List view' }
]

const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 600
const DEFAULT_SIDEBAR_WIDTH = 320

// ===== COMPOSABLE =====
export function useFileManager() {
  const fileStore = useFileStore()

  // ===== UI STATE =====
  const viewMode = ref<ViewMode>('grid')
  const sidebarWidth = ref(DEFAULT_SIDEBAR_WIDTH)
  const isCollapsed = ref(false)
  const isDragging = ref(false)
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  
  // ===== LONG PRESS STATE =====
  const longPressTimers = new Map<string, number>()
  const isLongPressing = ref(false)
  const longPressItem = ref<FileItem | null>(null)
  const LONG_PRESS_DURATION = 500 // milliseconds

  // ===== COMPUTED =====
  const emptyStateMessage = computed(() => 
    fileStore.state.filters.search 
      ? 'No files match your search' 
      : 'This folder is empty'
  )

  // ===== FILE UTILITIES =====
  const extensionCache = new Map<string, string>()
  
  function getExtension(item: FileItem): string {
    if (!item?.name) return ''
    
    const name = String(item.name)
    if (extensionCache.has(name)) {
      return extensionCache.get(name)!
    }
    
    const fileName = name.startsWith('.') ? name.slice(1) : name
    const lastDotIndex = fileName.lastIndexOf('.')
    const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex + 1).toLowerCase() : ''
    
    extensionCache.set(name, extension)
    return extension
  }

  const extensionToTypeMap = new Map<string, { type: string; config: FileTypeConfig }>()
  
  // Build extension lookup map for O(1) access
  Object.entries(FILE_TYPES).forEach(([typeName, typeConfig]) => {
    typeConfig.extensions.forEach(ext => {
      extensionToTypeMap.set(ext, { type: typeName.toLowerCase(), config: typeConfig })
    })
  })
  
  function getFileType(extension: string): { type: string; config: FileTypeConfig } | null {
    return extensionToTypeMap.get(extension) || null
  }

  const iconCache = new Map<string, string>()
  
  function getFileIcon(item: FileItem): string {
    const cacheKey = `${item.type}:${item.name}`
    if (iconCache.has(cacheKey)) {
      return iconCache.get(cacheKey)!
    }
    
    const folderType = (item.type || '').toLowerCase()
    if (folderType === 'folder' || folderType === 'directory') {
      const icon = 'bxs:folder'
      iconCache.set(cacheKey, icon)
      return icon
    }

    const ext = getExtension(item)
    if (!ext) {
      const icon = 'bxs:file'
      iconCache.set(cacheKey, icon)
      return icon
    }

    const fileType = getFileType(ext)
    let icon = 'bxs:file'
    
    if (fileType) {
      const { config } = fileType
      icon = config.icons?.[ext] || config.icon || 'bxs:file'
    }
    
    iconCache.set(cacheKey, icon)
    return icon
  }

  const colorCache = new Map<string, string>()
  
  function getFileColor(item: FileItem): string {
    const cacheKey = `${item.type}:${item.name}`
    if (colorCache.has(cacheKey)) {
      return colorCache.get(cacheKey)!
    }
    
    const folderType = (item.type || '').toLowerCase()
    if (folderType === 'folder' || folderType === 'directory') {
      const color = 'yellow'
      colorCache.set(cacheKey, color)
      return color
    }

    const ext = getExtension(item)
    if (!ext) {
      const color = 'primary'
      colorCache.set(cacheKey, color)
      return color
    }

    const fileType = getFileType(ext)
    let color = 'primary'
    
    if (fileType) {
      const { config } = fileType
      color = config.colors?.[ext] || config.color || 'primary'
    }
    
    colorCache.set(cacheKey, color)
    return color
  }

  // ===== FORMATTERS =====
  const sizeCache = new Map<number, string>()
  
  function getFileSize(bytes: number): string {
    if (typeof bytes !== 'number' || bytes < 0 || !Number.isFinite(bytes)) return ''
    
    if (sizeCache.has(bytes)) {
      return sizeCache.get(bytes)!
    }
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    const formatted = unitIndex === 0 
      ? size.toString() 
      : size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)
    
    const result = `${formatted} ${units[unitIndex]}`
    sizeCache.set(bytes, result)
    return result
  }

  const dateCache = new Map<string, string>()
  
  function getDateFormatted(dateStr: string | null | undefined, options: Intl.DateTimeFormatOptions = {}): string {
    if (!dateStr) return ''
    
    const cacheKey = `${dateStr}:${JSON.stringify(options)}`
    if (dateCache.has(cacheKey)) {
      return dateCache.get(cacheKey)!
    }
    
    try {
      const date = new Date(dateStr)
      if (!Number.isFinite(date.getTime())) {
        dateCache.set(cacheKey, '')
        return ''
      }
      
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      
      // Handle future dates
      if (diffMs < 0) {
        const defaultOptions: Intl.DateTimeFormatOptions = {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }
        const formatOptions = { ...defaultOptions, ...options }
        const result = new Intl.DateTimeFormat(undefined, formatOptions).format(date)
        dateCache.set(cacheKey, result)
        return result
      }
      
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      let result: string
      
      // Show relative time for recent files
      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        if (diffHours === 0) {
          const diffMinutes = Math.floor(diffMs / (1000 * 60))
          if (diffMinutes <= 0) {
            result = 'Just now'
          } else {
            result = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
          }
        } else {
          result = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
        }
      } else if (diffDays === 1) {
        result = 'Yesterday'
      } else if (diffDays < 7) {
        result = `${diffDays} days ago`
      } else {
        // Default formatting for older files
        const defaultOptions: Intl.DateTimeFormatOptions = {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }
        const formatOptions = { ...defaultOptions, ...options }
        result = new Intl.DateTimeFormat(undefined, formatOptions).format(date)
      }
      
      dateCache.set(cacheKey, result)
      return result
    } catch (error) {
      console.warn('Date formatting error:', error)
      const result = ''
      dateCache.set(cacheKey, result)
      return result
    }
  }

  function getFileComparator(key: SortKey = 'name', dir: SortDirection = 'asc') {
    const multiplier = dir === 'asc' ? 1 : -1

    return function compare(a: FileItem, b: FileItem) {
      // Folders always come first
      const isAFolder = a.type === 'folder'
      const isBFolder = b.type === 'folder'
      if (isAFolder !== isBFolder) return isAFolder ? -1 : 1

      switch (key) {
        case 'size':
          if (a.type === 'file' && b.type === 'file') {
            const sizeA = Number(a.size) || 0
            const sizeB = Number(b.size) || 0
            return (sizeA - sizeB) * multiplier
          }
          break
        case 'modified':
          const aTime = a.modified ? new Date(a.modified).getTime() : 0
          const bTime = b.modified ? new Date(b.modified).getTime() : 0
          return (aTime - bTime) * multiplier
        case 'extension':
          if (a.type === 'file' && b.type === 'file') {
            const extA = getExtension(a)
            const extB = getExtension(b)
            const extComparison = extA.localeCompare(extB)
            if (extComparison !== 0) return extComparison * multiplier
          }
          break
        case 'type':
          if (a.type === 'file' && b.type === 'file') {
            const typeA = getFileType(getExtension(a))?.type || 'unknown'
            const typeB = getFileType(getExtension(b))?.type || 'unknown'
            const typeComparison = typeA.localeCompare(typeB)
            if (typeComparison !== 0) return typeComparison * multiplier
          }
          break
      }

      // Default to name comparison
      const nameA = (a.name || '').toLowerCase()
      const nameB = (b.name || '').toLowerCase()
      return nameA.localeCompare(nameB, undefined, { numeric: true }) * multiplier
    }
  }

  // ===== FILE TYPE CHECKERS =====
  // Pre-compute sets for O(1) lookup
  const imageExtensions = new Set([...FILE_TYPES.IMAGES.extensions, ...FILE_TYPES.VECTOR.extensions])
  const videoExtensions = new Set(FILE_TYPES.VIDEO.extensions)
  const audioExtensions = new Set(FILE_TYPES.AUDIO.extensions)
  const codeExtensions = new Set([...FILE_TYPES.CODE.extensions, ...FILE_TYPES.WEB.extensions])
  const archiveExtensions = new Set(FILE_TYPES.ARCHIVES.extensions)
  const documentExtensions = new Set(FILE_TYPES.DOCUMENTS.extensions)
  
  const isImageFile = (item: FileItem): boolean => imageExtensions.has(getExtension(item))
  const isVideoFile = (item: FileItem): boolean => videoExtensions.has(getExtension(item))
  const isAudioFile = (item: FileItem): boolean => audioExtensions.has(getExtension(item))
  const isCodeFile = (item: FileItem): boolean => codeExtensions.has(getExtension(item))
  const isArchiveFile = (item: FileItem): boolean => archiveExtensions.has(getExtension(item))
  const isDocumentFile = (item: FileItem): boolean => documentExtensions.has(getExtension(item))

  // ===== LONG PRESS HANDLERS =====
  function startLongPress(item: FileItem, event: MouseEvent | TouchEvent): void {
    try {
      const itemKey = item.path || item.name
      
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
  
  function handleMouseDown(item: FileItem, event?: MouseEvent): void {
    // Only handle left mouse button
    if (event && event.button === 0) {
      startLongPress(item, event)
    }
  }
  
  function handleMouseUp(item: FileItem, event?: MouseEvent): void {
    const itemKey = item.path || item.name
    const wasLongPressing = longPressTimers.has(itemKey)
    
    clearLongPress(itemKey)
    
    // If it wasn't a long press, handle as normal click
    if (!wasLongPressing && !isLongPressing.value) {
      const mode = getSelectionMode(event)
      fileStore.selectItem(item, mode)
    }
  }
  
  function handleMouseLeave(item: FileItem): void {
    const itemKey = item.path || item.name
    clearLongPress(itemKey)
  }
  
  function handleTouchStart(item: FileItem, event?: TouchEvent): void {
    // Using passive event listener for better scroll performance
    // Note: Cannot preventDefault in passive listeners
    if (event) {
      startLongPress(item, event)
    }
  }
  
  function handleTouchEnd(item: FileItem): void {
    const itemKey = item.path || item.name
    const wasLongPressing = longPressTimers.has(itemKey)
    
    clearLongPress(itemKey)
    
    // If it wasn't a long press, handle as normal tap
    if (!wasLongPressing && !isLongPressing.value) {
      // Create a synthetic mouse event for consistency
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
    const itemKey = item.path || item.name
    clearLongPress(itemKey)
  }
  
  // ===== UI INTERACTIONS =====
  function handleItemClick(item: FileItem, event: MouseEvent | KeyboardEvent) {
    // Handle keyboard events normally
    if (event.type === 'keydown' || event.type === 'keyup') {
      const mode = getSelectionMode(event)
      fileStore.selectItem(item, mode)
      return
    }
    
    // Mouse clicks are now handled by mousedown/mouseup events
    // This prevents double selection when using long press
    if (!isLongPressing.value) {
      const mode = getSelectionMode(event)
      fileStore.selectItem(item, mode)
    }
  }

  function handleItemDoubleClick(item: FileItem) {
    if (item.type === 'folder') {
      fileStore.navigateToPath(item.path)
    } else {
      // Open file preview or download
      openFile(item)
    }
  }

  function getSelectionMode(event?: MouseEvent | KeyboardEvent): SelectionMode {
    if (!event) return 'single'
    if (event.shiftKey) return 'range'
    if (event.ctrlKey || event.metaKey) return 'toggle'
    return 'single'
  }

  function openFile(item: FileItem): void {
    try {
      if (!item?.path) {
        console.error('Cannot open file: invalid file item', item)
        return
      }
      
      console.log('Opening file:', item.name)
      
      if (isImageFile(item)) {
        // TODO: Open in image viewer modal
        console.log('Opening image viewer for:', item.name)
      } else if (isVideoFile(item)) {
        // TODO: Open in video player modal
        console.log('Opening video player for:', item.name)
      } else if (isCodeFile(item)) {
        // TODO: Open in code editor modal
        console.log('Opening code editor for:', item.name)
      } else {
        // Default to download
        downloadFile(item)
      }
    } catch (error) {
      console.error('Error opening file:', error)
      alert('Failed to open file. Please try again.')
    }
  }

  function downloadFile(item: FileItem): void {
    try {
      if (!item?.path) {
        console.error('Cannot download file: invalid file item', item)
        return
      }
      
      // Create a temporary link for download
      const link = document.createElement('a')
      link.href = `/api/files/download?path=${encodeURIComponent(item.path)}`
      link.download = item.name || 'download'
      link.style.display = 'none'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('Download initiated for:', item.name)
    } catch (error) {
      console.error('Error downloading file:', error)
      alert('Failed to download file. Please try again.')
    }
  }

  // ===== VIEW MODE =====
  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
    localStorage.setItem('fileManager.viewMode', mode)
    fileStore.clearSelection()
  }

  // ===== SIDEBAR =====
  function startDragging(event: MouseEvent) {
    isDragging.value = true
    const startX = event.clientX
    const startWidth = sidebarWidth.value

    function handleDrag(e: MouseEvent) {
      if (!isDragging.value) return
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

  function toggleSidebar() {
    isCollapsed.value = !isCollapsed.value
    localStorage.setItem('fileManager.sidebarCollapsed', isCollapsed.value.toString())
  }

  // ===== FILE UPLOAD =====
  function handleFileUpload(event: Event) {
    try {
      const input = event.target as HTMLInputElement
      if (!input || !input.files) {
        console.warn('No files selected or invalid input element')
        return
      }
      
      const files = Array.from(input.files)
      
      if (files.length === 0) {
        console.warn('No files to upload')
        return
      }
      
      isUploading.value = true
      uploadProgress.value = 0
      
      fileStore.uploadFiles(files, {
        onProgress: (progress: number) => {
          uploadProgress.value = Math.max(0, Math.min(100, progress))
        }
      }).catch((error) => {
        console.error('Upload failed:', error)
        alert('Upload failed. Please try again.')
      }).finally(() => {
        isUploading.value = false
        uploadProgress.value = 0
        // Reset input
        try {
          input.value = ''
        } catch (e) {
          console.warn('Could not reset input value:', e)
        }
      })
    } catch (error) {
      console.error('Error handling file upload:', error)
      isUploading.value = false
      uploadProgress.value = 0
    }
  }

  // ===== DELETE =====
  function deleteSelectedFiles() {
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
  })

  // ===== PUBLIC API =====
  return {
    // Store access
    fileStore,
    
    // UI State
    viewMode,
    sidebarWidth,
    isCollapsed,
    isDragging,
    isUploading,
    uploadProgress,
    emptyStateMessage,
    
    // File utilities
    getExtension,
    getFileIcon,
    getFileColor,
    getFileSize,
    getDateFormatted,
    getFileComparator,
    
    // File type checkers
    isImageFile,
    isVideoFile,
    isAudioFile,
    isCodeFile,
    isArchiveFile,
    isDocumentFile,
    
    // UI Handlers
    handleItemClick,
    handleItemDoubleClick,
    handleFileUpload,
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
    
    // Helper to get item key for v-for
    getItemKey: (item: FileItem) => item.path || item.name,
    
    // Constants
    SORT_OPTIONS,
    VIEW_MODES,
    FILE_TYPES: Object.freeze(FILE_TYPES),
    MIN_SIDEBAR_WIDTH,
    MAX_SIDEBAR_WIDTH,
    DEFAULT_SIDEBAR_WIDTH
  }
}