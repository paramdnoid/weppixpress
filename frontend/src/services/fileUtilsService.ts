/**
 * Centralized File Utilities Service
 * Consolidates all file-related operations and utilities
 */

import { fileCache } from './cacheService'
import { getFileIconMeta } from '../composables/useFileIcons'
import type { FileItem } from '../types/files'

// ===== FOLDER PATTERNS =====
interface FolderPattern {
  pattern: RegExp
  icon: string
  color: string
}

const FOLDER_PATTERNS: FolderPattern[] = [
  { pattern: /^\.git$/i, icon: 'bxl:git', color: 'orange' },
  { pattern: /^node_modules$/i, icon: 'bxl:nodejs', color: 'success' },
  { pattern: /^\.vscode$/i, icon: 'bxl:visual-studio', color: 'info' },
  { pattern: /^dist|build$/i, icon: 'bx:package', color: 'warning' },
  { pattern: /^src|source$/i, icon: 'bx:code-alt', color: 'primary' },
  { pattern: /^docs?|documentation$/i, icon: 'bx:book-alt', color: 'info' },
  { pattern: /^test|tests|spec$/i, icon: 'bx:test-tube', color: 'warning' },
  { pattern: /^assets?|resources?$/i, icon: 'bx:image-alt', color: 'success' },
  { pattern: /^config|conf$/i, icon: 'bx:cog', color: 'secondary' }
]

// Pre-compute sets for O(1) file type checking based on common extensions
const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'tif', 'avif', 'heic', 'heif', 'svg'])
const videoExtensions = new Set(['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'])
const audioExtensions = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'])
const codeExtensions = new Set(['js', 'ts', 'jsx', 'tsx', 'vue', 'php', 'py', 'jav', 'c', 'cpp', 'cs', 'go', 'rs', 'kt', 'rb', 'swift', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'styl'])
const archiveExtensions = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'])
const documentExtensions = new Set(['pdf', 'doc', 'docx', 'odt', 'rtf', 'pages'])
const textExtensions = new Set(['txt', 'md', 'mdx', 'log', 'cfg', 'conf', 'ini', 'toml', 'yaml', 'yml', 'json', 'xml'])
const spreadsheetExtensions = new Set(['xls', 'xlsx', 'ods', 'csv', 'numbers'])
const presentationExtensions = new Set(['ppt', 'pptx', 'odp', 'key'])

/**
 * File Utilities Service Class
 */
export class FileUtilsService {
  // ===== FILE EXTENSION UTILITIES =====
  
  /**
   * Extract file extension from filename
   */
  static getExtension(item: FileItem): string {
    if (item.type === 'folder') return ''
    
    const name = item.name || ''
    const parts = name.split('.')
    
    if (parts.length < 2) return ''
    if (parts.length === 2 && parts[0] === '') return '' // Hidden files like .gitignore
    
    return parts.pop()?.toLowerCase() || ''
  }


  // ===== ICON AND COLOR UTILITIES =====

  /**
   * Get file icon with caching
   */
  static getFileIcon(item: FileItem): string {
    const cacheKey = `${item.type}:${item.name}`
    const cached = fileCache.getIcon(cacheKey)
    if (cached) return cached

    let icon: string

    // Handle folders
    const folderType = (item.type || '').toLowerCase()
    if (folderType === 'folder' || folderType === 'directory') {
      // Check for special folder patterns
      const folderPattern = FOLDER_PATTERNS.find(p => p.pattern.test(item.name || ''))
      icon = folderPattern?.icon || 'bxs:folder'
      
      fileCache.setIcon(cacheKey, icon)
      return icon
    }

    // Handle files - use the new useFileIcons composable
    const { icon: fileIcon } = getFileIconMeta({ name: item.name })
    icon = fileIcon

    fileCache.setIcon(cacheKey, icon)
    return icon
  }

  /**
   * Get file color with caching
   */
  static getFileColor(item: FileItem): string {
    const cacheKey = `${item.type}:${item.name}`
    const cached = fileCache.getColor(cacheKey)
    if (cached) return cached

    let color: string

    // Handle folders
    const folderType = (item.type || '').toLowerCase()
    if (folderType === 'folder' || folderType === 'directory') {
      // Check for special folder patterns
      const folderPattern = FOLDER_PATTERNS.find(p => p.pattern.test(item.name || ''))
      color = folderPattern?.color || 'yellow'
      
      fileCache.setColor(cacheKey, color)
      return color
    }

    // Handle files - use the new useFileIcons composable  
    const { class: colorClass } = getFileIconMeta({ name: item.name })
    // Convert Bootstrap color classes to simple color names
    color = colorClass.replace('text-', '') || 'primary'

    fileCache.setColor(cacheKey, color)
    return color
  }

  // ===== FORMATTING UTILITIES =====

