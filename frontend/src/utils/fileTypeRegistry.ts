/**
 * Consolidated File Type Registry
 * Single source of truth for all file type definitions, icons, and colors
 */

export interface FileTypeConfig {
  extensions: string[]
  icon: string
  color: string
  category: string
}

/**
 * Master file type registry
 * Replaces scattered definitions in useFileIcons.ts and fileUtilsService.ts
 */
export const FILE_TYPE_REGISTRY: Record<string, FileTypeConfig> = {
  // Documents
  document: {
    extensions: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'pages'],
    icon: 'bi:filetype-doc',
    color: 'primary',
    category: 'document'
  },

  // Text files
  text: {
    extensions: ['txt', 'md', 'mdx', 'log', 'cfg', 'conf', 'ini', 'toml', 'yaml', 'yml', 'json', 'xml', 'markdown'],
    icon: 'bi:filetype-txt',
    color: 'info',
    category: 'text'
  },

  // Spreadsheets
  spreadsheet: {
    extensions: ['xls', 'xlsx', 'ods', 'csv', 'tsv', 'numbers'],
    icon: 'bi:filetype-xlsx',
    color: 'success',
    category: 'spreadsheet'
  },

  // Presentations
  presentation: {
    extensions: ['ppt', 'pptx', 'odp', 'key'],
    icon: 'bi:filetype-ppt',
    color: 'warning',
    category: 'presentation'
  },

  // Images
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'tif', 'avif', 'heic', 'heif', 'svg'],
    icon: 'bx:image-alt',
    color: 'success',
    category: 'media'
  },

  // Videos
  video: {
    extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'],
    icon: 'bx:video',
    color: 'danger',
    category: 'media'
  },

  // Audio
  audio: {
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
    icon: 'bx:music',
    color: 'secondary',
    category: 'media'
  },

  // Code files
  code: {
    extensions: ['js', 'ts', 'jsx', 'tsx', 'vue', 'php', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'kt', 'rb', 'swift', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'styl'],
    icon: 'bx:code-alt',
    color: 'primary',
    category: 'code'
  },

  // Archives
  archive: {
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
    icon: 'bx:archive',
    color: 'dark',
    category: 'archive'
  },

  // Folders
  folder: {
    extensions: [],
    icon: 'bx:folder',
    color: 'warning',
    category: 'folder'
  },

  // Default/unknown
  default: {
    extensions: [],
    icon: 'bx:file',
    color: 'secondary',
    category: 'unknown'
  }
}

/**
 * Extension to file type mapping for O(1) lookups
 */
const extensionToTypeMap = new Map<string, string>()

// Build reverse lookup map
Object.entries(FILE_TYPE_REGISTRY).forEach(([typeName, config]) => {
  config.extensions.forEach(ext => {
    extensionToTypeMap.set(ext.toLowerCase(), typeName)
  })
})

/**
 * Get file type configuration by file extension
 */
export function getFileTypeByExtension(extension: string): FileTypeConfig {
  const normalizedExt = extension.toLowerCase().replace(/^\./, '')
  const typeName = extensionToTypeMap.get(normalizedExt)
  return typeName ? FILE_TYPE_REGISTRY[typeName] : FILE_TYPE_REGISTRY.default
}

/**
 * Get file type configuration by filename
 */
export function getFileTypeByName(filename: string): FileTypeConfig {
  const extension = filename.split('.').pop() || ''
  return getFileTypeByExtension(extension)
}

/**
 * Check if file is of specific type
 */
export function isFileType(filename: string, typeName: keyof typeof FILE_TYPE_REGISTRY): boolean {
  const extension = filename.split('.').pop() || ''
  const normalizedExt = extension.toLowerCase()
  return FILE_TYPE_REGISTRY[typeName].extensions.includes(normalizedExt)
}

/**
 * Get all extensions for a file type
 */
export function getExtensionsForType(typeName: keyof typeof FILE_TYPE_REGISTRY): string[] {
  return FILE_TYPE_REGISTRY[typeName]?.extensions || []
}

/**
 * Legacy compatibility functions for existing code
 */

// For useFileIcons.ts compatibility
export function getFileIcon(item: { name?: string; type?: string }): string {
  if (item.type === 'folder') {
    return FILE_TYPE_REGISTRY.folder.icon
  }
  const config = getFileTypeByName(item.name || '')
  return config.icon
}

export function getFileColor(item: { name?: string; type?: string }): string {
  if (item.type === 'folder') {
    return FILE_TYPE_REGISTRY.folder.color
  }
  const config = getFileTypeByName(item.name || '')
  return config.color
}

// For fileUtilsService.ts compatibility
export const imageExtensions = new Set(FILE_TYPE_REGISTRY.image.extensions)
export const videoExtensions = new Set(FILE_TYPE_REGISTRY.video.extensions)
export const audioExtensions = new Set(FILE_TYPE_REGISTRY.audio.extensions)
export const codeExtensions = new Set(FILE_TYPE_REGISTRY.code.extensions)
export const archiveExtensions = new Set(FILE_TYPE_REGISTRY.archive.extensions)
export const documentExtensions = new Set(FILE_TYPE_REGISTRY.document.extensions)
export const textExtensions = new Set(FILE_TYPE_REGISTRY.text.extensions)
export const spreadsheetExtensions = new Set(FILE_TYPE_REGISTRY.spreadsheet.extensions)
export const presentationExtensions = new Set(FILE_TYPE_REGISTRY.presentation.extensions)

/**
 * Check if extension belongs to category
 */
export function isImageFile(extension: string): boolean {
  return imageExtensions.has(extension.toLowerCase())
}

export function isVideoFile(extension: string): boolean {
  return videoExtensions.has(extension.toLowerCase())
}

export function isAudioFile(extension: string): boolean {
  return audioExtensions.has(extension.toLowerCase())
}

export function isCodeFile(extension: string): boolean {
  return codeExtensions.has(extension.toLowerCase())
}

export function isArchiveFile(extension: string): boolean {
  return archiveExtensions.has(extension.toLowerCase())
}

export function isDocumentFile(extension: string): boolean {
  return documentExtensions.has(extension.toLowerCase())
}

export function isTextFile(extension: string): boolean {
  return textExtensions.has(extension.toLowerCase())
}

export function isSpreadsheetFile(extension: string): boolean {
  return spreadsheetExtensions.has(extension.toLowerCase())
}

export function isPresentationFile(extension: string): boolean {
  return presentationExtensions.has(extension.toLowerCase())
}