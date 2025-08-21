import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFileStore } from '@/stores/files'
import type { FileItem } from '@/types'

// ===== CONSTANTS =====
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

const FILE_TYPES: Record<string, FileTypeConfig> = {
  CODE: {
    extensions: ['js', 'ts', 'jsx', 'tsx', 'php', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'kt', 'vue'],
    icon: 'bxs:file-js',
    colors: {
      js: 'primary', ts: 'primary', jsx: 'primary', tsx: 'primary', php: 'primary',
      py: 'primary', java: 'primary', c: 'primary', cpp: 'primary', cs: 'primary',
      go: 'primary', rs: 'primary', kt: 'primary', vue: 'primary'
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
    icon: 'bxs:file-image',
    color: 'primary'
  },
  VECTOR: {
    extensions: ['svg'],
    icon: 'bxs:file-image',
    color: 'primary'
  },
  DOCUMENTS: {
    extensions: ['pdf', 'doc', 'docx', 'odt', 'rtf'],
    icons: {
      pdf: 'bxs:file-pdf',
      doc: 'bxs:file-doc',
      docx: 'bxs:file-doc',
      odt: 'bxs:file-doc',
      rtf: 'bxs:file-doc'
    },
    colors: {
      pdf: 'red',
      doc: 'blue',
      docx: 'blue',
      odt: 'blue',
      rtf: 'blue'
    }
  },
  SPREADSHEETS: {
    extensions: ['xls', 'xlsx', 'ods', 'csv'],
    icons: {
      xls: 'bxs:file-xls',
      xlsx: 'bxs:file-xls',
      ods: 'bxs:file-xls',
      csv: 'bxs:file-csv'
    },
    colors: {
      xls: 'green',
      xlsx: 'green',
      ods: 'green',
      csv: 'teal'
    }
  },
  PRESENTATIONS: {
    extensions: ['ppt', 'pptx', 'odp'],
    icons: {
      ppt: 'bxs:file-ppt',
      pptx: 'bxs:file-ppt',
      odp: 'bxs:file-ppt'
    },
    color: 'orange'
  },
  AUDIO: {
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
    icon: 'bxs:file-music',
    color: 'purple'
  },
  VIDEO: {
    extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v'],
    icon: 'bxs:file',
    color: 'primary'
  },
  ARCHIVES: {
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
    icon: 'bxs:file-archive',
    color: 'primary'
  },
  DATA: {
    extensions: ['json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg'],
    icons: {
      json: 'bxs:file-json',
      xml: 'bxs:file-xml',
      yaml: 'bxs:file-doc',
      yml: 'bxs:file-doc',
      toml: 'bxs:file-doc',
      ini: 'bxs:file-doc',
      cfg: 'bxs:file-doc'
    },
    colors: {
      json: 'teal',
      xml: 'orange',
      yaml: 'primary',
      yml: 'primary',
      toml: 'primary',
      ini: 'primary',
      cfg: 'primary'
    }
  },
  TEXT: {
    extensions: ['txt', 'md', 'readme', 'log'],
    icons: {
      txt: 'bxs:file-txt',
      md: 'bxs:file-md',
      readme: 'bxs:file-txt',
      log: 'bxs:file-txt'
    },
    color: 'primary'
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
  const viewMode = ref<'grid' | 'list'>('grid')
  const sidebarWidth = ref(DEFAULT_SIDEBAR_WIDTH)
  const isCollapsed = ref(false)
  const isDragging = ref(false)
  const isUploading = ref(false)
  const uploadProgress = ref(0)

  // ===== COMPUTED =====
  const emptyStateMessage = computed(() => 
    fileStore.state.filters.search 
      ? 'No files match your search' 
      : 'This folder is empty'
  )

  // ===== FILE UTILITIES =====
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
      return 'yellow'
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

  // ===== FORMATTERS =====
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

  function getDateFormatted(dateStr: string | null | undefined, options: Intl.DateTimeFormatOptions = {}): string {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
      
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      // Show relative time for recent files
      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        if (diffHours === 0) {
          const diffMinutes = Math.floor(diffMs / (1000 * 60))
          if (diffMinutes === 0) return 'Just now'
          return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
        }
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      } else if (diffDays === 1) {
        return 'Yesterday'
      } else if (diffDays < 7) {
        return `${diffDays} days ago`
      }
      
      // Default formatting for older files
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }
      const formatOptions = { ...defaultOptions, ...options }
      return new Intl.DateTimeFormat(undefined, formatOptions).format(date)
    } catch (error) {
      console.warn('Date formatting error:', error)
      return ''
    }
  }

  function getFileComparator(key = 'name', dir: 'asc' | 'desc' = 'asc') {
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
  const isImageFile = (item: FileItem) => 
    [...FILE_TYPES.IMAGES.extensions, ...FILE_TYPES.VECTOR.extensions].includes(getExtension(item))
  
  const isVideoFile = (item: FileItem) => 
    FILE_TYPES.VIDEO.extensions.includes(getExtension(item))
  
  const isAudioFile = (item: FileItem) => 
    FILE_TYPES.AUDIO.extensions.includes(getExtension(item))
  
  const isCodeFile = (item: FileItem) => 
    [...FILE_TYPES.CODE.extensions, ...FILE_TYPES.WEB.extensions].includes(getExtension(item))
  
  const isArchiveFile = (item: FileItem) => 
    FILE_TYPES.ARCHIVES.extensions.includes(getExtension(item))
  
  const isDocumentFile = (item: FileItem) => 
    FILE_TYPES.DOCUMENTS.extensions.includes(getExtension(item))

  // ===== UI INTERACTIONS =====
  function handleItemClick(item: FileItem, event: MouseEvent | KeyboardEvent) {
    const mode = getSelectionMode(event)
    fileStore.selectItem(item, mode)
  }

  function handleItemDoubleClick(item: FileItem) {
    if (item.type === 'folder') {
      fileStore.navigateToPath(item.path)
    } else {
      // Open file preview or download
      openFile(item)
    }
  }

  function getSelectionMode(event: MouseEvent | KeyboardEvent): 'single' | 'toggle' | 'range' {
    if (event.shiftKey) return 'range'
    if (event.ctrlKey || event.metaKey) return 'toggle'
    return 'single'
  }

  function openFile(item: FileItem) {
    // TODO: Implement file preview/download
    console.log('Opening file:', item)
    
    if (isImageFile(item)) {
      // Open in image viewer
    } else if (isVideoFile(item)) {
      // Open in video player
    } else if (isCodeFile(item)) {
      // Open in code editor
    } else {
      // Download file
      downloadFile(item)
    }
  }

  function downloadFile(item: FileItem) {
    // TODO: Implement file download
    console.log('Downloading file:', item)
  }

  // ===== VIEW MODE =====
  function setViewMode(mode: 'grid' | 'list') {
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
    const input = event.target as HTMLInputElement
    const files = input.files ? Array.from(input.files) : []
    
    if (files.length === 0) return
    
    isUploading.value = true
    uploadProgress.value = 0
    
    fileStore.uploadFiles(files, {
      onProgress: (progress: number) => {
        uploadProgress.value = progress
      }
    }).finally(() => {
      isUploading.value = false
      uploadProgress.value = 0
      // Reset input
      input.value = ''
    })
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