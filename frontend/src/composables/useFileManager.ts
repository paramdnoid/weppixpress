import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { debounce } from 'lodash-es'
import { useFileStore } from '@/stores/files'
import type { FileItem } from '@/types'
import type { SortDirection } from '@/types/files'

interface FileTypeConfig {
  extensions: string[]
  icon?: string
  icons?: Record<string, string>
  color?: string
  colors?: Record<string, string>
}

interface FolderPattern {
  pattern: RegExp
  icon: string
  color: string
}

interface FileOperationOptions {
  onProgress?: (progress: number) => void
  onSuccess?: (result: any) => void
  onError?: (error: Error) => void
}

const FILE_TYPES: Record<string, FileTypeConfig> = {
  CODE: {
    extensions: ['js', 'ts', 'jsx', 'tsx', 'php', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'kt'],
    icon: 'bxs:file-js',
    colors: {
      js: 'yellow', ts: 'indigo', jsx: 'yellow', tsx: 'indigo', php: 'indigo',
      py: 'blue', java: 'red', c: 'text-primary', cpp: 'blue', cs: 'purple',
      go: 'cyan', rs: 'orange', kt: 'purple'
    }
  },
  WEB: {
    extensions: ['html', 'htm', 'css', 'scss', 'sass', 'less'],
    icons: {
      html: 'bxs:file-html', htm: 'bxs:file-html', css: 'bxs:file-css',
      scss: 'bxs:file-css', sass: 'bxs:file-css', less: 'bxs:file-css'
    },
    colors: {
      html: 'pink', htm: 'pink', css: 'cyan', scss: 'cyan', sass: 'cyan', less: 'cyan'
    }
  },
  IMAGES: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'tif', 'avif'],
    icon: 'bxs:file-image', color: 'rose'
  },
  VECTOR: { extensions: ['svg'], icon: 'bxs:file-image', color: 'purple' },
  DOCUMENTS: {
    extensions: ['pdf', 'doc', 'docx', 'odt', 'rtf'],
    icons: { pdf: 'bxs:file-pdf', doc: 'bxs:file-doc', docx: 'bxs:file-doc', odt: 'bxs:file-doc', rtf: 'bxs:file-doc' },
    colors: { pdf: 'red', doc: 'blue', docx: 'blue', odt: 'blue', rtf: 'blue' }
  },
  SPREADSHEETS: {
    extensions: ['xls', 'xlsx', 'ods', 'csv'],
    icons: { xls: 'bxs:file-xls', xlsx: 'bxs:file-xls', ods: 'bxs:file-xls', csv: 'bxs:file-csv' },
    colors: { xls: 'green', xlsx: 'green', ods: 'green', csv: 'teal' }
  },
  PRESENTATIONS: {
    extensions: ['ppt', 'pptx', 'odp'],
    icons: { ppt: 'bxs:file-ppt', pptx: 'bxs:file-ppt', odp: 'bxs:file-ppt' },
    color: 'orange'
  },
  AUDIO: { extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'], icon: 'bxs:file-music', color: 'purple' },
  VIDEO: { extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v'], icon: 'bxs:file-video', color: 'purple' },
  ARCHIVES: { extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'], icon: 'bxs:file-archive', color: 'dark' },
  DATA: {
    extensions: ['json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg'],
    icons: { json: 'bxs:file-json', xml: 'bxs:file-xml', yaml: 'bxs:file-doc', yml: 'bxs:file-doc', toml: 'bxs:file-doc', ini: 'bxs:file-doc', cfg: 'bxs:file-doc' },
    colors: { json: 'teal', xml: 'orange', yaml: 'text-primary', yml: 'text-primary', toml: 'text-primary', ini: 'text-primary', cfg: 'text-primary' }
  },
  TEXT: {
    extensions: ['txt', 'md', 'readme', 'log'],
    icons: { txt: 'bxs:file-txt', md: 'bxs:file-md', readme: 'bxs:file-txt', log: 'bxs:file-txt' },
    color: 'text-primary'
  }
}

const FOLDER_PATTERNS: FolderPattern[] = []

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'size', label: 'Size' },
  { key: 'modified', label: 'Modified' },
  { key: 'extension', label: 'Extension' },
  { key: 'type', label: 'Type' }
]