  /**
   * Format file size with caching
   */
  static getFileSize(bytes: number): string {
    if (typeof bytes !== 'number' || bytes < 0 || !Number.isFinite(bytes)) return ''
    
    const cached = fileCache.getSize(bytes)
    if (cached) return cached

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
    fileCache.setSize(bytes, result)
    return result
  }

  /**
   * Format date with smart relative formatting and caching
   */
  static getDateFormatted(dateValue: string | Date, options?: Intl.DateTimeFormatOptions): string {
    if (!dateValue) return ''

    const cacheKey = `${dateValue}${options ? JSON.stringify(options) : ''}`
    const cached = fileCache.getDate(cacheKey)
    if (cached !== undefined) return cached

    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
      
      if (!date || isNaN(date.getTime())) {
        const result = ''
        fileCache.setDate(cacheKey, result)
        return result
      }

      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      let result: string

      if (diffDays === 0) {
        // Today - show relative time
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        
        if (diffMinutes < 1) {
          result = 'Just now'
        } else if (diffMinutes < 60) {
          result = `${diffMinutes} min ago`
        } else if (diffHours < 24) {
          result = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
        } else {
          result = 'Today'
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
      
      fileCache.setDate(cacheKey, result)
      return result
    } catch (error) {
      console.warn('Date formatting error:', error)
      const result = ''
      fileCache.setDate(cacheKey, result)
      return result
    }
  }

  // ===== FILE TYPE CHECKERS =====
  
  static isImageFile(item: FileItem): boolean {
    return imageExtensions.has(FileUtilsService.getExtension(item))
  }

  static isVideoFile(item: FileItem): boolean {
    return videoExtensions.has(FileUtilsService.getExtension(item))
  }

  static isAudioFile(item: FileItem): boolean {
    return audioExtensions.has(FileUtilsService.getExtension(item))
  }

  static isCodeFile(item: FileItem): boolean {
    return codeExtensions.has(FileUtilsService.getExtension(item))
  }

  static isArchiveFile(item: FileItem): boolean {
    return archiveExtensions.has(FileUtilsService.getExtension(item))
  }

  static isDocumentFile(item: FileItem): boolean {
    return documentExtensions.has(FileUtilsService.getExtension(item))
  }

  static isTextFile(item: FileItem): boolean {
    return textExtensions.has(FileUtilsService.getExtension(item))
  }

  static isSpreadsheetFile(item: FileItem): boolean {
    return spreadsheetExtensions.has(FileUtilsService.getExtension(item))
  }

  static isPresentationFile(item: FileItem): boolean {
    return presentationExtensions.has(FileUtilsService.getExtension(item))
  }

  // ===== SORTING UTILITIES =====

  /**
   * Get file comparator function for sorting
   */
  static getFileComparator(key: 'name' | 'size' | 'modified' | 'extension' | 'type' = 'name', 
                          dir: 'asc' | 'desc' = 'asc') {
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
            const extA = FileUtilsService.getExtension(a)
            const extB = FileUtilsService.getExtension(b)
            const extComparison = extA.localeCompare(extB)
            if (extComparison !== 0) return extComparison * multiplier
          }
          break
        case 'type':
          if (a.type === 'file' && b.type === 'file') {
            // Simple type comparison based on extension groups
            const extA = FileUtilsService.getExtension(a)
            const extB = FileUtilsService.getExtension(b)
            const getTypeGroup = (ext: string) => {
              if (imageExtensions.has(ext)) return 'image'
              if (videoExtensions.has(ext)) return 'video'
              if (audioExtensions.has(ext)) return 'audio'
              if (codeExtensions.has(ext)) return 'code'
              if (archiveExtensions.has(ext)) return 'archive'
              if (documentExtensions.has(ext)) return 'document'
              return 'other'
            }
            const typeA = getTypeGroup(extA)
            const typeB = getTypeGroup(extB)
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

  // ===== UTILITY FUNCTIONS =====

  /**
   * Get unique key for file items (for v-for loops)
   */
  static getItemKey(item: FileItem): string {
    return item.path || item.name || ''
  }

  /**
   * Check if file can be previewed
   */
  static canPreview(item: FileItem): boolean {
    return FileUtilsService.isImageFile(item) || FileUtilsService.isVideoFile(item) || FileUtilsService.isAudioFile(item) || FileUtilsService.isTextFile(item)
  }

  /**
   * Get download URL for file
   */
  static getDownloadUrl(item: FileItem): string {
    if (!item.path) return '#'
    return `/api/files/download?path=${encodeURIComponent(item.path)}`
  }

  /**
   * Get preview URL for file (if supported)
   */
  static getPreviewUrl(item: FileItem): string | null {
    if (!FileUtilsService.canPreview(item) || !item.path) return null
    return `/api/files/preview?path=${encodeURIComponent(item.path)}`
  }

  // ===== CONSTANTS EXPORT =====
  
  static readonly FOLDER_PATTERNS = Object.freeze(FOLDER_PATTERNS)
}

// Export default instance for convenience
export const fileUtils = FileUtilsService