const VIEW_MODES = [
  { key: 'grid', label: 'Grid', icon: 'bx:grid-alt' },
  { key: 'list', label: 'List', icon: 'bx:list-ul' }
]

const MIN_SIDEBAR_WIDTH = 200
const DEFAULT_SIDEBAR_WIDTH = 250

export function useFileManager() {
  const fileStore = useFileStore()
  
  // State
  const viewMode = ref('grid')
  const sortKey = ref('name')
  const sortDir = ref<SortDirection>('asc')
  const search = ref('')
  const isLoading = ref(false)
  const isNavigating = ref(false)
  const itemToRename = ref(null)
  
  // Sidebar state
  const sidebarWidth = ref(DEFAULT_SIDEBAR_WIDTH)
  const isCollapsed = ref(false)
  const isDragging = ref(false)
  
  // Upload state
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  
  // File operations state
  const clipboard = ref<{
    operation: 'copy' | 'cut'
    items: FileItem[]
  } | null>(null)
  const operationQueue = ref<Map<string, AbortController>>(new Map())
  
  // Keyboard state
  const pressedKeys = ref(new Set<string>())
  const shortcuts = ref(new Map())

  // Utility functions
  function getExtension(item: FileItem): string {
    if (!item?.name) return ''
    const name = String(item.name)
    const fileName = name.startsWith('.') ? name.slice(1) : name
    const parts = fileName.split('.')
    return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
  }

  function getFileType(extension: string): { type: string; config: FileTypeConfig } | null {
    for (const [typeName, typeConfig] of Object.entries(FILE_TYPES)) {
      if (typeConfig.extensions.includes(extension)) {
        return { type: typeName.toLowerCase(), config: typeConfig }
      }
    }
    return null
  }

  function getFileIcon(item: FileItem): string {
    const folderType = (item.type || '').toLowerCase()
    if (folderType === 'folder' || folderType === 'directory') {
      const name = item.name?.toLowerCase() || ''
      const cleanName = name.startsWith('.') ? name.slice(1) : name
      for (const pattern of FOLDER_PATTERNS) {
        if (pattern.pattern.test(cleanName)) return pattern.icon
      }
      return 'bxs:folder'
    }

    const ext = getExtension(item)
    if (!ext) return 'bxs:file'

    const fileType = getFileType(ext)
    if (fileType) {
      const { config } = fileType
      if (config.icons && config.icons[ext]) return config.icons[ext]
      if (config.icon) return config.icon
    }
    return 'bxs:file'
  }

  function getFileColor(item: FileItem): string {
    const folderType = (item.type || '').toLowerCase()
    if (folderType === 'folder' || folderType === 'directory') {
      const name = item.name?.toLowerCase() || ''
      const cleanName = name.startsWith('.') ? name.slice(1) : name
      for (const pattern of FOLDER_PATTERNS) {
        if (pattern.pattern.test(cleanName)) return pattern.color
      }
      return 'folder'
    }

    const ext = getExtension(item)
    if (!ext) return 'file'

    const fileType = getFileType(ext)
    if (fileType) {
      const { config } = fileType
      if (config.colors && config.colors[ext]) return config.colors[ext]
      if (config.color) return config.color
    }
    return 'file'
  }

  function getFileComparator(sortKey = '', sortDir: SortDirection = 'asc'): (a: FileItem, b: FileItem) => number {
    const multiplier = sortDir === 'asc' ? 1 : -1
    
    return function compare(a: FileItem, b: FileItem) {
      const isAFolder = String(a.type || '').toLowerCase() === 'folder' || String(a.type || '').toLowerCase() === 'directory'
      const isBFolder = String(b.type || '').toLowerCase() === 'folder' || String(b.type || '').toLowerCase() === 'directory'
      if (isAFolder !== isBFolder) return isAFolder ? -1 : 1

      switch (sortKey) {
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

      const nameA = (a.name || '').toLowerCase()
      const nameB = (b.name || '').toLowerCase()
      return nameA.localeCompare(nameB, undefined, { numeric: true }) * multiplier
    }
  }

  function getDateFormatted(dateStr: string | null, options: Intl.DateTimeFormatOptions = {}): string {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
      const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } as const
      const formatOptions = { ...defaultOptions, ...options }
      return new Intl.DateTimeFormat(undefined, formatOptions).format(date)
    } catch (error) {
      console.warn('Date formatting error:', error)
      return ''
    }
  }

  function getFileSize(bytes: number): string {
    if (typeof bytes !== 'number' || bytes < 0) return ''
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    const formatted = unitIndex === 0 ? size.toString() : size.toFixed(size < 10 ? 1 : 0)
    return `${formatted} ${units[unitIndex]}`
  }

  // File type checkers
  const isImageFile = (item: FileItem) => [...FILE_TYPES.IMAGES.extensions, ...FILE_TYPES.VECTOR.extensions].includes(getExtension(item))
  const isVideoFile = (item: FileItem) => FILE_TYPES.VIDEO.extensions.includes(getExtension(item))
  const isAudioFile = (item: FileItem) => FILE_TYPES.AUDIO.extensions.includes(getExtension(item))
  const isCodeFile = (item: FileItem) => FILE_TYPES.CODE.extensions.includes(getExtension(item)) || FILE_TYPES.WEB.extensions.includes(getExtension(item))

  // Computed properties
  const breadcrumbs = computed(() => fileStore.breadcrumbs)
  const filteredItems = computed(() => {
    return fileStore.currentItems.map(item => ({
      ...item,
      icon: getFileIcon(item),
      iconClass: getFileColor(item)
    }))
  })
  const emptyStateMessage = computed(() => search.value ? 'No files match your search' : 'This folder is empty')
  const hasClipboard = computed(() => clipboard.value !== null)
  const clipboardInfo = computed(() => {
    if (!clipboard.value) return null
    return {
      operation: clipboard.value.operation,
      count: clipboard.value.items.length,
      totalSize: clipboard.value.items.reduce((sum, item) => sum + (item.size || 0), 0)
    }
  })

  // Navigation functions
  async function navigate(item: any) {
    if (!item || (!item.path && !item.isClickable) || isNavigating.value) return
    
    const path = item.path || item
    if (fileStore.state.currentPath === path) return
    
    isNavigating.value = true
    isLoading.value = true
    
    try {
      if (item.type === 'folder' || item.isClickable || item.path) {
        await fileStore.fetchItems(path)
      }
    } catch (error) {
      console.error('Navigation failed:', error)
    } finally {
      isLoading.value = false
      isNavigating.value = false
    }
  }


  function handleItemClick(item: any, event: MouseEvent) {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey
    const isShift = event.shiftKey
    if (isCtrlOrCmd) {
      fileStore.selectItem(item, 'toggle')
    } else if (isShift && fileStore.selectedItems.length > 0) {
      fileStore.selectItem(item, 'range')
    } else {
      fileStore.clearSelection()
      fileStore.selectItem(item)
    }
    // Handle toggling the node in the tree view and setting it as selected
    if (item.type === 'folder') {
      const treeRoot = document.getElementById('menu')
      if (treeRoot) {
        treeRoot.dispatchEvent(new CustomEvent('tree:openPath', { detail: { path: item.path } }))
        treeRoot.dispatchEvent(new CustomEvent('tree:selectNode', { detail: { path: item.path } }))
      }
    }
  }

  function handleContextMenu(item: any, event: MouseEvent) {
    event.preventDefault()
  }

  // File operations
  const copy = (items: FileItem[]) => {
    clipboard.value = { operation: 'copy', items: [...items] }
  }

  const cut = (items: FileItem[]) => {
    clipboard.value = { operation: 'cut', items: [...items] }
  }

  const paste = async (destination: string, options?: FileOperationOptions) => {
    if (!clipboard.value) return

    const { operation, items } = clipboard.value
    const operationId = crypto.randomUUID()
    const abortController = new AbortController()
    
    operationQueue.value.set(operationId, abortController)

    try {
      if (operation === 'copy') {
        console.log('Copying files', items, 'to', destination)
      } else {
        console.log('Moving files', items, 'to', destination)
        clipboard.value = null
      }
      options?.onSuccess?.({ operation, items, destination })
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        options?.onError?.(error)
      }
    } finally {
      operationQueue.value.delete(operationId)
    }
  }

  // Upload handling
  function handleFileInput(event: Event): File[] {
    const input = event.target as HTMLInputElement
    return input.files ? Array.from(input.files) : []
  }

  async function handleFileUpload(event: Event) {
    const files = handleFileInput(event)
    if (files.length > 0) {
      try {
        isUploading.value = true
        await fileStore.uploadFiles(files)
      } catch (error) {
        console.error('Upload failed:', error)
      } finally {
        isUploading.value = false
      }
    }
  }

  // Search and sorting
  const debouncedSearch = debounce((query: string) => {
    search.value = query
  }, 300)

  function handleSearch(query: string) {
    debouncedSearch(query)
  }

  function handleSort(key: string) {
    if (sortKey.value === key) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortKey.value = key
      sortDir.value = 'asc'
    }
  }

  function setViewMode(mode: string) {
    viewMode.value = mode
    fileStore.clearSelection()
  }

  // Sidebar resize
  function startDragging(event: MouseEvent) {
    isDragging.value = true
    document.addEventListener('mousemove', handleDrag)
    document.addEventListener('mouseup', stopDragging)
    event.preventDefault()
  }

  function handleDrag(event: MouseEvent) {
    if (!isDragging.value) return
    const newWidth = Math.max(MIN_SIDEBAR_WIDTH, event.clientX)
    sidebarWidth.value = newWidth
  }

  function stopDragging() {
    isDragging.value = false
    document.removeEventListener('mousemove', handleDrag)
    document.removeEventListener('mouseup', stopDragging)
  }

  function toggleSidebar() {
    isCollapsed.value = !isCollapsed.value
  }

  // Keyboard shortcuts
  function registerShortcut(keys: string, callback: Function) {
    shortcuts.value.set(keys, callback)
  }

  function handleKeyDown(event: KeyboardEvent) {
    pressedKeys.value.add(event.key)
    
    // Handle common shortcuts
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault()
      fileStore.selectAll()
    }
    if (event.key === 'Delete') {
      event.preventDefault()
      deleteSelectedFiles()
    }
    if (event.key === 'Escape') {
      fileStore.clearSelection()
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    pressedKeys.value.delete(event.key)
  }

  // Delete operations
  async function deleteSelectedFiles() {
    const selectedItems = fileStore.selectedItems
    const count = selectedItems.length
    if (!count) return

    if (!confirm(`Are you sure you want to delete ${count} selected file${count > 1 ? 's' : ''}?`)) return

    try {
      await fileStore.deleteItems(selectedItems)
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  async function deleteItem(item: FileItem) {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return
    try {
      await fileStore.deleteItems([item])
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  // Utilities
  function getItemKey(item: any) {
    return item.id || item.name
  }

  // Lifecycle
  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('keyup', handleKeyUp)
    document.removeEventListener('mousemove', handleDrag)
    document.removeEventListener('mouseup', stopDragging)
  })

  return {
    // State
    fileStore,
    viewMode, sortKey, sortDir, search, isLoading, isNavigating, itemToRename,
    sidebarWidth, isCollapsed, isDragging,
    isUploading, uploadProgress,
    clipboard, hasClipboard, clipboardInfo,
    
    // Computed
    breadcrumbs, filteredItems, emptyStateMessage,
    
    // Navigation
    navigate, handleItemClick, handleContextMenu,
    
    // File operations
    copy, cut, paste, deleteItem, deleteSelectedFiles,
    
    // Upload
    handleFileUpload,
    
    // Search & Sort
    handleSearch, handleSort, setViewMode,
    
    // Sidebar
    startDragging, toggleSidebar,
    
    // Utilities
    getItemKey, getFileIcon, getFileColor, getFileComparator, 
    getDateFormatted, getFileSize, getExtension,
    isImageFile, isVideoFile, isAudioFile, isCodeFile,
    
    // Constants
    SORT_OPTIONS, VIEW_MODES, FILE_TYPES: Object.freeze(FILE_TYPES),
    MIN_SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH
  }
}